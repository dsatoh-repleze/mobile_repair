'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, isAuthenticated } from '@/lib/auth/hooks';
import { ticketsApi, Ticket, RedemptionHistory, MemberOrder } from '@/lib/api/tickets';
import {
  Ticket as TicketIcon,
  LogOut,
  Sparkles,
  Calendar,
  Clock,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  CreditCard,
} from 'lucide-react';

export default function MemberDashboardPage() {
  const router = useRouter();
  const { logout, isLoading } = useAuth('member');
  const [mounted, setMounted] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [history, setHistory] = useState<RedemptionHistory[]>([]);
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsRes, historyRes, ordersRes] = await Promise.all([
        ticketsApi.getTickets(),
        ticketsApi.getHistory(1),
        ticketsApi.getOrders(1),
      ]);
      setTickets(ticketsRes.data.tickets.filter((t) => t.status === 'active').slice(0, 3));
      setTotalRemaining(ticketsRes.data.summary.total_remaining);
      setHistory(historyRes.data.history.slice(0, 3));
      setOrders(ordersRes.data.orders.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push('/member/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  if (!mounted) {
    return null;
  }

  const ticketColors: Record<string, string> = {
    'スタンダード': 'from-violet-500 to-indigo-600',
    'ボーナス': 'from-amber-400 to-orange-500',
    'プレミアム': 'from-rose-400 to-pink-600',
    'default': 'from-blue-500 to-cyan-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5 text-white" />
              <span className="font-bold text-white">ITX Premium</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/member/subscription">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  <CreditCard className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/member/purchases">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  <ShoppingBag className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                disabled={isLoading}
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Welcome section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">こんにちは</p>
            <h1 className="text-2xl font-bold text-white">テスト会員さん</h1>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm">利用可能</p>
            <p className="text-2xl font-bold text-white">{totalRemaining}回</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-white animate-spin" />
          </div>
        ) : (
          <>
            {/* Ticket cards - Apple Wallet style */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between">
                <h2 className="text-white/80 text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  保有チケット
                </h2>
                <Link href="/member/tickets">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
                  >
                    すべて見る
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>

              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <Link key={ticket.id} href="/member/tickets">
                    <Card
                      className={`relative overflow-hidden border-0 bg-gradient-to-br ${
                        ticketColors[ticket.ticket_type] || ticketColors.default
                      } text-white cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.99]`}
                    >
                      {ticket.is_expiring_soon && (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-white/20 rounded-full text-xs font-medium animate-pulse">
                          まもなく期限切れ
                        </div>
                      )}
                      <CardContent className="py-6">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-white/70 text-sm">{ticket.ticket_type}</p>
                            <p className="text-4xl font-bold">
                              {ticket.remaining_uses}
                              <span className="text-lg font-normal text-white/70">回</span>
                            </p>
                            <div className="flex items-center gap-1 mt-2 text-white/70 text-xs">
                              <Calendar className="h-3 w-3" />
                              <span>有効期限: {ticket.expires_at}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 px-4 py-2 bg-white/20 rounded-xl text-sm font-medium">
                            利用する
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="py-8 text-center">
                    <TicketIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">チケットがありません</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Subscription card */}
            <Link href="/member/subscription">
              <Card className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-white cursor-pointer hover:scale-[1.02] transition-transform mb-8">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">サブスクリプション</p>
                        <p className="text-white/80 text-sm">プランを確認・加入する</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Usage history */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    利用履歴
                  </CardTitle>
                  <Link href="/member/history">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
                    >
                      すべて見る
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-3 border-b border-white/10 last:border-0"
                      >
                        <div>
                          <p className="font-medium">{item.store_name}</p>
                          <p className="text-sm text-white/60">{item.ticket_type}</p>
                        </div>
                        <p className="text-sm text-white/60">{item.redeemed_at}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-white/60 text-sm">履歴がありません</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase history */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    購入履歴
                  </CardTitle>
                  <Link href="/member/purchases">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
                    >
                      すべて見る
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {orders.length > 0 ? (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <Link key={order.id} href={`/member/purchases/${order.id}`}>
                        <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0 hover:bg-white/5 -mx-2 px-2 rounded cursor-pointer">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{order.items_preview}</p>
                            <p className="text-sm text-white/60">{order.store_name}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-bold">&yen;{order.total_amount.toLocaleString()}</p>
                            <p className="text-sm text-white/60">{order.created_at}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-white/60 text-sm">購入履歴がありません</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
