'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { Download } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  barcode: string | null;
  description: string | null;
  category: string | null;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string | null;
  is_active: boolean;
  is_ec_visible: boolean;
}

interface Store {
  id: number;
  name: string;
}

interface StoreStock {
  id: number;
  store_id: number;
  product_id: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  store: Store;
}

interface PaginatedResponse {
  data: Product[];
  current_page: number;
  last_page: number;
  total: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // モーダル状態
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [showStockDetailModal, setShowStockDetailModal] = useState(false);
  const [selectedProductStocks, setSelectedProductStocks] = useState<StoreStock[]>([]);
  const [selectedProductForStocks, setSelectedProductForStocks] = useState<Product | null>(null);

  // フォーム
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    description: '',
    category: '',
    price: '',
    stock_quantity: '',
    low_stock_threshold: '10',
    is_active: true,
    is_ec_visible: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 在庫調整
  const [adjustment, setAdjustment] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustStoreId, setAdjustStoreId] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(false);

  const fetchProducts = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedStoreId) params.append('store_id', selectedStoreId);
      if (filterLowStock && selectedStoreId) params.append('low_stock', 'true');

      const response = await apiClient.get<PaginatedResponse>(`/admin/products?${params}`);
      setProducts(response.data.data);
      setPagination({
        current: response.data.current_page,
        last: response.data.last_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedStoreId, filterLowStock]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get<string[]>('/admin/products/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await apiClient.get<{ stores: Store[] }>('/admin/products/stores');
      setStores(response.data.stores);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchStores();
  }, [fetchProducts]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: '',
      description: '',
      category: '',
      price: '',
      stock_quantity: '',
      low_stock_threshold: '10',
      is_active: true,
      is_ec_visible: true,
    });
    setImageFile(null);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode || '',
      description: product.description || '',
      category: product.category || '',
      price: product.price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      low_stock_threshold: product.low_stock_threshold.toString(),
      is_active: product.is_active,
      is_ec_visible: product.is_ec_visible,
    });
    setImageFile(null);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      alert('商品名と価格は必須です');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      if (formData.barcode) data.append('barcode', formData.barcode);
      if (formData.description) data.append('description', formData.description);
      if (formData.category) data.append('category', formData.category);
      data.append('price', formData.price);
      data.append('stock_quantity', formData.stock_quantity || '0');
      data.append('low_stock_threshold', formData.low_stock_threshold || '10');
      data.append('is_active', formData.is_active ? '1' : '0');
      data.append('is_ec_visible', formData.is_ec_visible ? '1' : '0');
      if (imageFile) data.append('image', imageFile);

      if (editingProduct) {
        // 更新
        data.append('_method', 'PUT');
        await apiClient.post(`/admin/products/${editingProduct.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // 新規作成
        await apiClient.post('/admin/products', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setShowModal(false);
      fetchProducts(pagination.current);
      fetchCategories();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    if (!selectedStoreId) {
      alert('店舗を選択してからステータスを変更してください');
      return;
    }

    const newStatus = !product.is_active;
    const storeName = stores.find(s => s.id.toString() === selectedStoreId)?.name;
    const action = newStatus ? '有効' : '無効';
    if (!confirm(`${storeName}で「${product.name}」を${action}にしますか？`)) return;

    try {
      await apiClient.post(`/admin/products/${product.id}/stocks/${selectedStoreId}/toggle-status`);
      fetchProducts(pagination.current);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'ステータス変更に失敗しました');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const openAdjustModal = (product: Product) => {
    setSelectedProductForAdjust(product);
    setAdjustment('');
    setAdjustmentReason('');
    setAdjustStoreId(selectedStoreId || (stores.length > 0 ? stores[0].id.toString() : ''));
    setShowAdjustModal(true);
  };

  const openStockDetailModal = async (product: Product) => {
    setSelectedProductForStocks(product);
    try {
      const response = await apiClient.get<{ stocks: StoreStock[] }>(`/admin/products/${product.id}/stocks`);
      setSelectedProductStocks(response.data.stocks);
      setShowStockDetailModal(true);
    } catch (error) {
      console.error('Failed to fetch product stocks:', error);
      alert('在庫情報の取得に失敗しました');
    }
  };

  const handleAdjust = async () => {
    if (!selectedProductForAdjust || !adjustment || !adjustStoreId) {
      alert('店舗を選択してください');
      return;
    }

    setIsAdjusting(true);
    try {
      await apiClient.post(`/admin/products/${selectedProductForAdjust.id}/adjust-stock`, {
        store_id: parseInt(adjustStoreId),
        adjustment: parseInt(adjustment),
        reason: adjustmentReason || null,
      });
      setShowAdjustModal(false);
      fetchProducts(pagination.current);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '在庫調整に失敗しました');
    } finally {
      setIsAdjusting(false);
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) {
      return { label: '在庫切れ', color: 'bg-red-100 text-red-800' };
    }
    if (product.stock_quantity <= product.low_stock_threshold) {
      return { label: '低在庫', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: '正常', color: 'bg-green-100 text-green-800' };
  };

  const lowStockCount = products.filter(p => p.stock_quantity <= p.low_stock_threshold).length;
  const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (selectedStoreId) params.append('store_id', selectedStoreId);
    params.append('encoding', 'utf8');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    window.open(`${apiUrl}/admin/products/export/stock?${params}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />
            在庫CSV出力
          </Button>
          <Button onClick={openCreateModal}>
            + 商品を追加
          </Button>
        </div>
      </div>

      {/* 在庫サマリー */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">総商品数</p>
            <p className="text-3xl font-bold">{pagination.total}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-700">低在庫アラート</p>
            <p className="text-3xl font-bold text-yellow-700">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">在庫切れ</p>
            <p className="text-3xl font-bold text-red-700">{outOfStockCount}</p>
          </CardContent>
        </Card>
      </div>

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
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">全店舗合計</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
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
                disabled={!selectedStoreId}
                className="rounded"
              />
              <span className={`text-sm ${!selectedStoreId ? 'text-gray-400' : ''}`}>低在庫のみ</span>
            </label>
            <Button type="submit">検索</Button>
          </form>
        </CardContent>
      </Card>

      {/* 商品一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>
            商品一覧 ({pagination.total}件)
            {selectedStoreId && stores.find(s => s.id.toString() === selectedStoreId) && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                - {stores.find(s => s.id.toString() === selectedStoreId)?.name}の在庫
              </span>
            )}
            {!selectedStoreId && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                - 全店舗の在庫合計
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : products.length === 0 ? (
            <p className="text-gray-500 text-center py-8">商品がありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">商品</th>
                    <th className="text-left py-3 px-2">カテゴリ</th>
                    <th className="text-right py-3 px-2">価格</th>
                    <th className="text-right py-3 px-2">在庫</th>
                    <th className="text-center py-3 px-2">在庫状態</th>
                    <th className="text-center py-3 px-2">販売</th>
                    <th className="text-right py-3 px-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.barcode && (
                                <p className="text-xs text-gray-500">{product.barcode}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600">
                          {product.category || '-'}
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          &yen;{product.price.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => openStockDetailModal(product)}
                            className={`hover:underline ${product.stock_quantity <= product.low_stock_threshold ? 'text-red-600 font-medium' : ''}`}
                          >
                            {product.stock_quantity}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${stockStatus.color}`}>
                            {stockStatus.label}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {product.is_active ? '有効' : '無効'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right space-x-1">
                          <Button variant="outline" size="sm" onClick={() => openAdjustModal(product)}>
                            在庫調整
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(product)}>
                            編集
                          </Button>
                          {selectedStoreId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={product.is_active ? 'text-orange-600' : 'text-green-600'}
                              onClick={() => handleToggleStatus(product)}
                            >
                              {product.is_active ? '無効にする' : '有効にする'}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600"
                              onClick={() => openStockDetailModal(product)}
                            >
                              詳細
                            </Button>
                          )}
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
                onClick={() => fetchProducts(pagination.current - 1)}
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
                onClick={() => fetchProducts(pagination.current + 1)}
              >
                次へ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 商品編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
          <Card className="w-[600px] max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>{editingProduct ? '商品を編集' : '商品を追加'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium">商品名 *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">バーコード</label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">カテゴリ</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="例: ケース, 充電器, 保護フィルム"
                    className="mt-1"
                    list="category-list"
                  />
                  <datalist id="category-list">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-sm font-medium">価格 *</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="mt-1"
                  />
                </div>
                {!editingProduct && (
                  <>
                    <div>
                      <label className="text-sm font-medium">初期在庫数（全店舗）</label>
                      <Input
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">低在庫閾値</label>
                      <Input
                        type="number"
                        value={formData.low_stock_threshold}
                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <label className="text-sm font-medium">説明</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">商品画像</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                  {editingProduct?.image_url && !imageFile && (
                    <p className="text-sm text-gray-500 mt-1">現在の画像: {editingProduct.image_url}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">有効</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_ec_visible}
                      onChange={(e) => setFormData({ ...formData, is_ec_visible: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">ECに公開</span>
                  </label>
                </div>
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

      {/* 在庫調整モーダル */}
      {showAdjustModal && selectedProductForAdjust && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>在庫調整</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedProductForAdjust.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium">店舗 *</label>
                <select
                  value={adjustStoreId}
                  onChange={(e) => setAdjustStoreId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  <option value="">店舗を選択</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">調整数量</label>
                <p className="text-xs text-gray-500 mb-1">入荷:正の数、ロス/出庫:負の数</p>
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

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAdjustModal(false)} className="flex-1">
                  キャンセル
                </Button>
                <Button
                  onClick={handleAdjust}
                  disabled={isAdjusting || !adjustment || !adjustStoreId}
                  className="flex-1"
                >
                  {isAdjusting ? '処理中...' : '調整を実行'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 店舗別在庫詳細モーダル */}
      {showStockDetailModal && selectedProductForStocks && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px] max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>店舗別在庫・ステータス - {selectedProductForStocks.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedProductStocks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">在庫情報がありません</p>
              ) : (
                <div className="space-y-2">
                  {selectedProductStocks.map((stock) => (
                    <div
                      key={stock.id}
                      className={`p-4 rounded-lg border ${
                        !stock.is_active
                          ? 'bg-gray-100 border-gray-300'
                          : stock.stock_quantity === 0
                          ? 'bg-red-50 border-red-200'
                          : stock.stock_quantity <= stock.low_stock_threshold
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{stock.store.name}</p>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              stock.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {stock.is_active ? '有効' : '無効'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">在庫: {stock.stock_quantity} / 閾値: {stock.low_stock_threshold}</p>
                        </div>
                        <div className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={stock.is_active ? 'text-orange-600' : 'text-green-600'}
                            onClick={async () => {
                              try {
                                await apiClient.post(`/admin/products/${selectedProductForStocks.id}/stocks/${stock.store_id}/toggle-status`);
                                // Refresh stock data
                                const response = await apiClient.get<{ stocks: StoreStock[] }>(`/admin/products/${selectedProductForStocks.id}/stocks`);
                                setSelectedProductStocks(response.data.stocks);
                                fetchProducts(pagination.current);
                              } catch (error: unknown) {
                                const err = error as { response?: { data?: { message?: string } } };
                                alert(err.response?.data?.message || 'ステータス変更に失敗しました');
                              }
                            }}
                          >
                            {stock.is_active ? '無効にする' : '有効にする'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">全店舗合計（有効店舗のみ）</p>
                      <p className="text-xl font-bold">
                        {selectedProductStocks.filter(s => s.is_active).reduce((sum, s) => sum + s.stock_quantity, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-6">
                <Button variant="outline" onClick={() => setShowStockDetailModal(false)} className="w-full">
                  閉じる
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
