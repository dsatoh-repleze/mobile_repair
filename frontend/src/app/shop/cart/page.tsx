'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ticketsApi } from '@/lib/api/tickets';
import { apiClient } from '@/lib/api/client';
import { isAuthenticated } from '@/lib/auth/hooks';
import { ShoppingCart, Smartphone, ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';

interface CartProduct {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  category?: string;
  image_url?: string;
}

interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface StaffOption {
  id: number;
  name: string;
  store_id: number | null;
}

type PaymentMethod = 'credit' | 'qr';

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffOption | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{
    id: number;
    receipt_uuid: string;
    total_amount: number;
  } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // スタッフ一覧を取得
  const fetchStaffs = useCallback(async (storeIdParam?: number) => {
    try {
      const params = storeIdParam ? { store_id: storeIdParam } : {};
      const res = await apiClient.get('/shop/staffs', { params });
      setStaffOptions(res.data.staffs || []);
    } catch (error) {
      console.error('Failed to fetch staffs:', error);
    }
  }, []);

  // カートをローカルストレージから読み込む
  useEffect(() => {
    setIsLoggedIn(isAuthenticated());

    const savedCart = localStorage.getItem('shop_cart');
    const savedStoreId = localStorage.getItem('shop_store_id');

    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch {
        setCartItems([]);
      }
    }

    if (savedStoreId) {
      const parsedStoreId = parseInt(savedStoreId);
      setStoreId(parsedStoreId);
      fetchStaffs(parsedStoreId);
    } else {
      fetchStaffs();
    }

    setLoading(false);
  }, [fetchStaffs]);

  // カートをローカルストレージに保存
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('shop_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, loading]);

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setCartItems(prev =>
        prev.map(item =>
          item.product.id === productId
            ? { ...item, quantity: Math.min(quantity, item.product.stock_quantity) }
            : item
        )
      );
    }
  };

  const removeItem = (productId: number) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = Math.floor(subtotal * 0.1 / 1.1); // 内税
  const total = subtotal;

  // スタッフ検索フィルタ
  const filteredStaffs = staffOptions.filter(staff =>
    staff.name.toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  const handleCheckout = () => {
    if (!isLoggedIn) {
      router.push('/member/login?redirect=/shop/cart');
      return;
    }
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!storeId) {
      alert('店舗が選択されていません。ショップページに戻って店舗を選択してください。');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await ticketsApi.createEcOrder({
        store_id: storeId,
        items: cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
        staff_code: selectedStaff ? String(selectedStaff.id) : undefined,
        coupon_code: couponCode || undefined,
      });

      setCompletedOrder({
        id: response.data.order.id,
        receipt_uuid: response.data.order.receipt_uuid,
        total_amount: response.data.order.total_amount,
      });
      setShowPaymentModal(false);
      setOrderComplete(true);

      // カートをクリア
      setCartItems([]);
      localStorage.removeItem('shop_cart');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '注文処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (orderComplete && completedOrder) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4">ご注文ありがとうございます</h1>
          <p className="text-gray-600 mb-2">注文番号: #{completedOrder.id}</p>
          <p className="text-2xl font-bold text-blue-600 mb-8">
            &yen;{completedOrder.total_amount.toLocaleString()}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href={`/receipt/${completedOrder.receipt_uuid}`} target="_blank">
              <Button variant="outline">Web明細を見る</Button>
            </Link>
            <Link href="/shop/purchases">
              <Button variant="outline">購入履歴を見る</Button>
            </Link>
            <Link href="/shop">
              <Button>買い物を続ける</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/shop" className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">ショップに戻る</span>
            </Link>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <span className="font-bold text-gray-900">カート</span>
            </div>
            <div className="w-24" />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">ショッピングカート</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-20 h-20 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-6">カートに商品がありません</p>
            <Link href="/shop">
              <Button>商品を探す</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カート内容 */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map(item => (
                <div
                  key={item.product.id}
                  className="bg-white rounded-lg shadow-sm border p-4 flex gap-4"
                >
                  <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover rounded" />
                    ) : (
                      <Smartphone className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-blue-600 font-medium">{item.product.category}</p>
                    <h3 className="font-medium">{item.product.name}</h3>
                    <p className="text-blue-600 font-bold">&yen;{item.product.price.toLocaleString()}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock_quantity}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="ml-auto text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">&yen;{(item.product.price * item.quantity).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 注文サマリー */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>ご注文内容</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>小計（税込）</span>
                    <span>&yen;{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>（内消費税）</span>
                    <span>&yen;{tax.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">担当スタッフ（任意）</label>
                      {selectedStaff ? (
                        <div className="mt-1 flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="font-medium text-green-900">{selectedStaff.name}</p>
                          <button
                            onClick={() => setSelectedStaff(null)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowStaffModal(true)}
                          className="mt-1 w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-left text-gray-500 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          スタッフを選択...
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">クーポンコード（任意）</label>
                      <Input
                        placeholder="クーポンコードを入力"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>合計</span>
                      <span className="text-blue-600">&yen;{total.toLocaleString()}</span>
                    </div>
                  </div>

                  {!isLoggedIn && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      購入にはログインが必要です
                    </div>
                  )}

                  <Button onClick={handleCheckout} className="w-full" size="lg">
                    {isLoggedIn ? '購入手続きへ' : 'ログインして購入'}
                  </Button>
                  <Link href="/shop" className="block">
                    <Button variant="ghost" className="w-full">
                      買い物を続ける
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* 決済モーダル */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[450px] max-w-[95vw]">
            <CardHeader>
              <CardTitle>お支払い方法</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 合計 */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">お支払い金額</p>
                <p className="text-3xl font-bold text-blue-600">&yen;{total.toLocaleString()}</p>
              </div>

              {/* 決済方法選択 */}
              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod('credit')}
                  className={`w-full p-4 rounded-lg border-2 flex items-center gap-4 transition-all ${
                    paymentMethod === 'credit' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium">クレジットカード</p>
                    <p className="text-sm text-gray-500">VISA / MasterCard / JCB</p>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod('qr')}
                  className={`w-full p-4 rounded-lg border-2 flex items-center gap-4 transition-all ${
                    paymentMethod === 'qr' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium">QRコード決済</p>
                    <p className="text-sm text-gray-500">PayPay / LINE Pay / 楽天Pay</p>
                  </div>
                </button>
              </div>

              {/* クレジットカード入力（モック） */}
              {paymentMethod === 'credit' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm text-gray-600">カード番号</label>
                    <Input placeholder="0000 0000 0000 0000" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">有効期限</label>
                      <Input placeholder="MM/YY" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">セキュリティコード</label>
                      <Input placeholder="000" className="mt-1" />
                    </div>
                  </div>
                </div>
              )}

              {/* QR決済（モック） */}
              {paymentMethod === 'qr' && (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    決済アプリを起動して、下のボタンを押してください
                  </p>
                  <div className="flex justify-center gap-2">
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">PayPay</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">LINE Pay</span>
                    <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded text-sm">楽天Pay</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={processPayment}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      処理中...
                    </>
                  ) : (
                    '支払う'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* スタッフ選択モーダル */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <Card className="w-[90vw] md:w-[50vw] h-[50vh] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle>スタッフを選択</CardTitle>
                <button
                  onClick={() => {
                    setShowStaffModal(false);
                    setStaffSearchQuery('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <Input
                placeholder="名前で検索..."
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                className="mt-3"
              />
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4">
              {filteredStaffs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">スタッフが見つかりません</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredStaffs.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => {
                        setSelectedStaff(staff);
                        setShowStaffModal(false);
                        setStaffSearchQuery('');
                      }}
                      className="p-4 bg-white border rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-center"
                    >
                      <p className="font-medium truncate">{staff.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
