<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreProductStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class POSController extends Controller
{
    /**
     * 現在のユーザーと店舗IDを取得（admin/staff両対応）
     */
    private function getCurrentUserAndStore(?Request $request = null): array
    {
        $admin = auth('admin')->user();
        if ($admin) {
            // adminの場合はヘッダーから店舗IDを取得、なければ最初の店舗
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
     * 店舗一覧を取得
     */
    public function stores(): JsonResponse
    {
        $admin = auth('admin')->user();
        $staff = auth('staff')->user();

        if ($admin) {
            // adminは全店舗を取得可能
            $stores = Store::orderBy('name')->get(['id', 'name', 'address']);
        } else {
            // staffは自分の店舗のみ
            $stores = Store::where('id', $staff->store_id)->get(['id', 'name', 'address']);
        }

        return response()->json([
            'stores' => $stores,
            'is_admin' => $admin !== null,
        ]);
    }

    /**
     * POS用商品一覧を取得
     */
    public function products(Request $request): JsonResponse
    {
        ['store_id' => $storeId] = $this->getCurrentUserAndStore($request);

        $query = Product::activeForStore($storeId);

        // 検索（バーコード or 商品名）
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('barcode', $search);
            });
        }

        // カテゴリフィルター
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        $products = $query->orderBy('name')->get();

        return response()->json([
            'products' => $products->map(function ($p) use ($storeId) {
                $stock = $p->getStockForStore($storeId);
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'barcode' => $p->barcode,
                    'price' => $p->price,
                    'stock_quantity' => $stock ? $stock->stock_quantity : 0,
                    'category' => $p->category,
                    'image_url' => $p->image_url,
                    'is_low_stock' => $stock ? $stock->isLowStock() : true,
                ];
            }),
        ]);
    }

    /**
     * バーコードで商品を検索
     */
    public function scanBarcode(Request $request): JsonResponse
    {
        $request->validate([
            'barcode' => 'required|string',
        ]);

        ['store_id' => $storeId] = $this->getCurrentUserAndStore($request);

        $product = Product::activeForStore($storeId)
            ->where('barcode', $request->barcode)
            ->first();

        if (!$product) {
            return response()->json([
                'message' => '商品が見つかりません',
                'product' => null,
            ], 404);
        }

        $stock = $product->getStockForStore($storeId);

        return response()->json([
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'barcode' => $product->barcode,
                'price' => $product->price,
                'stock_quantity' => $stock ? $stock->stock_quantity : 0,
                'category' => $product->category,
                'image_url' => $product->image_url,
            ],
        ]);
    }

    /**
     * 売上を作成
     */
    public function createSale(Request $request): JsonResponse
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'payment_method' => 'required|in:credit,qr',
            'member_id' => 'nullable|exists:members,id',
            'staff_code' => 'nullable|string|max:100',
            'coupon_code' => 'nullable|string|max:100',
        ]);

        ['user' => $user, 'store_id' => $storeId] = $this->getCurrentUserAndStore($request);

        return DB::transaction(function () use ($request, $user, $storeId) {
            // 商品と在庫を確認
            $items = [];
            $totalAmount = 0;

            foreach ($request->items as $item) {
                $product = Product::find($item['product_id']);

                // 店舗ごとの在庫をロックして確認
                $stock = StoreProductStock::where('store_id', $storeId)
                    ->where('product_id', $product->id)
                    ->lockForUpdate()
                    ->first();

                if (!$stock || !$stock->is_active) {
                    throw new \Exception("商品「{$product->name}」はこの店舗では現在販売できません");
                }

                if ($stock->stock_quantity < $item['quantity']) {
                    throw new \Exception("商品「{$product->name}」の在庫が不足しています");
                }

                $items[] = [
                    'product' => $product,
                    'stock' => $stock,
                    'quantity' => $item['quantity'],
                    'unit_price' => $product->price,
                ];

                $totalAmount += $product->price * $item['quantity'];
            }

            // 消費税（内税として計算済みと仮定）
            $tax = (int) floor($totalAmount * 0.1 / 1.1);
            $subtotal = $totalAmount - $tax;

            // 注文作成
            $order = Order::create([
                'store_id' => $storeId,
                'member_id' => $request->member_id,
                'staff_id' => $user->id,
                'total_amount' => $totalAmount,
                'status' => 'paid',
                'payment_method' => $request->payment_method,
                'staff_code' => $request->staff_code,
                'coupon_code' => $request->coupon_code,
            ]);

            // 注文明細作成と在庫減算
            foreach ($items as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product']->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                ]);

                // 店舗ごとの在庫を減算
                $item['stock']->decrementStock($item['quantity']);
            }

            $order->load('items.product', 'staff');

            return response()->json([
                'message' => '売上を登録しました',
                'order' => [
                    'id' => $order->id,
                    'receipt_uuid' => $order->receipt_uuid,
                    'receipt_url' => $order->getReceiptUrl(),
                    'total_amount' => $order->total_amount,
                    'subtotal' => $subtotal,
                    'tax' => $tax,
                    'payment_method' => $order->payment_method,
                    'staff_code' => $order->staff_code,
                    'coupon_code' => $order->coupon_code,
                    'items' => $order->items->map(function ($item) {
                        return [
                            'product_name' => $item->product->name,
                            'quantity' => $item->quantity,
                            'unit_price' => $item->unit_price,
                            'subtotal' => $item->subtotal,
                        ];
                    }),
                    'staff_name' => $order->staff->name,
                    'created_at' => $order->created_at,
                ],
            ], 201);
        });
    }

    /**
     * 売上履歴を取得
     */
    public function salesHistory(Request $request): JsonResponse
    {
        ['store_id' => $storeId] = $this->getCurrentUserAndStore($request);

        $query = Order::with(['items.product', 'staff', 'member'])
            ->byStore($storeId)
            ->orderBy('created_at', 'desc');

        // 日付フィルター
        if ($request->has('date')) {
            $date = $request->date;
            $query->whereDate('created_at', $date);
        }

        $orders = $query->paginate($request->get('per_page', 20));

        return response()->json($orders);
    }
}
