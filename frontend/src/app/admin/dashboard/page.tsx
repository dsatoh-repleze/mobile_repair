'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, isAuthenticated } from '@/lib/auth/hooks';
import { adminApi, DashboardStats, RecentActivity, MonthlyTrend, StoreStats } from '@/lib/api/admin';
import {
  Users,
  TrendingUp,
  Ticket,
  LogOut,
  Shield,
  Store,
  ChevronRight,
  RefreshCw,
  Activity,
  Building2,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import { AdminNav } from '@/components/layouts/admin-nav';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { logout, isLoading } = useAuth('admin');
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes, trendRes, storeRes] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getRecentActivity(),
        adminApi.getMonthlyTrend(),
        adminApi.getStoreStats(),
      ]);
      setStats(statsRes.data.stats);
      setActivities(activityRes.data.activities);
      setTrend(trendRes.data.trend);
      setStoreStats(storeRes.data.stores);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push('/admin/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  if (!mounted) {
    return null;
  }

  const formatNumber = (num: number) => num.toLocaleString();
  const formatCurrency = (num: number) => `¥${num.toLocaleString()}`;
  const formatGrowth = (rate: number) => {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate}%`;
  };

  const maxTrendValue = Math.max(...trend.map(t => t.count), 1);

  const salesCards = [
    {
      title: '本日の売上',
      value: stats ? formatCurrency(stats.sales_today) : '-',
      change: stats ? `${stats.orders_today}件` : '',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      positive: true,
    },
    {
      title: '今月の売上',
      value: stats ? formatCurrency(stats.sales_this_month) : '-',
      change: stats ? formatGrowth(stats.sales_growth_rate) : '',
      icon: ShoppingCart,
      color: 'from-blue-500 to-indigo-500',
      positive: stats ? stats.sales_growth_rate >= 0 : true,
    },
  ];

  const statCards = [
    {
      title: '総会員数',
      value: stats ? formatNumber(stats.total_members) : '-',
      change: stats ? formatGrowth(stats.member_growth_rate) : '',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      positive: stats ? stats.member_growth_rate >= 0 : true,
    },
    {
      title: '今月の消込',
      value: stats ? formatNumber(stats.redemptions_this_month) : '-',
      change: stats ? formatGrowth(stats.redemption_growth_rate) : '',
      icon: Ticket,
      color: 'from-violet-500 to-purple-500',
      positive: stats ? stats.redemption_growth_rate >= 0 : true,
    },
    {
      title: '有効チケット数',
      value: stats ? formatNumber(stats.active_tickets) : '-',
      change: stats ? `残り${formatNumber(stats.total_remaining_uses)}回` : '',
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-500',
      positive: true,
    },
    {
      title: '店舗数',
      value: stats ? formatNumber(stats.stores_count) : '-',
      change: '稼働中',
      icon: Building2,
      color: 'from-orange-500 to-red-500',
      positive: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">管理ダッシュボード</h1>
                <p className="text-xs text-slate-500">ITX POS 管理システム</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" onClick={logout} disabled={isLoading}>
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      <AdminNav />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && !stats ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <>
            {/* Sales Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {salesCards.map((stat) => (
                <Card key={stat.title} className="relative overflow-hidden border-2 border-green-100">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-500">
                        {stat.title}
                      </CardTitle>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color}`}>
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                    <p className={`text-sm font-medium ${stat.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stat.change} {stat.title === '今月の売上' && '前月比'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat) => (
                <Card key={stat.title} className="relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-500">
                        {stat.title}
                      </CardTitle>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color}`}>
                        <stat.icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                    <p className={`text-sm font-medium ${stat.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stat.change} {stat.title !== '有効チケット数' && stat.title !== '店舗数' && '前月比'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Monthly Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-violet-500" />
                    消込数推移（12ヶ月）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trend.slice(-6).map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="w-20 text-sm text-slate-500 shrink-0">{item.label.slice(-3)}</div>
                        <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${(item.count / maxTrendValue) * 100}%` }}
                          />
                        </div>
                        <div className="w-12 text-sm font-medium text-slate-700 text-right">{item.count}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-violet-500" />
                      最近のアクティビティ
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-slate-500">
                      すべて見る
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="space-y-3">
                      {activities.slice(0, 5).map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{activity.member_name}</p>
                            <p className="text-sm text-slate-500">
                              {activity.ticket_type} @ {activity.store_name}
                            </p>
                          </div>
                          <p className="text-sm text-slate-400">{activity.time_ago}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm py-8 text-center">
                      アクティビティがありません
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Store Rankings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-violet-500" />
                    店舗別消込ランキング（今月）
                  </CardTitle>
                  <Link href="/admin/stores">
                    <Button variant="ghost" size="sm" className="text-slate-500">
                      店舗管理
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {storeStats.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">順位</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">店舗名</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">エリア</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">スタッフ数</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">今月の消込</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">累計</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storeStats.slice(0, 5).map((store, index) => (
                          <tr key={store.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                index === 1 ? 'bg-slate-200 text-slate-600' :
                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-900">{store.name}</td>
                            <td className="py-3 px-4 text-slate-500">{store.prefecture}</td>
                            <td className="py-3 px-4 text-right text-slate-500">{store.staff_count}</td>
                            <td className="py-3 px-4 text-right font-medium text-violet-600">
                              {store.redemptions_this_month}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-500">{store.total_redemptions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm py-8 text-center">
                    店舗データがありません
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
