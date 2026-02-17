<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreProductStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    /**
     * 商品一覧を取得
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query();

        // 検索
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        // カテゴリフィルター
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // アクティブフィルター（店舗指定時のみ）
        $storeId = $request->get('store_id');
        if ($request->has('is_active') && $storeId) {
            $isActive = $request->boolean('is_active');
            $query->whereHas('storeStocks', function ($q) use ($storeId, $isActive) {
                $q->where('store_id', $storeId)->where('is_active', $isActive);
            });
        }

        // EC公開フィルター
        if ($request->has('is_ec_visible')) {
            $query->where('is_ec_visible', $request->boolean('is_ec_visible'));
        }

        // 店舗フィルター（在庫切れ）
        if ($request->boolean('low_stock') && $storeId) {
            $query->whereHas('storeStocks', function ($q) use ($storeId) {
                $q->where('store_id', $storeId)
                    ->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
            });
        }

        // ソート
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $products = $query->paginate($request->get('per_page', 20));

        // 店舗が指定されている場合、その店舗の在庫情報を追加
        if ($storeId) {
            $products->getCollection()->transform(function ($product) use ($storeId) {
                $stock = $product->getStockForStore($storeId);
                $product->stock_quantity = $stock ? $stock->stock_quantity : 0;
                $product->low_stock_threshold = $stock ? $stock->low_stock_threshold : 10;
                $product->is_active = $stock ? $stock->is_active : false;
                return $product;
            });
        } else {
            // 店舗が指定されていない場合は全店舗の在庫合計
            $products->getCollection()->transform(function ($product) {
                $product->stock_quantity = $product->storeStocks->sum('stock_quantity');
                $product->low_stock_threshold = $product->storeStocks->min('low_stock_threshold') ?? 10;
                // 全店舗のうち1つでも有効なら有効とする
                $product->is_active = $product->storeStocks->contains('is_active', true);
                return $product;
            });
        }

        return response()->json($products);
    }

    /**
     * 商品を作成
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'barcode' => 'nullable|string|max:100|unique:products,barcode',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'price' => 'required|integer|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'image' => 'nullable|image|max:5120', // 5MB max
            'is_active' => 'boolean',
            'is_ec_visible' => 'boolean',
        ]);

        // 画像アップロード
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $validated['image_url'] = Storage::url($path);
        }

        // 在庫関連のフィールドを除外
        $isActive = $validated['is_active'] ?? true;
        unset($validated['stock_quantity'], $validated['low_stock_threshold'], $validated['is_active']);

        $product = Product::create($validated);

        // 全店舗に在庫レコードを作成
        $stores = Store::all();
        $stockQuantity = $request->input('stock_quantity', 0);
        $lowStockThreshold = $request->input('low_stock_threshold', 10);

        foreach ($stores as $store) {
            StoreProductStock::create([
                'store_id' => $store->id,
                'product_id' => $product->id,
                'stock_quantity' => $stockQuantity,
                'low_stock_threshold' => $lowStockThreshold,
                'is_active' => $isActive,
            ]);
        }

        return response()->json([
            'message' => '商品を登録しました',
            'product' => $product,
        ], 201);
    }

    /**
     * 商品詳細を取得
     */
    public function show(Product $product): JsonResponse
    {
        $product->load('storeStocks.store');
        return response()->json($product);
    }

    /**
     * 商品を更新
     */
    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'barcode' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('products', 'barcode')->ignore($product->id),
            ],
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'price' => 'sometimes|required|integer|min:0',
            'image' => 'nullable|image|max:5120',
            'is_ec_visible' => 'boolean',
        ]);

        // 画像アップロード
        if ($request->hasFile('image')) {
            // 古い画像を削除
            if ($product->image_url) {
                $oldPath = str_replace('/storage/', '', $product->image_url);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('products', 'public');
            $validated['image_url'] = Storage::url($path);
        }

        $product->update($validated);

        return response()->json([
            'message' => '商品を更新しました',
            'product' => $product->fresh(),
        ]);
    }

    /**
     * 商品を削除
     */
    public function destroy(Product $product): JsonResponse
    {
        // 注文履歴に含まれている場合は削除不可
        if ($product->orderItems()->exists()) {
            return response()->json([
                'message' => 'この商品は注文履歴に含まれているため削除できません。販売を停止する場合は「有効」をオフにしてください。',
            ], 422);
        }

        // 画像を削除
        if ($product->image_url) {
            $path = str_replace('/storage/', '', $product->image_url);
            Storage::disk('public')->delete($path);
        }

        $product->delete();

        return response()->json([
            'message' => '商品を削除しました',
        ]);
    }

    /**
     * カテゴリ一覧を取得
     */
    public function categories(): JsonResponse
    {
        $categories = Product::whereNotNull('category')
            ->distinct()
            ->pluck('category');

        return response()->json($categories);
    }

    /**
     * 店舗一覧を取得
     */
    public function stores(): JsonResponse
    {
        $stores = Store::orderBy('name')->get(['id', 'name']);
        return response()->json(['stores' => $stores]);
    }

    /**
     * 在庫を調整（店舗ごと）
     */
    public function adjustStock(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => 'required|exists:stores,id',
            'adjustment' => 'required|integer',
            'reason' => 'nullable|string|max:255',
        ]);

        $stock = StoreProductStock::firstOrCreate(
            [
                'store_id' => $validated['store_id'],
                'product_id' => $product->id,
            ],
            [
                'stock_quantity' => 0,
                'low_stock_threshold' => 10,
            ]
        );

        $newQuantity = $stock->stock_quantity + $validated['adjustment'];

        if ($newQuantity < 0) {
            return response()->json([
                'message' => '在庫数がマイナスになります',
            ], 422);
        }

        $previousQuantity = $stock->stock_quantity;
        $stock->update(['stock_quantity' => $newQuantity]);

        // TODO: 在庫調整ログを記録

        return response()->json([
            'message' => '在庫を調整しました',
            'stock' => $stock->fresh()->load('store'),
            'previous_quantity' => $previousQuantity,
            'new_quantity' => $newQuantity,
        ]);
    }

    /**
     * 店舗の在庫一覧を取得
     */
    public function storeStocks(Product $product): JsonResponse
    {
        $stocks = $product->storeStocks()->with('store')->get();
        return response()->json(['stocks' => $stocks]);
    }

    /**
     * 店舗の在庫閾値を更新
     */
    public function updateStoreStock(Request $request, Product $product, Store $store): JsonResponse
    {
        $validated = $request->validate([
            'stock_quantity' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $stock = StoreProductStock::firstOrCreate(
            [
                'store_id' => $store->id,
                'product_id' => $product->id,
            ],
            [
                'stock_quantity' => 0,
                'low_stock_threshold' => 10,
                'is_active' => true,
            ]
        );

        $stock->update($validated);

        return response()->json([
            'message' => '在庫情報を更新しました',
            'stock' => $stock->fresh()->load('store'),
        ]);
    }

    /**
     * 店舗の商品ステータスを切り替え
     */
    public function toggleStoreStatus(Request $request, Product $product, Store $store): JsonResponse
    {
        $stock = StoreProductStock::firstOrCreate(
            [
                'store_id' => $store->id,
                'product_id' => $product->id,
            ],
            [
                'stock_quantity' => 0,
                'low_stock_threshold' => 10,
                'is_active' => true,
            ]
        );

        $stock->update(['is_active' => !$stock->is_active]);

        return response()->json([
            'message' => $stock->is_active ? '商品を有効にしました' : '商品を無効にしました',
            'stock' => $stock->fresh()->load('store'),
        ]);
    }

    /**
     * 在庫CSVをエクスポート
     */
    public function exportStockCsv(Request $request): StreamedResponse
    {
        $request->validate([
            'store_id' => 'nullable|exists:stores,id',
            'encoding' => 'nullable|in:utf8,sjis',
        ]);

        $storeId = $request->get('store_id');
        $encoding = $request->get('encoding', 'utf8');

        $filename = $storeId
            ? sprintf('stock_report_store%d_%s.csv', $storeId, date('Ymd'))
            : sprintf('stock_report_all_%s.csv', date('Ymd'));

        return response()->streamDownload(function () use ($storeId, $encoding) {
            $handle = fopen('php://output', 'w');

            // BOM for UTF-8 (Excel対応)
            if ($encoding === 'utf8') {
                fputs($handle, "\xEF\xBB\xBF");
            }

            // ヘッダー行
            $headers = [
                '商品ID',
                '商品名',
                'バーコード',
                'カテゴリ',
                '価格',
                '店舗ID',
                '店舗名',
                '在庫数',
                '在庫閾値',
                '有効',
                '在庫少',
            ];

            if ($encoding === 'sjis') {
                $headers = array_map(fn ($h) => mb_convert_encoding($h, 'SJIS-win', 'UTF-8'), $headers);
            }
            fputcsv($handle, $headers);

            // データ取得
            $query = StoreProductStock::with(['product', 'store']);

            if ($storeId) {
                $query->where('store_id', $storeId);
            }

            $query->orderBy('product_id')
                ->orderBy('store_id')
                ->chunk(100, function ($stocks) use ($handle, $encoding) {
                    foreach ($stocks as $stock) {
                        $row = [
                            $stock->product_id,
                            $stock->product?->name ?? '',
                            $stock->product?->barcode ?? '',
                            $stock->product?->category ?? '',
                            $stock->product?->price ?? 0,
                            $stock->store_id,
                            $stock->store?->name ?? '',
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
}
