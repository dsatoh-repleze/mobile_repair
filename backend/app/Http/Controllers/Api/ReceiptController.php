<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;

class ReceiptController extends Controller
{
    /**
     * レシート情報を取得（公開アクセス）
     */
    public function show(string $uuid): JsonResponse
    {
        $order = Order::with(['items.product', 'staff', 'store'])
            ->where('receipt_uuid', $uuid)
            ->where('status', 'paid')
            ->first();

        if (!$order) {
            return response()->json([
                'message' => 'レシートが見つかりません',
            ], 404);
        }

        // 消費税計算（内税として）
        $tax = (int) floor($order->total_amount * 0.1 / 1.1);
        $subtotal = $order->total_amount - $tax;

        return response()->json([
            'receipt' => [
                'store_name' => $order->store?->name ?? '店舗',
                'store_address' => $order->store?->address ?? '',
                'order_id' => $order->id,
                'date' => $order->created_at->format('Y/m/d H:i'),
                'items' => $order->items->map(function ($item) {
                    return [
                        'name' => $item->product->name,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'subtotal' => $item->subtotal,
                    ];
                }),
                'subtotal' => $subtotal,
                'tax' => $tax,
                'total' => $order->total_amount,
                'payment_method' => $this->getPaymentMethodLabel($order->payment_method),
                'received_amount' => $order->received_amount,
                'change_amount' => $order->change_amount,
                'staff_name' => $order->staff?->name ?? '-',
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
