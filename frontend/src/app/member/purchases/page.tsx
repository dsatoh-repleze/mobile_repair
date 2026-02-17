'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, MapPin, RefreshCw, ChevronRight, CreditCard, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ticketsApi, MemberOrder, MemberOrdersResponse } from '@/lib/api/tickets';
import { isAuthenticated } from '@/lib/auth/hooks';

export default function MemberPurchasesPage() {
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
      router.push('/member/login');
      return;
    }
    fetchOrders(page);
  }, [router, fetchOrders, page]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/member/dashboard"
              className="flex items-center gap-2 text-white/80 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">戻る</span>
            </Link>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-white" />
              <span className="font-bold text-white">購入履歴</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchOrders(page)}
              className="text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-white animate-spin" />
          </div>
        ) : (
          <>
            {/* Orders list */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="p-0">
                {data?.orders && data.orders.length > 0 ? (
                  <div className="divide-y divide-white/10">
                    {data.orders.map((order: MemberOrder) => (
                      <Link key={order.id} href={`/member/purchases/${order.id}`}>
                        <div className="p-4 hover:bg-white/5 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-bold text-white">
                                  &yen;{order.total_amount.toLocaleString()}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-white/70">
                                  {order.item_count}点
                                </span>
                              </div>
                              <p className="text-sm text-white/70 truncate mb-1">
                                {order.items_preview}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-white/50">
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
                                <p className="text-sm text-white/60">{order.created_at}</p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-white/40" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <ShoppingBag className="h-12 w-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">購入履歴がありません</p>
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
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  前へ
                </Button>
                <span className="text-white/70 text-sm px-4">
                  {page} / {data.pagination.last_page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pagination.last_page, p + 1))}
                  disabled={page === data.pagination.last_page}
                  className="border-white/20 text-white hover:bg-white/10"
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
