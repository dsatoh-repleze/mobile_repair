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
import { adminApi, Plan, PlanInput } from '@/lib/api/admin';
import {
  LogOut,
  Shield,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Ticket,
  Users,
  Loader2,
} from 'lucide-react';
import { AdminNav } from '@/components/layouts/admin-nav';

type ModalMode = 'create' | 'edit' | 'delete' | null;

export default function AdminPlansPage() {
  const router = useRouter();
  const { logout, isLoading } = useAuth('admin');
  const [mounted, setMounted] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanInput>({
    name: '',
    price: 0,
    description: '',
    ticket_count: 1,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getPlans();
      setPlans(response.data.plans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
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
    fetchPlans();
  }, [router, fetchPlans]);

  const openCreateModal = () => {
    setFormData({
      name: '',
      price: 0,
      description: '',
      ticket_count: 1,
      is_active: true,
    });
    setSelectedPlan(null);
    setError('');
    setModalMode('create');
  };

  const openEditModal = (plan: Plan) => {
    setFormData({
      name: plan.name,
      price: plan.price,
      description: plan.description || '',
      ticket_count: plan.ticket_count,
      is_active: plan.is_active,
    });
    setSelectedPlan(plan);
    setError('');
    setModalMode('edit');
  };

  const openDeleteModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setError('');
    setModalMode('delete');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedPlan(null);
    setError('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      if (modalMode === 'create') {
        await adminApi.createPlan(formData);
      } else if (modalMode === 'edit' && selectedPlan) {
        await adminApi.updatePlan(selectedPlan.id, formData);
      }
      await fetchPlans();
      closeModal();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || '操作に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    setError('');
    try {
      await adminApi.deletePlan(selectedPlan.id);
      await fetchPlans();
      closeModal();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || '削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (plan: Plan) => {
    try {
      await adminApi.togglePlanStatus(plan.id);
      await fetchPlans();
    } catch (error) {
      console.error('Failed to toggle status:', error);
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
                <h1 className="text-lg font-bold text-slate-900">プラン管理</h1>
                <p className="text-xs text-slate-500">ITX POS 管理システム</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchPlans} disabled={loading}>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">サブスクリプションプラン</h2>
            <p className="text-slate-500">会員向けプランの管理</p>
          </div>
          <Button onClick={openCreateModal} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4 mr-2" />
            新規プラン
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${!plan.is_active ? 'opacity-60' : ''}`}>
                {!plan.is_active && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-slate-200 text-slate-600 text-xs rounded-full">
                    無効
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                      <Ticket className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{plan.name}</p>
                      <p className="text-2xl font-bold text-violet-600">{plan.price_formatted}</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Ticket className="h-4 w-4" />
                      <span>チケット {plan.ticket_count}枚/月</span>
                    </div>
                    {plan.subscriptions_count !== undefined && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="h-4 w-4" />
                        <span>登録会員 {plan.subscriptions_count}名</span>
                      </div>
                    )}
                    {plan.description && (
                      <p className="text-sm text-slate-500">{plan.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(plan)}
                      className="flex-1"
                    >
                      {plan.is_active ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-1 text-emerald-500" />
                          有効
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-1 text-slate-400" />
                          無効
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(plan)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(plan)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {plans.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="py-12 text-center">
                    <Ticket className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">プランがありません</p>
                    <Button onClick={openCreateModal} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      最初のプランを作成
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
              {modalMode === 'create' ? '新規プラン作成' : 'プラン編集'}
            </DialogTitle>
            <DialogDescription>
              サブスクリプションプランの詳細を入力してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">プラン名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: スタンダードプラン"
              />
            </div>
            <div>
              <Label htmlFor="price">月額料金（円）</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                placeholder="例: 9800"
              />
            </div>
            <div>
              <Label htmlFor="ticket_count">月間チケット枚数</Label>
              <Input
                id="ticket_count"
                type="number"
                value={formData.ticket_count}
                onChange={(e) => setFormData({ ...formData, ticket_count: parseInt(e.target.value) || 1 })}
                min={1}
              />
            </div>
            <div>
              <Label htmlFor="description">説明（任意）</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="プランの説明を入力"
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
              {modalMode === 'create' ? '作成' : '更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={modalMode === 'delete'} onOpenChange={closeModal}>
        <DialogContent onClose={closeModal}>
          <DialogHeader>
            <DialogTitle>プラン削除の確認</DialogTitle>
            <DialogDescription>
              「{selectedPlan?.name}」を削除してよろしいですか？この操作は取り消せません。
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
    </div>
  );
}
