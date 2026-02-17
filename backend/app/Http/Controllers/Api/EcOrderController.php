<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreProductStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EcOrderController extends Controller
{
    /**
     * EC注文を作成
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'payment_method' => 'required|in:credit,qr',
            'staff_code' => 'nullable|string|max:100',
            'coupon_code' => 'nullable|string|max:100',
        ]);

        $member = auth('member')->user();
        $storeId = $request->store_id;

        return DB::transaction(function () use ($request, $member, $storeId) {
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

            // 注文作成（EC注文はstaff_idがnull）
            $order = Order::create([
                'store_id' => $storeId,
                'member_id' => $member->id,
                'staff_id' => null, // EC注文はスタッフなし
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

            $order->load('items.product', 'store');

            return response()->json([
                'message' => '注文を受け付けました',
                'order' => [
                    'id' => $order->id,
                    'receipt_uuid' => $order->receipt_uuid,
                    'receipt_url' => $order->getReceiptUrl(),
                    'total_amount' => $order->total_amount,
                    'subtotal' => $subtotal,
                    'tax' => $tax,
                    'payment_method' => $order->payment_method,
                    'store_name' => $order->store->name,
                    'items' => $order->items->map(function ($item) {
                        return [
                            'product_name' => $item->product->name,
                            'quantity' => $item->quantity,
                            'unit_price' => $item->unit_price,
                            'subtotal' => $item->subtotal,
                        ];
                    }),
                    'created_at' => $order->created_at->format('Y-m-d H:i:s'),
                ],
            ], 201);
        });
    }
}
