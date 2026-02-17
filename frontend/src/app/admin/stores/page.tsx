'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth, isAuthenticated } from '@/lib/auth/hooks';
import { adminApi, Store, StoreInput } from '@/lib/api/admin';
import {
  LogOut,
  Shield,
  Store as StoreIcon,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Users,
  Ticket,
  Loader2,
  Building2,
  Filter,
} from 'lucide-react';
import { AdminNav } from '@/components/layouts/admin-nav';

type ModalMode = 'create' | 'edit' | 'delete' | 'view' | null;

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

export default function AdminStoresPage() {
  const router = useRouter();
  const { logout, isLoading } = useAuth('admin');
  const [mounted, setMounted] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [prefectures, setPrefectures] = useState<string[]>([]);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState<StoreInput>({
    name: '',
    address: '',
    phone: '',
    prefecture: '東京都',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getStores(selectedPrefecture || undefined);
      setStores(response.data.stores);
      setPrefectures(response.data.prefectures);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPrefecture]);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push('/admin/login');
      return;
    }
    fetchStores();
  }, [router, fetchStores]);

  const openCreateModal = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      prefecture: '東京都',
    });
    setSelectedStore(null);
    setError('');
    setModalMode('create');
  };

  const openEditModal = (store: Store) => {
    setFormData({
      name: store.name,
      address: store.address || '',
      phone: store.phone || '',
      prefecture: store.prefecture,
    });
    setSelectedStore(store);
    setError('');
    setModalMode('edit');
  };

  const openDeleteModal = (store: Store) => {
    setSelectedStore(store);
    setError('');
    setModalMode('delete');
  };

  const openViewModal = async (store: Store) => {
    try {
      const response = await adminApi.getStore(store.id);
      setSelectedStore(response.data.store);
      setModalMode('view');
    } catch (error) {
      console.error('Failed to fetch store details:', error);
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedStore(null);
    setError('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      if (modalMode === 'create') {
        await adminApi.createStore(formData);
      } else if (modalMode === 'edit' && selectedStore) {
        await adminApi.updateStore(selectedStore.id, formData);
      }
      await fetchStores();
      closeModal();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || '操作に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStore) return;
    setSubmitting(true);
    setError('');
    try {
      await adminApi.deleteStore(selectedStore.id);
      await fetchStores();
      closeModal();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || '削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return null;
  }

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
                <h1 className="text-lg font-bold text-slate-900">店舗管理</h1>
                <p className="text-xs text-slate-500">ITX POS 管理システム</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchStores} disabled={loading}>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">店舗一覧</h2>
            <p className="text-slate-500">全{stores.length}店舗</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedPrefecture}
                onChange={(e) => setSelectedPrefecture(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">すべてのエリア</option>
                {prefectures.map((pref) => (
                  <option key={pref} value={pref}>{pref}</option>
                ))}
              </select>
            </div>
            <Button onClick={openCreateModal} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />
              新規店舗
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <Card key={store.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{store.name}</p>
                      <p className="text-sm text-slate-500">{store.prefecture}</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {store.address && (
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{store.address}</span>
                      </div>
                    )}
                    {store.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-4 w-4" />
                        <span>{store.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">スタッフ {store.staff_count || 0}名</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Ticket className="h-4 w-4 text-violet-500" />
                        <span className="font-medium text-violet-600">
                          今月 {store.redemptions_this_month || 0}件
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openViewModal(store)}
                      className="flex-1"
                    >
                      詳細
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(store)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(store)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {stores.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">店舗がありません</p>
                    <Button onClick={openCreateModal} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      最初の店舗を登録
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      <Dialog open={modalMode === 'create' || modalMode === 'edit'} onOpenChange={closeModal}>
        <DialogContent onClose={closeModal}>
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? '新規店舗登録' : '店舗情報編集'}
            </DialogTitle>
            <DialogDescription>
              店舗の詳細情報を入力してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">店舗名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 東京本店"
              />
            </div>
            <div>
              <Label htmlFor="prefecture">都道府県</Label>
              <select
                id="prefecture"
                value={formData.prefecture}
                onChange={(e) => setFormData({ ...formData, prefecture: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {PREFECTURES.map((pref) => (
                  <option key={pref} value={pref}>{pref}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="address">住所（任意）</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="例: 東京都渋谷区..."
              />
            </div>
            <div>
              <Label htmlFor="phone">電話番号（任意）</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="例: 03-1234-5678"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {modalMode === 'create' ? '登録' : '更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={modalMode === 'delete'} onOpenChange={closeModal}>
        <DialogContent onClose={closeModal}>
          <DialogHeader>
            <DialogTitle>店舗削除の確認</DialogTitle>
            <DialogDescription>
              「{selectedStore?.name}」を削除してよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail Modal */}
      <Dialog open={modalMode === 'view'} onOpenChange={closeModal}>
        <DialogContent onClose={closeModal}>
          <DialogHeader>
            <DialogTitle>店舗詳細</DialogTitle>
          </DialogHeader>

          {selectedStore && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedStore.name}</h3>
                  <p className="text-slate-500">{selectedStore.prefecture}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">スタッフ数</p>
                  <p className="text-2xl font-bold">{selectedStore.staff_count || 0}名</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">今月の消込</p>
                  <p className="text-2xl font-bold text-violet-600">
                    {selectedStore.redemptions_this_month || 0}件
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">累計消込</p>
                  <p className="text-xl font-bold">{selectedStore.total_redemptions || 0}件</p>
                </div>
              </div>

              {selectedStore.address && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">住所</p>
                  <p className="font-medium">{selectedStore.address}</p>
                </div>
              )}

              {selectedStore.phone && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">電話番号</p>
                  <p className="font-medium">{selectedStore.phone}</p>
                </div>
              )}

              {selectedStore.staffs && selectedStore.staffs.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">所属スタッフ</p>
                  <div className="space-y-2">
                    {selectedStore.staffs.map((staff) => (
                      <div key={staff.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
                          <Users className="h-4 w-4 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{staff.name}</p>
                          <p className="text-xs text-slate-500">{staff.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              閉じる
            </Button>
            <Button onClick={() => selectedStore && openEditModal(selectedStore)}>
              <Edit className="h-4 w-4 mr-2" />
              編集
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
