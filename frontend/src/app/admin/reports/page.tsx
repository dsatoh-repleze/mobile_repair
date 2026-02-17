'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface Store {
  id: number;
  name: string;
}

interface StoreSales {
  store_id: number;
  store_name: string;
  count: number;
  amount: number;
}

interface SalesSummary {
  total_orders: number;
  total_amount: number;
  by_payment_method: {
    cash: number;
    credit: number;
    qr: number;
  };
  by_store: StoreSales[];
  daily_sales: Record<string, { count: number; amount: number }>;
  filtered_store_id: number | null;
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [stores, setStores] = useState<Store[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 店舗一覧を取得
  useEffect(() => {
    apiClient.get('/admin/reports/stores').then((response) => {
      setStores(response.data.stores || []);
    }).catch((error) => {
      console.error('Failed to fetch stores:', error);
    });
  }, []);

  const fetchSummary = async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', startDate);
      params.append('end_date', endDate);
      if (selectedStoreId) {
        params.append('store_id', selectedStoreId);
      }

      const response = await apiClient.get<SalesSummary>(`/admin/reports/sales/summary?${params}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      alert('売上データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const exportCsv = async (encoding: 'utf8' | 'sjis') => {
    if (!startDate || !endDate) return;

    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', startDate);
      params.append('end_date', endDate);
      params.append('encoding', encoding);
      if (selectedStoreId) {
        params.append('store_id', selectedStoreId);
      }

      const response = await apiClient.get(`/admin/reports/sales/export?${params}`, {
        responseType: 'blob',
      });

      // ダウンロード（DOMに追加せずにダウンロードを実行）
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales_report_${startDate}_${endDate}.csv`;
      link.style.display = 'none';
      link.click();
      // クリーンアップを遅延させてReactのレンダリングとの競合を防ぐ
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('CSVのダウンロードに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">売上レポート</h1>
      </div>

      {/* 期間・店舗選択 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="text-sm font-medium">開始日</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">終了日</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">店舗</label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="mt-1 w-48 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全店舗</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={fetchSummary} disabled={isLoading}>
              {isLoading ? '読込中...' : '集計する'}
            </Button>
            <div className="flex-1"></div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => exportCsv('utf8')}
                disabled={isExporting || !summary}
              >
                {isExporting ? 'ダウンロード中...' : 'CSV (UTF-8)'}
              </Button>
              <Button
                variant="outline"
                onClick={() => exportCsv('sjis')}
                disabled={isExporting || !summary}
              >
                CSV (Shift-JIS)
              </Button>
            </div>
          </div>

          {/* クイック選択 */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date();
                setStartDate(today.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
              }}
            >
              今日
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date();
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                setStartDate(weekAgo.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
              }}
            >
              過去7日
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(firstDay.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
              }}
            >
              今月
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                setStartDate(firstDay.toISOString().split('T')[0]);
                setEndDate(lastDay.toISOString().split('T')[0]);
              }}
            >
              先月
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <>
          {/* フィルター表示 */}
          {summary.filtered_store_id === null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-blue-700 text-sm">
              全店舗の売上を表示しています
            </div>
          )}

          {/* サマリーカード */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">総売上</p>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(summary.total_amount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">取引件数</p>
                <p className="text-3xl font-bold">{summary.total_orders}件</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">平均取引額</p>
                <p className="text-3xl font-bold">
                  {summary.total_orders > 0
                    ? formatCurrency(Math.floor(summary.total_amount / summary.total_orders))
                    : '¥0'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">日平均売上</p>
                <p className="text-3xl font-bold">
                  {Object.keys(summary.daily_sales).length > 0
                    ? formatCurrency(Math.floor(summary.total_amount / Object.keys(summary.daily_sales).length))
                    : '¥0'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 店舗別売上（全店舗表示時のみ） */}
          {summary.filtered_store_id === null && summary.by_store.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>店舗別売上</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">店舗名</th>
                        <th className="text-right py-3 px-2">取引件数</th>
                        <th className="text-right py-3 px-2">売上金額</th>
                        <th className="text-right py-3 px-2">平均単価</th>
                        <th className="py-3 px-2">構成比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.by_store
                        .sort((a, b) => b.amount - a.amount)
                        .map((store) => (
                          <tr key={store.store_id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-2 font-medium">{store.store_name}</td>
                            <td className="py-3 px-2 text-right">{store.count}件</td>
                            <td className="py-3 px-2 text-right font-medium text-blue-600">
                              {formatCurrency(store.amount)}
                            </td>
                            <td className="py-3 px-2 text-right text-gray-600">
                              {store.count > 0 ? formatCurrency(Math.floor(store.amount / store.count)) : '¥0'}
                            </td>
                            <td className="py-3 px-2 w-48">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{
                                      width: `${summary.total_amount > 0 ? (store.amount / summary.total_amount) * 100 : 0}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-600 w-12 text-right">
                                  {summary.total_amount > 0
                                    ? Math.round((store.amount / summary.total_amount) * 100)
                                    : 0}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td className="py-3 px-2">合計</td>
                        <td className="py-3 px-2 text-right">{summary.total_orders}件</td>
                        <td className="py-3 px-2 text-right text-blue-600">{formatCurrency(summary.total_amount)}</td>
                        <td className="py-3 px-2 text-right">
                          {summary.total_orders > 0
                            ? formatCurrency(Math.floor(summary.total_amount / summary.total_orders))
                            : '¥0'}
                        </td>
                        <td className="py-3 px-2">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 決済方法別 */}
          <Card>
            <CardHeader>
              <CardTitle>決済方法別売上</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">現金</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.by_payment_method.cash)}</p>
                  <p className="text-sm text-green-600">
                    {summary.total_amount > 0
                      ? Math.round((summary.by_payment_method.cash / summary.total_amount) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">クレジットカード</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(summary.by_payment_method.credit)}</p>
                  <p className="text-sm text-blue-600">
                    {summary.total_amount > 0
                      ? Math.round((summary.by_payment_method.credit / summary.total_amount) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-700">QR決済</p>
                  <p className="text-2xl font-bold text-purple-700">{formatCurrency(summary.by_payment_method.qr)}</p>
                  <p className="text-sm text-purple-600">
                    {summary.total_amount > 0
                      ? Math.round((summary.by_payment_method.qr / summary.total_amount) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 日別売上 */}
          <Card>
            <CardHeader>
              <CardTitle>日別売上</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(summary.daily_sales).length === 0 ? (
                <p className="text-gray-500 text-center py-8">データがありません</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">日付</th>
                        <th className="text-right py-3 px-2">取引件数</th>
                        <th className="text-right py-3 px-2">売上金額</th>
                        <th className="text-right py-3 px-2">平均単価</th>
                        <th className="py-3 px-2">構成比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(summary.daily_sales)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([date, data]) => (
                          <tr key={date} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-2 font-medium">{formatDate(date)}</td>
                            <td className="py-3 px-2 text-right">{data.count}件</td>
                            <td className="py-3 px-2 text-right font-medium">{formatCurrency(data.amount)}</td>
                            <td className="py-3 px-2 text-right text-gray-600">
                              {data.count > 0 ? formatCurrency(Math.floor(data.amount / data.count)) : '¥0'}
                            </td>
                            <td className="py-3 px-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${summary.total_amount > 0 ? (data.amount / summary.total_amount) * 100 : 0}%`,
                                  }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!summary && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">売上レポートを表示</h2>
            <p className="text-gray-500">期間を選択して「集計する」をクリックしてください</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
