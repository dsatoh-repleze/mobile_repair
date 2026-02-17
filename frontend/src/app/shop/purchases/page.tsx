'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, MapPin, RefreshCw, ChevronRight, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ticketsApi, MemberOrder, MemberOrdersResponse } from '@/lib/api/tickets';
import { isAuthenticated } from '@/lib/auth/hooks';

export default function ShopPurchasesPage() {
  const router = useRouter();
  const [data, setData] = useState<MemberOrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchOrders = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await ticketsApi.getOrders(pageNum);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/member/login?redirect=/shop/purchases');
      return;
    }
    fetchOrders(page);
  }, [router, fetchOrders, page]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/shop"
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">ショップに戻る</span>
            </Link>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              <span className="font-bold text-gray-900">購入履歴</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchOrders(page)}
              className="text-gray-600 hover:text-blue-600"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Orders list */}
            <Card className="bg-white shadow-sm">
              <CardContent className="p-0">
                {data?.orders && data.orders.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {data.orders.map((order: MemberOrder) => (
                      <Link key={order.id} href={`/shop/purchases/${order.id}`}>
                        <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-bold text-gray-900">
                                  &yen;{order.total_amount.toLocaleString()}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {order.item_count}点
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 truncate mb-1">
                                {order.items_preview}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {order.store_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  {order.payment_method}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <div className="text-right">
                                <p className="text-sm text-gray-500">{order.created_at}</p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">購入履歴がありません</p>
                    <Link href="/shop">
                      <Button variant="outline" className="mt-4">
                        <Smartphone className="h-4 w-4 mr-2" />
                        ショップを見る
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {data?.pagination && data.pagination.last_page > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  前へ
                </Button>
                <span className="text-gray-600 text-sm px-4">
                  {page} / {data.pagination.last_page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pagination.last_page, p + 1))}
                  disabled={page === data.pagination.last_page}
                >
                  次へ
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
