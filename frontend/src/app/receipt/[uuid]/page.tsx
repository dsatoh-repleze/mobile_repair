'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Receipt {
  store_name: string;
  store_address: string;
  order_id: number;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  received_amount: number | null;
  change_amount: number | null;
  staff_name: string;
}

export default function ReceiptPage() {
  const params = useParams();
  const uuid = params.uuid as string;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const response = await apiClient.get(`/receipt/${uuid}`);
        setReceipt(response.data.receipt);
      } catch {
        setError('レシートが見つかりません');
      } finally {
        setIsLoading(false);
      }
    };

    if (uuid) {
      fetchReceipt();
    }
  }, [uuid]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h1 className="text-xl font-semibold text-gray-700">{error || 'レシートが見つかりません'}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-sm mx-auto">
        {/* レシート本体 */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-slate-800 text-white p-6 text-center">
            <h1 className="text-xl font-bold">{receipt.store_name}</h1>
            {receipt.store_address && (
              <p className="text-sm text-slate-300 mt-1">{receipt.store_address}</p>
            )}
          </div>

          {/* 日時・番号 */}
          <div className="p-4 border-b border-dashed border-gray-300 text-center">
            <p className="text-sm text-gray-500">領収書</p>
            <p className="font-medium">{receipt.date}</p>
            <p className="text-xs text-gray-400">No. {receipt.order_id}</p>
          </div>

          {/* 商品明細 */}
          <div className="p-4 border-b border-dashed border-gray-300">
            <table className="w-full">
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={index} className="text-sm">
                    <td className="py-1">
                      <p>{item.name}</p>
                      <p className="text-xs text-gray-500">
                        &yen;{item.unit_price.toLocaleString()} x {item.quantity}
                      </p>
                    </td>
                    <td className="py-1 text-right">&yen;{item.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 合計 */}
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>小計</span>
              <span>&yen;{receipt.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>消費税</span>
              <span>&yen;{receipt.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>合計</span>
              <span>&yen;{receipt.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>お支払い方法</span>
              <span>{receipt.payment_method}</span>
            </div>
            {receipt.received_amount && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>お預かり</span>
                <span>&yen;{receipt.received_amount.toLocaleString()}</span>
              </div>
            )}
            {receipt.change_amount !== null && receipt.change_amount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>お釣り</span>
                <span>&yen;{receipt.change_amount.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* 担当者 */}
          <div className="p-4 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>担当: {receipt.staff_name}</p>
          </div>

          {/* フッター */}
          <div className="bg-gray-50 p-4 text-center">
            <p className="text-xs text-gray-400">
              ご利用ありがとうございました
            </p>
          </div>
        </div>

        {/* 注意書き */}
        <p className="text-xs text-center text-gray-400 mt-4">
          このレシートはデジタルコピーです
        </p>
      </div>
    </div>
  );
}
