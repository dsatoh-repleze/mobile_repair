<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StocktakingItem;
use App\Models\StocktakingSession;
use App\Models\Store;
use App\Models\StoreProductStock;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StocktakingController extends Controller
{
    /**
     * 棚卸しセッション一覧
     */
    public function index(Request $request): JsonResponse
    {
        $query = StocktakingSession::with(['store', 'creator', 'completer'])
            ->withCount('items')
            ->orderBy('started_at', 'desc');

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $sessions = $query->paginate(20);

        $sessions->getCollection()->transform(function ($session) {
            return [
                'id' => $session->id,
                'store_id' => $session->store_id,
                'store_name' => $session->store?->name ?? '不明',
                'created_by_name' => $session->creator?->name ?? '不明',
                'completed_by_name' => $session->completer?->name,
                'status' => $session->status,
                'status_label' => $this->getStatusLabel($session->status),
                'notes' => $session->notes,
                'items_count' => $session->items_count,
                'progress' => $session->progress,
                'started_at' => $session->started_at->format('Y-m-d H:i'),
                'completed_at' => $session->completed_at?->format('Y-m-d H:i'),
            ];
        });

        $stores = Store::orderBy('name')->get(['id', 'name']);

        return response()->json([
            'sessions' => $sessions,
            'stores' => $stores,
        ]);
    }

    /**
     * 新しい棚卸しセッションを作成
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'notes' => 'nullable|string|max:1000',
        ]);

        // 同じ店舗で進行中のセッションがないか確認
        $existingSession = StocktakingSession::where('store_id', $request->store_id)
            ->where('status', 'in_progress')
            ->first();

        if ($existingSession) {
            throw ValidationException::withMessages([
                'store_id' => ['この店舗には進行中の棚卸しがあります。'],
            ]);
        }

        $staff = auth()->user();

        DB::beginTransaction();
        try {
            // セッション作成
            $session = StocktakingSession::create([
                'store_id' => $request->store_id,
                'created_by' => $staff->id,
                'status' => 'in_progress',
                'notes' => $request->notes,
                'started_at' => Carbon::now(),
            ]);

            // 店舗の在庫がある商品を棚卸し項目として追加
            $storeStocks = StoreProductStock::where('store_id', $request->store_id)
                ->with('product')
                ->get();

            foreach ($storeStocks as $stock) {
                StocktakingItem::create([
                    'stocktaking_session_id' => $session->id,
                    'product_id' => $stock->product_id,
                    'system_quantity' => $stock->stock_quantity,
                    'is_counted' => false,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => '棚卸しを開始しました。',
                'session' => [
                    'id' => $session->id,
                    'store_name' => $session->store->name,
                    'items_count' => $session->items()->count(),
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * 棚卸しセッション詳細
     */
    public function show(int $id): JsonResponse
    {
        $session = StocktakingSession::with(['store', 'creator', 'completer'])->findOrFail($id);

        $items = StocktakingItem::where('stocktaking_session_id', $id)
            ->with('product')
            ->orderBy('is_counted')
            ->orderBy('product_id')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product?->name ?? '不明',
                    'product_sku' => $item->product?->sku,
                    'product_barcode' => $item->product?->barcode,
                    'system_quantity' => $item->system_quantity,
                    'actual_quantity' => $item->actual_quantity,
                    'difference' => $item->difference,
                    'notes' => $item->notes,
                    'is_counted' => $item->is_counted,
                ];
            });

        return response()->json([
            'session' => [
                'id' => $session->id,
                'store_id' => $session->store_id,
                'store_name' => $session->store?->name ?? '不明',
                'created_by_name' => $session->creator?->name ?? '不明',
                'completed_by_name' => $session->completer?->name,
                'status' => $session->status,
                'status_label' => $this->getStatusLabel($session->status),
                'notes' => $session->notes,
                'progress' => $session->progress,
                'discrepancy_summary' => $session->discrepancy_summary,
                'started_at' => $session->started_at->format('Y-m-d H:i'),
                'completed_at' => $session->completed_at?->format('Y-m-d H:i'),
            ],
            'items' => $items,
        ]);
    }

    /**
     * 棚卸し項目のカウント更新
     */
    public function updateItem(Request $request, int $sessionId, int $itemId): JsonResponse
    {
        $session = StocktakingSession::findOrFail($sessionId);

        if (!$session->isInProgress()) {
            return response()->json([
                'message' => 'この棚卸しは既に完了またはキャンセルされています。',
            ], 400);
        }

        $item = StocktakingItem::where('stocktaking_session_id', $sessionId)
            ->findOrFail($itemId);

        $request->validate([
            'actual_quantity' => 'required|integer|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $item->updateCount($request->actual_quantity, $request->notes);

        return response()->json([
            'message' => 'カウントを更新しました。',
            'item' => [
                'id' => $item->id,
                'actual_quantity' => $item->actual_quantity,
                'difference' => $item->difference,
                'is_counted' => $item->is_counted,
            ],
            'progress' => $session->fresh()->progress,
        ]);
    }

    /**
     * バーコードスキャンで項目を検索
     */
    public function scanBarcode(Request $request, int $sessionId): JsonResponse
    {
        $session = StocktakingSession::findOrFail($sessionId);

        if (!$session->isInProgress()) {
            return response()->json([
                'message' => 'この棚卸しは既に完了またはキャンセルされています。',
            ], 400);
        }

        $request->validate([
            'barcode' => 'required|string',
        ]);

        $product = Product::where('barcode', $request->barcode)->first();

        if (!$product) {
            return response()->json([
                'message' => '商品が見つかりません。',
            ], 404);
        }

        $item = StocktakingItem::where('stocktaking_session_id', $sessionId)
            ->where('product_id', $product->id)
            ->first();

        if (!$item) {
            return response()->json([
                'message' => 'この商品は棚卸し対象に含まれていません。',
            ], 404);
        }

        return response()->json([
            'item' => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $product->name,
                'product_sku' => $product->sku,
                'product_barcode' => $product->barcode,
                'system_quantity' => $item->system_quantity,
                'actual_quantity' => $item->actual_quantity,
                'difference' => $item->difference,
                'notes' => $item->notes,
                'is_counted' => $item->is_counted,
            ],
        ]);
    }

    /**
     * 棚卸し完了（在庫を調整）
     */
    public function complete(Request $request, int $id): JsonResponse
    {
        $session = StocktakingSession::findOrFail($id);

        if (!$session->isInProgress()) {
            return response()->json([
                'message' => 'この棚卸しは既に完了またはキャンセルされています。',
            ], 400);
        }

        $request->validate([
            'apply_adjustments' => 'required|boolean',
        ]);

        $staff = auth()->user();

        DB::beginTransaction();
        try {
            if ($request->apply_adjustments) {
                // カウント済みの項目の在庫を調整
                $items = $session->items()->where('is_counted', true)->get();

                foreach ($items as $item) {
                    $stock = StoreProductStock::where('store_id', $session->store_id)
                        ->where('product_id', $item->product_id)
                        ->first();

                    if ($stock && $item->actual_quantity !== null) {
                        $stock->update(['stock_quantity' => $item->actual_quantity]);
                    }
                }
            }

            $session->update([
                'status' => 'completed',
                'completed_by' => $staff->id,
                'completed_at' => Carbon::now(),
            ]);

            DB::commit();

            $message = $request->apply_adjustments
                ? '棚卸しを完了し、在庫を調整しました。'
                : '棚卸しを完了しました（在庫調整なし）。';

            return response()->json([
                'message' => $message,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * 棚卸しキャンセル
     */
    public function cancel(int $id): JsonResponse
    {
        $session = StocktakingSession::findOrFail($id);

        if (!$session->isInProgress()) {
            return response()->json([
                'message' => 'この棚卸しは既に完了またはキャンセルされています。',
            ], 400);
        }

        $session->update([
            'status' => 'cancelled',
        ]);

        return response()->json([
            'message' => '棚卸しをキャンセルしました。',
        ]);
    }

    private function getStatusLabel(string $status): string
    {
        return match ($status) {
            'in_progress' => '進行中',
            'completed' => '完了',
            'cancelled' => 'キャンセル',
            default => $status,
        };
    }
}
