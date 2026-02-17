'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, isAuthenticated } from '@/lib/auth/hooks';
import { ticketsApi } from '@/lib/api/tickets';
import {
  Store,
  Ticket,
  ScanLine,
  LogOut,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface TodayHistoryItem {
  id: number;
  member_name: string;
  ticket_type: string;
  staff_name: string;
  redeemed_at: string;
  minutes_ago: number;
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const { logout, isLoading } = useAuth('staff');
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayHistory, setTodayHistory] = useState<TodayHistoryItem[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTodayHistory = useCallback(async () => {
    try {
      const response = await ticketsApi.getTodayHistory();
      setTodayHistory(response.data.history);
      setTotalToday(response.data.total_today);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push('/staff/login');
      return;
    }

    fetchTodayHistory();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Refresh history every 30 seconds
    const historyTimer = setInterval(() => {
      fetchTodayHistory();
    }, 30000);

    return () => {
      clearInterval(timer);
      clearInterval(historyTimer);
    };
  }, [router, fetchTodayHistory]);

  if (!mounted) {
    return null;
  }

  const formatMinutesAgo = (minutes: number) => {
    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    return `${hours}時間前`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">東京本店</h1>
                <p className="text-xs text-slate-500">スタッフPOS</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={logout}
              disabled={isLoading}
              className="border-emerald-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              終了
            </Button>
          </div>
        </div>
      </header>

      {/* Main content - optimized for touch */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Time display */}
        <Card className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8" />
                <div>
                  <p className="text-emerald-100 text-sm">現在時刻</p>
                  <p className="text-3xl font-bold">
                    {currentTime.toLocaleTimeString('ja-JP')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-100 text-sm">本日の消込</p>
                <p className="text-3xl font-bold">{totalToday}件</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons - large for touch */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <Link href="/staff/redeem">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.99]">
              <CardContent className="py-8">
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600">
                    <ScanLine className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">チケット消込</h2>
                    <p className="text-slate-500">会員のチケットを消込します</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.99]">
            <CardContent className="py-8">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-400 to-rose-500">
                  <Ticket className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">利用履歴</h2>
                  <p className="text-slate-500">本日の消込履歴を確認</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-500" />
                最近の消込
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchTodayHistory}
                className="text-slate-500"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {todayHistory.length > 0 ? (
              <div className="space-y-3">
                {todayHistory.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{item.member_name}</p>
                      <p className="text-sm text-slate-500">{item.ticket_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-600">消込完了</p>
                      <p className="text-xs text-slate-400">{formatMinutesAgo(item.minutes_ago)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Ticket className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500">本日の消込履歴はありません</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
