'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, isAuthenticated } from '@/lib/auth/hooks';
import { adminApi, StocktakingSession, StocktakingItem } from '@/lib/api/admin';
import {
  ClipboardList,
  LogOut,
  RefreshCw,
  ChevronLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Search,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { AdminNav } from '@/components/layouts/admin-nav';

export default function StocktakingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = parseInt(params.id as string);
  const { logout, isLoading } = useAuth('admin');
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<StocktakingSession | null>(null);
  const [items, setItems] = useState<StocktakingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'counted' | 'uncounted'>('all');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completing, setCompleting] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStocktakingSession(sessionId);
      setSession(res.data.session);
      setItems(res.data.items);
    } catch (error) {
      console.error('Failed to fetch stocktaking data:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push('/admin/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  const handleSaveItem = async (itemId: number) => {
    if (!editQuantity) return;
    setSaving(true);
    try {
      const res = await adminApi.updateStocktakingItem(sessionId, itemId, {
        actual_quantity: parseInt(editQuantity),
        notes: editNotes || undefined,
      });
      // Update local state
      setItems(items.map(item =>
        item.id === itemId
          ? { ...item, ...res.data.item }
          : item
      ));
      if (session) {
        setSession({ ...session, progress: res.data.progress });
      }
      setEditingItemId(null);
      setEditQuantity('');
      setEditNotes('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleScanBarcode = async () => {
    if (!barcode.trim()) return;
    setScanning(true);
    try {
      const res = await adminApi.scanStocktakingBarcode(sessionId, barcode);
      const item = res.data.item;
      // Start editing the found item
      setEditingItemId(item.id);
      setEditQuantity(item.actual_quantity?.toString() || '');
      setEditNotes(item.notes || '');
      // Scroll to the item
      const element = document.getElementById(`item-${item.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setBarcode('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '商品が見つかりません');
    } finally {
      setScanning(false);
    }
  };

  const handleComplete = async (applyAdjustments: boolean) => {
    setCompleting(true);
    try {
      const res = await adminApi.completeStocktaking(sessionId, applyAdjustments);
      alert(res.data.message);
      setShowCompleteModal(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '完了処理に失敗しました');
    } finally {
      setCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('この棚卸しをキャンセルしますか？')) return;
    try {
      const res = await adminApi.cancelStocktaking(sessionId);
      alert(res.data.message);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'キャンセルに失敗しました');
    }
  };

  const startEditing = (item: StocktakingItem) => {
    setEditingItemId(item.id);
    setEditQuantity(item.actual_quantity?.toString() || item.system_quantity.toString());
    setEditNotes(item.notes || '');
  };

  if (!mounted) {
    return null;
  }

  const filteredItems = items.filter(item => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !item.product_name.toLowerCase().includes(query) &&
        !item.product_sku?.toLowerCase().includes(query) &&
        !item.product_barcode?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    // Status filter
    if (filterStatus === 'counted' && !item.is_counted) return false;
    if (filterStatus === 'uncounted' && item.is_counted) return false;
    return true;
  });

  const getDifferenceIcon = (difference: number | null | undefined) => {
    if (difference === null || difference === undefined) return null;
    if (difference > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (difference < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  const getDifferenceColor = (difference: number | null | undefined) => {
    if (difference === null || difference === undefined) return 'text-slate-500';
    if (difference > 0) return 'text-green-600';
    if (difference < 0) return 'text-red-600';
    return 'text-slate-500';
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
                <h1 className="text-lg font-bold text-slate-900">棚卸し詳細</h1>
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
        {/* Back button */}
        <Link href="/admin/stocktaking" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-4">
          <ChevronLeft className="h-4 w-4" />
          一覧に戻る
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : session ? (
          <>
            {/* Session Info */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-teal-500" />
                    {session.store_name} - 棚卸し #{session.id}
                  </CardTitle>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    session.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    session.status === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {session.status_label}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-slate-500">開始日時</p>
                    <p className="font-medium">{session.started_at}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">作成者</p>
                    <p className="font-medium">{session.created_by_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">進捗</p>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all"
                          style={{ width: `${session.progress.percentage}%` }}
                        />
                      </div>
                      <span className="font-medium">{session.progress.percentage}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">カウント済み</p>
                    <p className="font-medium">{session.progress.counted} / {session.progress.total}</p>
                  </div>
                </div>

                {session.discrepancy_summary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-slate-500">一致</p>
                        <p className="font-medium">{session.discrepancy_summary.match_count}件</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-slate-500">過剰</p>
                        <p className="font-medium">{session.discrepancy_summary.positive_count}件</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-sm text-slate-500">不足</p>
                        <p className="font-medium">{session.discrepancy_summary.negative_count}件</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-sm text-slate-500">差異合計</p>
                        <p className={`font-medium ${session.discrepancy_summary.total_difference >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {session.discrepancy_summary.total_difference >= 0 ? '+' : ''}{session.discrepancy_summary.total_difference}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {session.status === 'in_progress' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button onClick={() => setShowCompleteModal(true)} disabled={session.progress.counted === 0}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      棚卸し完了
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <XCircle className="h-4 w-4 mr-2" />
                      キャンセル
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Barcode Scanner */}
            {session.status === 'in_progress' && (
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleScanBarcode()}
                        placeholder="バーコードをスキャンまたは入力..."
                        className="w-full px-4 py-2 border rounded-md"
                      />
                    </div>
                    <Button onClick={handleScanBarcode} disabled={scanning || !barcode.trim()}>
                      <Search className="h-4 w-4 mr-2" />
                      検索
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="商品名、SKU、バーコードで検索..."
                      className="w-full px-4 py-2 border rounded-md"
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant={filterStatus === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus('all')}
                    >
                      全て
                    </Button>
                    <Button
                      variant={filterStatus === 'uncounted' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus('uncounted')}
                    >
                      未カウント
                    </Button>
                    <Button
                      variant={filterStatus === 'counted' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus('counted')}
                    >
                      カウント済み
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-teal-500" />
                  商品一覧
                  <span className="text-sm font-normal text-slate-500">
                    ({filteredItems.length}件)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">商品</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">システム在庫</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">実際在庫</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">差異</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">備考</th>
                          {session.status === 'in_progress' && (
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">操作</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            id={`item-${item.id}`}
                            className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                              editingItemId === item.id ? 'bg-teal-50' : ''
                            }`}
                          >
                            <td className="py-4 px-4">
                              <div>
                                <p className="font-medium text-slate-900">{item.product_name}</p>
                                <p className="text-sm text-slate-500">
                                  {item.product_sku && <span className="mr-2">SKU: {item.product_sku}</span>}
                                  {item.product_barcode && <span>BC: {item.product_barcode}</span>}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right font-medium">{item.system_quantity}</td>
                            <td className="py-4 px-4 text-right">
                              {editingItemId === item.id ? (
                                <input
                                  type="number"
                                  value={editQuantity}
                                  onChange={(e) => setEditQuantity(e.target.value)}
                                  className="w-20 px-2 py-1 border rounded-md text-right"
                                  min="0"
                                  autoFocus
                                />
                              ) : (
                                <span className={item.is_counted ? 'font-medium' : 'text-slate-400'}>
                                  {item.is_counted ? item.actual_quantity : '-'}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {item.is_counted && (
                                <span className={`inline-flex items-center gap-1 ${getDifferenceColor(item.difference)}`}>
                                  {getDifferenceIcon(item.difference)}
                                  {item.difference !== undefined && item.difference !== null && (
                                    <span>{item.difference >= 0 ? '+' : ''}{item.difference}</span>
                                  )}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {editingItemId === item.id ? (
                                <input
                                  type="text"
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  className="w-full px-2 py-1 border rounded-md"
                                  placeholder="備考"
                                />
                              ) : (
                                <span className="text-sm text-slate-500">{item.notes || '-'}</span>
                              )}
                            </td>
                            {session.status === 'in_progress' && (
                              <td className="py-4 px-4 text-right">
                                {editingItemId === item.id ? (
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveItem(item.id)}
                                      disabled={saving || !editQuantity}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingItemId(null);
                                        setEditQuantity('');
                                        setEditNotes('');
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEditing(item)}
                                  >
                                    カウント
                                  </Button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm py-8 text-center">
                    該当する商品がありません
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="text-slate-500 text-center py-12">棚卸しデータが見つかりません</p>
        )}
      </main>

      {/* Complete Modal */}
      {showCompleteModal && session && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-slate-900 mb-4">棚卸し完了</h2>
            <div className="space-y-4">
              <p className="text-slate-600">
                カウント済み: {session.progress.counted} / {session.progress.total} 件
              </p>
              {session.progress.counted < session.progress.total && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-700">
                    未カウントの商品が {session.progress.total - session.progress.counted} 件あります。
                  </p>
                </div>
              )}
              <p className="text-slate-600">
                在庫調整を適用しますか？
              </p>
            </div>
            <div className="flex flex-col gap-2 mt-6">
              <Button
                onClick={() => handleComplete(true)}
                disabled={completing}
                className="w-full"
              >
                {completing ? '処理中...' : '在庫を調整して完了'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleComplete(false)}
                disabled={completing}
                className="w-full"
              >
                在庫調整なしで完了
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowCompleteModal(false)}
                className="w-full"
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
