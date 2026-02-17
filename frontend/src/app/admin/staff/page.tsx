'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface Store {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  name: string;
  email: string;
  store_id: number;
  role: 'admin' | 'manager' | 'staff';
  store: Store | null;
  created_at: string;
}

interface PaginatedResponse {
  data: Staff[];
  current_page: number;
  last_page: number;
  total: number;
}

const ROLE_LABELS: Record<string, string> = {
  admin: '管理者',
  manager: '店長',
  staff: 'スタッフ',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-purple-100 text-purple-800',
  staff: 'bg-blue-100 text-blue-800',
};

export default function StaffPage() {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStoreId, setFilterStoreId] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    store_id: '',
    role: 'staff' as 'admin' | 'manager' | 'staff',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaffs = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (filterStoreId) params.append('store_id', filterStoreId);
      if (filterRole) params.append('role', filterRole);

      const response = await apiClient.get<PaginatedResponse>(`/admin/staffs?${params}`);
      setStaffs(response.data.data);
      setPagination({
        current: response.data.current_page,
        last: response.data.last_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Failed to fetch staffs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterStoreId, filterRole]);

  const fetchStores = async () => {
    try {
      const response = await apiClient.get<{ stores: Store[] }>('/admin/staffs/stores');
      setStores(response.data.stores);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  useEffect(() => {
    fetchStaffs();
    fetchStores();
  }, [fetchStaffs]);

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      store_id: stores.length > 0 ? stores[0].id.toString() : '',
      role: 'staff',
    });
    setShowModal(true);
  };

  const openEditModal = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      password: '',
      store_id: staff.store_id.toString(),
      role: staff.role,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.store_id) {
      alert('名前、メールアドレス、所属店舗は必須です');
      return;
    }
    if (!editingStaff && !formData.password) {
      alert('パスワードは必須です');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        store_id: parseInt(formData.store_id),
        role: formData.role,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingStaff) {
        await apiClient.put(`/admin/staffs/${editingStaff.id}`, payload);
      } else {
        await apiClient.post('/admin/staffs', payload);
      }

      setShowModal(false);
      fetchStaffs(pagination.current);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (staff: Staff) => {
    if (!confirm(`「${staff.name}」を削除しますか？`)) return;

    try {
      await apiClient.delete(`/admin/staffs/${staff.id}`);
      fetchStaffs(pagination.current);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '削除に失敗しました');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStaffs(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">スタッフ管理</h1>
        <Button onClick={openCreateModal}>
          + スタッフを追加
        </Button>
      </div>

      {/* Search / Filter */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
            <Input
              placeholder="名前・メールアドレスで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <select
              value={filterStoreId}
              onChange={(e) => setFilterStoreId(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">すべての店舗</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">すべての権限</option>
              <option value="admin">管理者</option>
              <option value="manager">店長</option>
              <option value="staff">スタッフ</option>
            </select>
            <Button type="submit">検索</Button>
          </form>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>スタッフ一覧 ({pagination.total}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : staffs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">スタッフがいません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">名前</th>
                    <th className="text-left py-3 px-2">メールアドレス</th>
                    <th className="text-left py-3 px-2">所属店舗</th>
                    <th className="text-center py-3 px-2">権限</th>
                    <th className="text-left py-3 px-2">登録日</th>
                    <th className="text-right py-3 px-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {staffs.map((staff) => (
                    <tr key={staff.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{staff.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{staff.email}</td>
                      <td className="py-3 px-2 text-gray-600">{staff.store?.name || '-'}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${ROLE_COLORS[staff.role] || 'bg-gray-100 text-gray-600'}`}>
                          {ROLE_LABELS[staff.role] || staff.role}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-600 text-sm">{formatDate(staff.created_at)}</td>
                      <td className="py-3 px-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(staff)}>
                          編集
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(staff)}>
                          削除
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.last > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current === 1}
                onClick={() => fetchStaffs(pagination.current - 1)}
              >
                前へ
              </Button>
              <span className="px-4 py-2 text-sm">
                {pagination.current} / {pagination.last}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current === pagination.last}
                onClick={() => fetchStaffs(pagination.current + 1)}
              >
                次へ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px]">
            <CardHeader>
              <CardTitle>{editingStaff ? 'スタッフを編集' : 'スタッフを追加'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">名前 *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">メールアドレス *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  パスワード {editingStaff ? '（変更する場合のみ入力）' : '*'}
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingStaff ? '••••••••' : ''}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">所属店舗 *</label>
                <select
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">権限 *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'staff' })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  <option value="admin">管理者</option>
                  <option value="manager">店長</option>
                  <option value="staff">スタッフ</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                  キャンセル
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? '保存中...' : '保存'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
