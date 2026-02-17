'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, isAuthenticated } from '@/lib/auth/hooks';
import { adminApi, StocktakingSession, Store } from '@/lib/api/admin';
import {
  ClipboardList,
  LogOut,
  Shield,
  RefreshCw,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Package,
} from 'lucide-react';
import { AdminNav } from '@/components/layouts/admin-nav';

export default function StocktakingListPage() {
  const router = useRouter();
  const { logout, isLoading } = useAuth('admin');
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<StocktakingSession[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStoreId, setCreateStoreId] = useState<string>('');
  const [createNotes, setCreateNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const statuses = [
    { value: '', label: '全て' },
    { value: 'in_progress', label: '進行中' },
    { value: 'completed', label: '完了' },
    { value: 'cancelled', label: 'キャンセル' },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStocktakingSessions({
        store_id: selectedStoreId ? parseInt(selectedStoreId) : undefined,
        status: selectedStatus || undefined,
      });
      setSessions(res.data.sessions.data);
      setStores(res.data.stores);
    } catch (error) {
      console.error('Failed to fetch stocktaking data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, selectedStatus]);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push('/admin/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  const handleCreate = async () => {
    if (!createStoreId) return;
    setCreating(true);
    try {
      const res = await adminApi.createStocktaking({
        store_id: parseInt(createStoreId),
        notes: createNotes || undefined,
      });
      alert(res.data.message);
      setShowCreateModal(false);
      setCreateStoreId('');
      setCreateNotes('');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-slate-400" />;
      default:
        return null;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-slate-100 text-slate-500';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">棚卸し管理</h1>
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
        {/* Filters and Create */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end justify-between">
              <div className="flex flex-wrap gap-4 items-end">
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-2 border rounded-md"
                  >
                    {statuses.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新規棚卸し
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-teal-500" />
                棚卸し一覧
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">ID</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">店舗</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">ステータス</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">進捗</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">作成者</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">開始日時</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="py-4 px-4 text-slate-500">#{session.id}</td>
                          <td className="py-4 px-4 font-medium text-slate-900">{session.store_name}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(session.status)}`}>
                              {getStatusIcon(session.status)}
                              {session.status_label}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-teal-500 rounded-full transition-all"
                                  style={{ width: `${session.progress.percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-slate-500">
                                {session.progress.counted}/{session.progress.total}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-500">{session.created_by_name}</td>
                          <td className="py-4 px-4 text-slate-500">{session.started_at}</td>
                          <td className="py-4 px-4 text-right">
                            <Link href={`/admin/stocktaking/${session.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                詳細
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-500 text-sm py-8 text-center">
                  棚卸しデータがありません
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-slate-900 mb-4">新規棚卸し開始</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">店舗 *</label>
                <select
                  value={createStoreId}
                  onChange={(e) => setCreateStoreId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md"
                >
                  <option value="">店舗を選択</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                <textarea
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md"
                  rows={3}
                  placeholder="備考を入力..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={!createStoreId || creating}
              >
                {creating ? '作成中...' : '開始'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
