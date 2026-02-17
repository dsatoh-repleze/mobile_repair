<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * 店舗一覧を取得
     */
    public function stores(): JsonResponse
    {
        $stores = Store::orderBy('name')->get(['id', 'name']);
        return response()->json(['stores' => $stores]);
    }

    /**
     * 取引履歴を取得
     */
    public function transactions(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'store_id' => 'nullable|exists:stores,id',
            'status' => 'nullable|in:paid,pending,refunded,failed',
        ]);

        $query = Order::with(['store', 'staff', 'member', 'items.product']);

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->byDateRange(
                $request->start_date . ' 00:00:00',
                $request->end_date . ' 23:59:59'
            );
        }

        if ($request->filled('store_id')) {
            $query->byStore($request->store_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(20);

        // Transform data to include receipt_url
        $orders->getCollection()->transform(function ($order) {
            $order->receipt_url = $order->getReceiptUrl();
            return $order;
        });

        return response()->json($orders);
    }

    /**
     * 売上サマリーを取得
     */
    public function salesSummary(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'store_id' => 'nullable|exists:stores,id',
        ]);

        $query = Order::paid()
            ->byDateRange(
                $request->start_date . ' 00:00:00',
                $request->end_date . ' 23:59:59'
            );

        $filterByStore = $request->filled('store_id');
        if ($filterByStore) {
            $query->byStore($request->store_id);
        }

        $orders = $query->with('store')->get();

        // 店舗別売上
        $byStore = $orders->groupBy('store_id')->map(function ($storeOrders, $storeId) {
            $store = $storeOrders->first()->store;
            return [
                'store_id' => $storeId,
                'store_name' => $store?->name ?? '不明',
                'count' => $storeOrders->count(),
                'amount' => $storeOrders->sum('total_amount'),
            ];
        })->values();

        $summary = [
            'total_orders' => $orders->count(),
            'total_amount' => $orders->sum('total_amount'),
            'by_payment_method' => [
                'cash' => $orders->where('payment_method', 'cash')->sum('total_amount'),
                'credit' => $orders->where('payment_method', 'credit')->sum('total_amount'),
                'qr' => $orders->where('payment_method', 'qr')->sum('total_amount'),
            ],
            'by_store' => $byStore,
            'daily_sales' => $orders
                ->groupBy(fn ($order) => $order->created_at->format('Y-m-d'))
                ->map(fn ($dayOrders) => [
                    'count' => $dayOrders->count(),
                    'amount' => $dayOrders->sum('total_amount'),
                ]),
            'filtered_store_id' => $filterByStore ? (int) $request->store_id : null,
        ];

        return response()->json($summary);
    }

    /**
     * 売上CSVをエクスポート
     */
    public function exportSalesCsv(Request $request): StreamedResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'store_id' => 'nullable|exists:stores,id',
            'encoding' => 'nullable|in:utf8,sjis',
        ]);

        $query = Order::with(['items.product', 'store', 'member', 'staff'])
            ->paid()
            ->byDateRange(
                $request->start_date . ' 00:00:00',
                $request->end_date . ' 23:59:59'
            );

        if ($request->has('store_id')) {
            $query->byStore($request->store_id);
        }

        $encoding = $request->get('encoding', 'utf8');
        $filename = sprintf('sales_report_%s_%s.csv', $request->start_date, $request->end_date);

        return response()->streamDownload(function () use ($query, $encoding) {
            $handle = fopen('php://output', 'w');

            // BOM for UTF-8 (Excel対応)
            if ($encoding === 'utf8') {
                fputs($handle, "\xEF\xBB\xBF");
            }

            // ヘッダー行
            $headers = [
                '注文ID',
                '注文日時',
                '店舗名',
                '会員名',
                '会員ID',
                '担当スタッフ',
                '商品名',
                '数量',
                '単価',
                '小計',
                '合計金額',
                '決済方法',
                '決済ステータス',
            ];

            if ($encoding === 'sjis') {
                $headers = array_map(fn ($h) => mb_convert_encoding($h, 'SJIS-win', 'UTF-8'), $headers);
            }
            fputcsv($handle, $headers);

            // データ行
            $query->orderBy('created_at', 'desc')
                ->chunk(100, function ($orders) use ($handle, $encoding) {
                    foreach ($orders as $order) {
                        foreach ($order->items as $item) {
                            $row = [
                                $order->id,
                                $order->created_at->format('Y-m-d H:i:s'),
                                $order->store?->name ?? '',
                                $order->member?->name ?? 'ゲスト',
                                $order->member_id ?? '',
                                $order->staff?->name ?? '',
                                $item->product->name,
                                $item->quantity,
                                $item->unit_price,
                                $item->subtotal,
                                $order->total_amount,
                                $this->getPaymentMethodLabel($order->payment_method),
                                $this->getStatusLabel($order->status),
                            ];

                            if ($encoding === 'sjis') {
                                $row = array_map(function ($v) {
                                    return is_string($v) ? mb_convert_encoding($v, 'SJIS-win', 'UTF-8') : $v;
                                }, $row);
                            }

                            fputcsv($handle, $row);
                        }
                    }
                });

            fclose($handle);
        }, $filename, [
            'Content-Type' => $encoding === 'sjis' ? 'text/csv; charset=Shift_JIS' : 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
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

    private function getStatusLabel(string $status): string
    {
        return match ($status) {
            'pending' => '保留',
            'paid' => '支払済',
            'failed' => '失敗',
            'refunded' => '返金済',
            default => $status,
        };
    }
}
