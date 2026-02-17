<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberOrderController extends Controller
{
    /**
     * メンバーの購入履歴一覧
     */
    public function index(Request $request): JsonResponse
    {
        $member = auth('member')->user();

        $orders = Order::with(['store', 'items.product'])
            ->where('member_id', $member->id)
            ->where('status', 'paid')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json([
            'orders' => $orders->getCollection()->map(function ($order) {
                return [
                    'id' => $order->id,
                    'receipt_uuid' => $order->receipt_uuid,
                    'store_name' => $order->store?->name ?? '店舗',
                    'total_amount' => $order->total_amount,
                    'item_count' => $order->items->sum('quantity'),
                    'payment_method' => $this->getPaymentMethodLabel($order->payment_method),
                    'created_at' => $order->created_at->format('Y/m/d H:i'),
                    'items_preview' => $order->items->take(2)->map(function ($item) {
                        return $item->product->name;
                    })->join('、'),
                ];
            }),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    /**
     * 購入詳細
     */
    public function show(int $id): JsonResponse
    {
        $member = auth('member')->user();

        $order = Order::with(['store', 'staff', 'items.product'])
            ->where('member_id', $member->id)
            ->where('status', 'paid')
            ->find($id);

        if (!$order) {
            return response()->json([
                'message' => '注文が見つかりません',
            ], 404);
        }

        // 消費税計算（内税として）
        $tax = (int) floor($order->total_amount * 0.1 / 1.1);
        $subtotal = $order->total_amount - $tax;

        return response()->json([
            'order' => [
                'id' => $order->id,
                'receipt_uuid' => $order->receipt_uuid,
                'receipt_url' => $order->getReceiptUrl(),
                'store' => [
                    'name' => $order->store?->name ?? '店舗',
                    'address' => $order->store?->address ?? '',
                ],
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product_name' => $item->product->name,
                        'product_category' => $item->product->category,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'subtotal' => $item->subtotal,
                    ];
                }),
                'subtotal' => $subtotal,
                'tax' => $tax,
                'total_amount' => $order->total_amount,
                'payment_method' => $this->getPaymentMethodLabel($order->payment_method),
                'staff_name' => $order->staff?->name ?? '-',
                'staff_code' => $order->staff_code,
                'coupon_code' => $order->coupon_code,
                'created_at' => $order->created_at->format('Y/m/d H:i'),
            ],
        ]);
    }

    private function getPaymentMethodLabel(?string $method): string
    {
        return match ($method) {
            'cash' => '現金',
            'credit' => 'クレジットカード',
            'qr' => 'QR決済',
            default => '-',
        };
    }
}
