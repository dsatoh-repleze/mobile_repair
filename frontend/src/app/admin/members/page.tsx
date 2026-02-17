'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface Subscription {
  id: number;
  status: string;
  plan: {
    id: number;
    name: string;
  } | null;
}

interface Member {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  tickets_count: number;
  subscriptions_count: number;
  subscriptions?: Subscription[];
  created_at: string;
}

interface PaginatedResponse {
  data: Member[];
  current_page: number;
  last_page: number;
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  active: '有効',
  inactive: '無効',
  suspended: '停止',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  suspended: 'bg-red-100 text-red-800',
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMembers = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (filterStatus) params.append('status', filterStatus);

      const response = await apiClient.get<PaginatedResponse>(`/admin/members?${params}`);
      setMembers(response.data.data);
      setPagination({
        current: response.data.current_page,
        last: response.data.last_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterStatus]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      status: member.status,
      password: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!editingMember) return;
    if (!formData.name || !formData.email) {
      alert('名前、メールアドレスは必須です');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        status: formData.status,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      await apiClient.put(`/admin/members/${editingMember.id}`, payload);
      setShowModal(false);
      fetchMembers(pagination.current);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (member: Member) => {
    if (!confirm(`「${member.name}」を削除しますか？この操作は取り消せません。`)) return;

    try {
      await apiClient.delete(`/admin/members/${member.id}`);
      fetchMembers(pagination.current);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '削除に失敗しました');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">会員管理</h1>
      </div>

      {/* Search / Filter */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
            <Input
              placeholder="名前・メールアドレス・電話番号で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">すべてのステータス</option>
              <option value="active">有効</option>
              <option value="inactive">無効</option>
              <option value="suspended">停止</option>
            </select>
            <Button type="submit">検索</Button>
          </form>
        </CardContent>
      </Card>

      {/* Member List */}
      <Card>
        <CardHeader>
          <CardTitle>会員一覧 ({pagination.total}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : members.length === 0 ? (
            <p className="text-gray-500 text-center py-8">会員がいません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">ID</th>
                    <th className="text-left py-3 px-2">名前</th>
                    <th className="text-left py-3 px-2">メールアドレス</th>
                    <th className="text-left py-3 px-2">電話番号</th>
                    <th className="text-center py-3 px-2">ステータス</th>
                    <th className="text-center py-3 px-2">チケット</th>
                    <th className="text-center py-3 px-2">契約</th>
                    <th className="text-left py-3 px-2">登録日</th>
                    <th className="text-right py-3 px-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-600">{member.id}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{member.email}</td>
                      <td className="py-3 px-2 text-gray-600">{member.phone || '-'}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[member.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[member.status] || member.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-600">{member.tickets_count}</td>
                      <td className="py-3 px-2 text-center text-gray-600">{member.subscriptions_count}</td>
                      <td className="py-3 px-2 text-gray-600 text-sm">{formatDate(member.created_at)}</td>
                      <td className="py-3 px-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(member)}>
                          編集
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(member)}>
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
                onClick={() => fetchMembers(pagination.current - 1)}
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
                onClick={() => fetchMembers(pagination.current + 1)}
              >
                次へ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showModal && editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px]">
            <CardHeader>
              <CardTitle>会員を編集</CardTitle>
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
                <label className="text-sm font-medium">電話番号</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">ステータス *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'suspended' })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  <option value="active">有効</option>
                  <option value="inactive">無効</option>
                  <option value="suspended">停止</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  パスワード（変更する場合のみ入力）
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="mt-1"
                />
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
