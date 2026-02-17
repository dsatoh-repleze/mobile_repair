'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface Store {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  name: string;
}

interface Member {
  id: number;
  name: string;
}

interface OrderItem {
  id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product: {
    id: number;
    name: string;
  };
}

interface Order {
  id: number;
  store_id: number;
  member_id: number | null;
  staff_id: number | null;
  total_amount: number;
  status: string;
  payment_method: string;
  staff_code: string | null;
  coupon_code: string | null;
  receipt_uuid: string;
  receipt_url: string;
  created_at: string;
  store: Store | null;
  staff: Staff | null;
  member: Member | null;
  items: OrderItem[];
}

interface PaginatedResponse {
  data: Order[];
  current_page: number;
  last_page: number;
  total: number;
}

export default function TransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedStoreId) params.append('store_id', selectedStoreId);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await apiClient.get<PaginatedResponse>(`/admin/reports/transactions?${params}`);
      setOrders(response.data.data);
      setPagination({
        current: response.data.current_page,
        last: response.data.last_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedStoreId, selectedStatus]);

  const fetchStores = async () => {
    try {
      const response = await apiClient.get<{ stores: Store[] }>('/admin/reports/stores');
      setStores(response.data.stores);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStores();
  }, [fetchOrders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(1);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return '支払済';
      case 'pending': return '保留';
      case 'refunded': return '返金済';
      case 'failed': return '失敗';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return '現金';
      case 'credit': return 'クレジット';
      case 'qr': return 'QR決済';
      default: return method;
    }
  };

  const openDetailModal = (order: Order) => {
    setSelectedOrder(order);
  };

  const openReceipt = (order: Order) => {
    window.open(`/receipt/${order.receipt_uuid}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">取引履歴</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm text-gray-600 block mb-1">開始日</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">終了日</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">店舗</label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="px-3 py-2 border rounded-md w-40"
              >
                <option value="">すべて</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">ステータス</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border rounded-md w-32"
              >
                <option value="">すべて</option>
                <option value="paid">支払済</option>
                <option value="pending">保留</option>
                <option value="refunded">返金済</option>
                <option value="failed">失敗</option>
              </select>
            </div>
            <Button type="submit">検索</Button>
          </form>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>取引一覧 ({pagination.total}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">取引がありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">注文ID</th>
                    <th className="text-left py-3 px-2">日時</th>
                    <th className="text-left py-3 px-2">店舗</th>
                    <th className="text-left py-3 px-2">担当</th>
                    <th className="text-right py-3 px-2">金額</th>
                    <th className="text-center py-3 px-2">決済方法</th>
                    <th className="text-center py-3 px-2">ステータス</th>
                    <th className="text-right py-3 px-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <span className="font-mono text-sm">#{order.id}</span>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600">
                        {formatDateTime(order.created_at)}
                      </td>
                      <td className="py-3 px-2 text-sm">
                        {order.store?.name || '-'}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600">
                        {order.staff?.name || '-'}
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        &yen;{order.total_amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-center text-sm">
                        {getPaymentMethodLabel(order.payment_method)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailModal(order)}
                        >
                          詳細
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReceipt(order)}
                          className="text-blue-600"
                        >
                          領収書
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.last > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current === 1}
                onClick={() => fetchOrders(pagination.current - 1)}
              >
                前へ
              </Button>
              <span className="px-4 py-2 text-sm">
                {pagination.current} / {pagination.last}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current === pagination.last}
                onClick={() => fetchOrders(pagination.current + 1)}
              >
                次へ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[600px] max-h-[80vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>注文詳細 #{selectedOrder.id}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openReceipt(selectedOrder)}
              >
                領収書を表示
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">日時</p>
                  <p className="font-medium">{formatDateTime(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">店舗</p>
                  <p className="font-medium">{selectedOrder.store?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">担当者</p>
                  <p className="font-medium">{selectedOrder.staff?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">会員</p>
                  <p className="font-medium">{selectedOrder.member?.name || 'ゲスト'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">決済方法</p>
                  <p className="font-medium">{getPaymentMethodLabel(selectedOrder.payment_method)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ステータス</p>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">スタッフコード</p>
                  <p className="font-medium">{selectedOrder.staff_code || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">クーポンコード</p>
                  <p className="font-medium">{selectedOrder.coupon_code || '-'}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="font-medium mb-2">商品明細</p>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">商品名</th>
                      <th className="text-right py-2">単価</th>
                      <th className="text-right py-2">数量</th>
                      <th className="text-right py-2">小計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2">{item.product?.name || '不明'}</td>
                        <td className="py-2 text-right">&yen;{item.unit_price.toLocaleString()}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right font-medium">&yen;{item.subtotal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td colSpan={3} className="py-3 text-right font-bold">合計</td>
                      <td className="py-3 text-right text-xl font-bold">
                        &yen;{selectedOrder.total_amount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  閉じる
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
