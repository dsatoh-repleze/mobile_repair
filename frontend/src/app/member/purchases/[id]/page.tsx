'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingBag,
  MapPin,
  RefreshCw,
  CreditCard,
  Receipt,
  Store,
  Package,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ticketsApi, MemberOrderDetail } from '@/lib/api/tickets';
import { isAuthenticated } from '@/lib/auth/hooks';

export default function MemberPurchaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = parseInt(params.id as string);
  const [order, setOrder] = useState<MemberOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/member/login');
      return;
    }

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const response = await ticketsApi.getOrder(orderId);
        setOrder(response.data.order);
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [router, orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 text-white/30 mx-auto mb-4" />
          <p className="text-white/60 mb-4">注文が見つかりません</p>
          <Link href="/member/purchases">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              購入履歴に戻る
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/member/purchases"
              className="flex items-center gap-2 text-white/80 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">戻る</span>
            </Link>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-white" />
              <span className="font-bold text-white">購入詳細</span>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Order Summary */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <p className="text-white/60 text-sm">お支払い金額</p>
              <p className="text-3xl font-bold text-white">
                &yen;{order.total_amount.toLocaleString()}
              </p>
              <p className="text-white/60 text-sm mt-1">{order.created_at}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 text-white/60 mb-1">
                  <Store className="h-4 w-4" />
                  <span>店舗</span>
                </div>
                <p className="text-white font-medium">{order.store.name}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 text-white/60 mb-1">
                  <CreditCard className="h-4 w-4" />
                  <span>支払方法</span>
                </div>
                <p className="text-white font-medium">{order.payment_method}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              購入商品
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/10">
              {order.items.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{item.product_name}</p>
                      <p className="text-white/50 text-xs">{item.product_category}</p>
                      <p className="text-white/70 text-sm mt-1">
                        &yen;{item.unit_price.toLocaleString()} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-white font-bold ml-4">
                      &yen;{item.subtotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="border-t border-white/10 p-4 space-y-2">
              <div className="flex justify-between text-sm text-white/70">
                <span>小計</span>
                <span>&yen;{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-white/70">
                <span>消費税</span>
                <span>&yen;{order.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10">
                <span>合計</span>
                <span>&yen;{order.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff & Coupon Info */}
        {(order.staff_code || order.coupon_code) && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4 space-y-3">
              {order.staff_code && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">スタッフコード</span>
                  <span className="text-white">{order.staff_code}</span>
                </div>
              )}
              {order.coupon_code && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">クーポンコード</span>
                  <span className="text-white">{order.coupon_code}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Receipt Link */}
        <Link href={`/receipt/${order.receipt_uuid}`} target="_blank">
          <Button
            className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
            size="lg"
          >
            <FileText className="h-5 w-5 mr-2" />
            Web明細を表示
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </main>
    </div>
  );
}
