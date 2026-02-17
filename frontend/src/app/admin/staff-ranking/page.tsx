'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, isAuthenticated } from '@/lib/auth/hooks';
import { adminApi, StaffRanking, StaffRankingSummary, Store } from '@/lib/api/admin';
import {
  Trophy,
  LogOut,
  Shield,
  RefreshCw,
  DollarSign,
  ShoppingCart,
  Users,
  Medal,
} from 'lucide-react';
import { AdminNav } from '@/components/layouts/admin-nav';

export default function StaffRankingPage() {
  const router = useRouter();
  const { logout, isLoading } = useAuth('admin');
  const [mounted, setMounted] = useState(false);
  const [rankings, setRankings] = useState<StaffRanking[]>([]);
  const [summary, setSummary] = useState<StaffRankingSummary | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  const periods = [
    { value: 'today', label: '本日' },
    { value: 'week', label: '今週' },
    { value: 'month', label: '今月' },
    { value: 'year', label: '今年' },
    { value: 'all', label: '全期間' },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rankingRes, storeRes] = await Promise.all([
        adminApi.getStaffRanking(selectedPeriod, selectedStoreId ? parseInt(selectedStoreId) : undefined),
        adminApi.getStores(),
      ]);
      setRankings(rankingRes.data.rankings);
      setSummary(rankingRes.data.summary);
      setStores(storeRes.data.stores);
    } catch (error) {
      console.error('Failed to fetch ranking data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedStoreId]);

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

  const formatCurrency = (num: number) => `¥${num.toLocaleString()}`;

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700">
          <Medal className="h-5 w-5" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600">
          <Medal className="h-5 w-5" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700">
          <Medal className="h-5 w-5" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-sm font-bold">
        {rank}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">スタッフ売上ランキング</h1>
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
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">期間</label>
                <div className="flex gap-1">
                  {periods.map((period) => (
                    <Button
                      key={period.value}
                      variant={selectedPeriod === period.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPeriod(period.value)}
                    >
                      {period.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">店舗</label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="px-4 py-2 border rounded-md"
                >
                  <option value="">全店舗</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-yellow-500" />
          </div>
        ) : (
          <>
            {/* Summary */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      総売上
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">
                      {formatCurrency(summary.total_sales)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      総注文数
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">
                      {summary.total_orders.toLocaleString()}件
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      対象スタッフ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">
                      {summary.staff_count}名
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Rankings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  売上ランキング
                  <span className="text-sm font-normal text-slate-500">
                    ({periods.find(p => p.value === selectedPeriod)?.label})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rankings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">順位</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">スタッフ名</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">店舗</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">注文数</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">売上合計</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">平均単価</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankings.map((staff) => (
                          <tr key={staff.staff_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="py-4 px-4">
                              {getRankBadge(staff.rank)}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`font-medium ${staff.rank <= 3 ? 'text-slate-900' : 'text-slate-700'}`}>
                                {staff.staff_name}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-500">{staff.store_name}</td>
                            <td className="py-4 px-4 text-right text-slate-600">{staff.order_count}件</td>
                            <td className="py-4 px-4 text-right">
                              <span className={`font-bold ${staff.rank === 1 ? 'text-yellow-600' : staff.rank <= 3 ? 'text-slate-900' : 'text-slate-700'}`}>
                                {formatCurrency(staff.total_sales)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right text-slate-500">
                              {formatCurrency(staff.average_order)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm py-8 text-center">
                    該当期間のデータがありません
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
