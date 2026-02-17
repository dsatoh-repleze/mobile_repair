'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { Download } from 'lucide-react';

interface StockItem {
  id: number;
  product_id: number;
  product_name: string;
  barcode: string | null;
  category: string | null;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_low_stock: boolean;
}

interface StockSummary {
  total: number;
  active: number;
  low_stock: number;
  out_of_stock: number;
}

interface PaginatedResponse {
  data: StockItem[];
  current_page: number;
  last_page: number;
  total: number;
}

export default function StaffStockPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // 在庫調整モーダル
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [adjustment, setAdjustment] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const fetchStocks = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      if (filterLowStock) params.append('low_stock', 'true');
      params.append('is_active', 'true');

      const response = await apiClient.get<PaginatedResponse>(`/staff/stock?${params}`);
      setStocks(response.data.data);
      setPagination({
        current: response.data.current_page,
        last: response.data.last_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Failed to fetch stocks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, filterLowStock]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get<string[]>('/staff/stock/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await apiClient.get<StockSummary>('/staff/stock/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  useEffect(() => {
    fetchStocks();
    fetchCategories();
    fetchSummary();
  }, [fetchStocks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStocks(1);
  };

  const openAdjustModal = (stock: StockItem) => {
    setSelectedStock(stock);
    setAdjustment('');
    setAdjustmentReason('');
    setShowAdjustModal(true);
  };

  const handleAdjust = async () => {
    if (!selectedStock || !adjustment) return;

    setIsAdjusting(true);
    try {
      await apiClient.post(`/staff/stock/${selectedStock.product_id}/adjust`, {
        adjustment: parseInt(adjustment),
        reason: adjustmentReason || null,
      });
      setShowAdjustModal(false);
      fetchStocks(pagination.current);
      fetchSummary();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '在庫調整に失敗しました');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleExportCsv = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    window.open(`${apiUrl}/staff/stock/export?encoding=utf8`, '_blank');
  };

  const getStockStatus = (stock: StockItem) => {
    if (stock.stock_quantity === 0) {
      return { label: '在庫切れ', color: 'bg-red-100 text-red-800' };
    }
    if (stock.is_low_stock) {
      return { label: '低在庫', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: '正常', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">在庫管理</h1>
        <Button variant="outline" onClick={handleExportCsv}>
          <Download className="w-4 h-4 mr-2" />
          CSV出力
        </Button>
      </div>

      {/* サマリー */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">総商品数</p>
              <p className="text-3xl font-bold">{summary.active}</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-700">低在庫</p>
              <p className="text-3xl font-bold text-yellow-700">{summary.low_stock}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-sm text-red-700">在庫切れ</p>
              <p className="text-3xl font-bold text-red-700">{summary.out_of_stock}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-700">合計在庫数</p>
              <p className="text-3xl font-bold text-blue-700">
                {stocks.reduce((sum, s) => sum + s.stock_quantity, 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 検索・フィルター */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4 flex-wrap items-center">
            <Input
              placeholder="商品名・バーコードで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">すべてのカテゴリ</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterLowStock}
                onChange={(e) => setFilterLowStock(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">低在庫のみ</span>
            </label>
            <Button type="submit">検索</Button>
          </form>
        </CardContent>
      </Card>

      {/* 在庫一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>在庫一覧 ({pagination.total}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : stocks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">商品がありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">商品名</th>
                    <th className="text-left py-3 px-2">バーコード</th>
                    <th className="text-left py-3 px-2">カテゴリ</th>
                    <th className="text-right py-3 px-2">価格</th>
                    <th className="text-right py-3 px-2">在庫数</th>
                    <th className="text-center py-3 px-2">状態</th>
                    <th className="text-right py-3 px-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock) => {
                    const status = getStockStatus(stock);
                    return (
                      <tr key={stock.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium">{stock.product_name}</td>
                        <td className="py-3 px-2 text-gray-600 text-sm">{stock.barcode || '-'}</td>
                        <td className="py-3 px-2 text-gray-600 text-sm">{stock.category || '-'}</td>
                        <td className="py-3 px-2 text-right">&yen;{stock.price.toLocaleString()}</td>
                        <td className={`py-3 px-2 text-right font-medium ${stock.is_low_stock ? 'text-red-600' : ''}`}>
                          {stock.stock_quantity}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => openAdjustModal(stock)}>
                            在庫調整
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ページネーション */}
          {pagination.last > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current === 1}
                onClick={() => fetchStocks(pagination.current - 1)}
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
                onClick={() => fetchStocks(pagination.current + 1)}
              >
                次へ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 在庫調整モーダル */}
      {showAdjustModal && selectedStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>在庫調整</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedStock.product_name}</p>
                <p className="text-sm text-gray-500">現在の在庫: {selectedStock.stock_quantity}</p>
              </div>

              <div>
                <label className="text-sm font-medium">調整数量</label>
                <p className="text-xs text-gray-500 mb-1">入荷:正の数、出庫/ロス:負の数</p>
                <Input
                  type="number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  placeholder="例: +10 または -5"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">理由（任意）</label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="例: 入荷、棚卸調整、破損"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                {[10, 20, 50, 100].map((qty) => (
                  <Button
                    key={qty}
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustment(qty.toString())}
                  >
                    +{qty}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                {[-1, -5, -10].map((qty) => (
                  <Button
                    key={qty}
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustment(qty.toString())}
                  >
                    {qty}
                  </Button>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAdjustModal(false)} className="flex-1">
                  キャンセル
                </Button>
                <Button
                  onClick={handleAdjust}
                  disabled={isAdjusting || !adjustment}
                  className="flex-1"
                >
                  {isAdjusting ? '処理中...' : '調整を実行'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
