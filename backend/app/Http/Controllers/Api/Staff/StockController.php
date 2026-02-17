<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreProductStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockController extends Controller
{
    /**
     * 現在のユーザーと店舗IDを取得（admin/staff両対応）
     */
    private function getCurrentUserAndStore(?Request $request = null): array
    {
        $admin = auth('admin')->user();
        if ($admin) {
            $storeId = $request?->header('X-Store-Id');
            if ($storeId) {
                $store = Store::find($storeId);
            }
            if (!isset($store) || !$store) {
                $store = Store::first();
            }
            return ['user' => $admin, 'store_id' => $store?->id, 'is_admin' => true];
        }

        $staff = auth('staff')->user();
        return ['user' => $staff, 'store_id' => $staff?->store_id, 'is_admin' => false];
    }

    /**
     * 在庫一覧を取得
     */
    public function index(Request $request): JsonResponse
    {
        ['store_id' => $storeId] = $this->getCurrentUserAndStore($request);

        $query = StoreProductStock::with('product')
            ->where('store_id', $storeId);

        // 検索
        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        // カテゴリフィルター
        if ($request->has('category')) {
            $query->whereHas('product', function ($q) use ($request) {
                $q->where('category', $request->category);
            });
        }

        // 低在庫のみ
        if ($request->boolean('low_stock')) {
            $query->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
        }

        // 有効のみ
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $stocks = $query->orderBy('product_id')->paginate($request->get('per_page', 20));

        // Transform to include product details
        $stocks->getCollection()->transform(function ($stock) {
            return [
                'id' => $stock->id,
                'product_id' => $stock->product_id,
                'product_name' => $stock->product?->name,
                'barcode' => $stock->product?->barcode,
                'category' => $stock->product?->category,
                'price' => $stock->product?->price,
                'stock_quantity' => $stock->stock_quantity,
                'low_stock_threshold' => $stock->low_stock_threshold,
                'is_active' => $stock->is_active,
                'is_low_stock' => $stock->isLowStock(),
            ];
        });

        return response()->json($stocks);
    }

    /**
     * カテゴリ一覧を取得
     */
    public function categories(Request $request): JsonResponse
    {
        ['store_id' => $storeId] = $this->getCurrentUserAndStore($request);

        $categories = Product::whereHas('storeStocks', function ($q) use ($storeId) {
            $q->where('store_id', $storeId);
        })
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category');

        return response()->json($categories);
    }

    /**
     * 在庫調整
     */
    public function adjust(Request $request, int $productId): JsonResponse
    {
        $request->validate([
            'adjustment' => 'required|integer',
            'reason' => 'nullable|string|max:255',
        ]);

        ['store_id' => $storeId] = $this->getCurrentUserAndStore($request);

        $stock = StoreProductStock::where('store_id', $storeId)
            ->where('product_id', $productId)
            ->first();

        if (!$stock) {
            return response()->json([
                'message' => '在庫情報が見つかりません',
            ], 404);
        }

        $newQuantity = $stock->stock_quantity + $request->adjustment;

        if ($newQuantity < 0) {
            return response()->json([
                'message' => '在庫数がマイナスになります',
            ], 422);
        }

        $previousQuantity = $stock->stock_quantity;
        $stock->update(['stock_quantity' => $newQuantity]);

        return response()->json([
            'message' => '在庫を調整しました',
            'previous_quantity' => $previousQuantity,
            'new_quantity' => $newQuantity,
            'adjustment' => $request->adjustment,
        ]);
    }

    /**
     * 在庫CSV出力
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $request->validate([
            'encoding' => 'nullable|in:utf8,sjis',
        ]);

        ['store_id' => $storeId] = $this->getCurrentUserAndStore($request);
        $store = Store::find($storeId);

        $encoding = $request->get('encoding', 'utf8');
        $filename = sprintf('stock_%s_%s.csv', $store?->name ?? $storeId, date('Ymd'));

        return response()->streamDownload(function () use ($storeId, $encoding) {
            $handle = fopen('php://output', 'w');

            if ($encoding === 'utf8') {
                fputs($handle, "\xEF\xBB\xBF");
            }

            $headers = [
                '商品ID',
                '商品名',
                'バーコード',
                'カテゴリ',
                '価格',
                '在庫数',
                '在庫閾値',
                '有効',
                '在庫少',
            ];

            if ($encoding === 'sjis') {
                $headers = array_map(fn ($h) => mb_convert_encoding($h, 'SJIS-win', 'UTF-8'), $headers);
            }
            fputcsv($handle, $headers);

            StoreProductStock::with('product')
                ->where('store_id', $storeId)
                ->orderBy('product_id')
                ->chunk(100, function ($stocks) use ($handle, $encoding) {
                    foreach ($stocks as $stock) {
                        $row = [
                            $stock->product_id,
                            $stock->product?->name ?? '',
                            $stock->product?->barcode ?? '',
                            $stock->product?->category ?? '',
                            $stock->product?->price ?? 0,
                            $stock->stock_quantity,
                            $stock->low_stock_threshold,
                            $stock->is_active ? '有効' : '無効',
                            $stock->isLowStock() ? 'はい' : 'いいえ',
                        ];

                        if ($encoding === 'sjis') {
                            $row = array_map(function ($v) {
                                return is_string($v) ? mb_convert_encoding($v, 'SJIS-win', 'UTF-8') : $v;
                            }, $row);
                        }

                        fputcsv($handle, $row);
                    }
                });

            fclose($handle);
        }, $filename, [
            'Content-Type' => $encoding === 'sjis' ? 'text/csv; charset=Shift_JIS' : 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * 在庫サマリーを取得
     */
    public function summary(Request $request): JsonResponse
    {
        ['store_id' => $storeId] = $this->getCurrentUserAndStore($request);

        $stocks = StoreProductStock::where('store_id', $storeId)->get();

        $total = $stocks->count();
        $active = $stocks->where('is_active', true)->count();
        $lowStock = $stocks->filter(fn ($s) => $s->isLowStock() && $s->is_active)->count();
        $outOfStock = $stocks->where('stock_quantity', 0)->where('is_active', true)->count();

        return response()->json([
            'total' => $total,
            'active' => $active,
            'low_stock' => $lowStock,
            'out_of_stock' => $outOfStock,
        ]);
    }
}
