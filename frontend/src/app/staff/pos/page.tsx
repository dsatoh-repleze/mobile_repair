'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface Product {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  barcode?: string;
  image_url?: string;
  category?: string;
  is_low_stock?: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface SaleResponse {
  message: string;
  order: {
    id: number;
    receipt_uuid: string;
    receipt_url: string;
    total_amount: number;
    subtotal: number;
    tax: number;
    payment_method: string;
    received_amount: number | null;
    change_amount: number | null;
    items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
    staff_name: string;
    created_at: string;
  };
}

interface Member {
  id: number;
  name: string;
  email: string;
}

interface StaffOption {
  id: number;
  name: string;
  store_id: number | null;
}

type PaymentMethod = 'credit' | 'qr';

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffOption | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [receiptUuid, setReceiptUuid] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<SaleResponse['order'] | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // 商品、スタッフ、会員を取得
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsRes, staffsRes, membersRes] = await Promise.all([
        apiClient.get('/staff/pos/products'),
        apiClient.get('/shop/staffs'),
        apiClient.get('/staff/members/search', { params: { query: '' } }),
      ]);
      setProducts(productsRes.data.products || []);
      setStaffOptions(staffsRes.data.staffs || []);
      setMembers(membersRes.data.members || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.barcode?.includes(searchQuery);
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setCart(prev =>
        prev.map(item =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  const handlePayment = async () => {
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    setIsProcessing(true);

    try {
      const response = await apiClient.post<SaleResponse>('/staff/pos/sale', {
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
        member_id: selectedMember?.id || undefined,
        staff_code: selectedStaff ? String(selectedStaff.id) : undefined,
        coupon_code: couponCode || undefined,
      });

      setCompletedOrder(response.data.order);
      setReceiptUuid(response.data.order.receipt_uuid);
      setShowPaymentModal(false);
      setShowCompletedModal(true);

      // 商品データを再取得して在庫を更新
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '決済処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const finishTransaction = () => {
    setShowCompletedModal(false);
    clearCart();
    setReceiptUuid(null);
    setCompletedOrder(null);
    setSelectedStaff(null);
    setCouponCode('');
    setSelectedMember(null);
    setMemberSearchQuery('');
  };

  // スタッフ検索フィルタ
  const filteredStaffs = staffOptions.filter(staff =>
    staff.name.toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  // 会員検索フィルタ
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  // バーコードスキャン対応（キーボード入力検知）
  useEffect(() => {
    let buffer = '';
    let timeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // 入力フィールドにフォーカスがある場合は無視
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Enter キーでバーコード確定
      if (e.key === 'Enter' && buffer.length > 3) {
        const product = products.find(p => p.barcode === buffer);
        if (product) {
          addToCart(product);
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          buffer = '';
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeout);
    };
  }, [products, addToCart]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3rem)] flex gap-4">
      {/* 左側: 商品選択エリア */}
      <div className="flex-1 flex flex-col">
        {/* 検索・カテゴリ */}
        <div className="mb-4 flex gap-4">
          <Input
            placeholder="商品名・バーコードで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(null)}
              size="sm"
            >
              すべて
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat || null)}
                size="sm"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* 商品グリッド */}
        <div className="flex-1 overflow-auto">
          {products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              商品がありません
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-4 bg-white border rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left"
                >
                  <div className="aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-md" />
                    ) : (
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-blue-600 font-bold">&yen;{product.price.toLocaleString()}</p>
                  <p className={`text-xs ${product.is_low_stock ? 'text-red-500' : 'text-gray-500'}`}>
                    在庫: {product.stock_quantity}
                    {product.is_low_stock && ' (残少)'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右側: カート・会計エリア */}
      <div className="w-96 flex flex-col bg-white rounded-lg shadow-sm border">
        {/* カート */}
        <div className="flex-1 overflow-auto p-4">
          <h2 className="font-bold text-lg mb-3">カート</h2>
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">商品を選択してください</p>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <p className="text-blue-600">&yen;{item.product.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 合計・支払い */}
        <div className="border-t p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span>小計</span>
            <span>&yen;{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>消費税 (10%)</span>
            <span>&yen;{tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xl font-bold border-t pt-3">
            <span>合計</span>
            <span className="text-blue-600">&yen;{total.toLocaleString()}</span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="flex-1"
            >
              クリア
            </Button>
            <Button
              onClick={handlePayment}
              disabled={cart.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              会計へ
            </Button>
          </div>
        </div>
      </div>

      {/* 支払いモーダル */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px] max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>お支払い</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 合計表示 */}
              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">お会計金額</p>
                <p className="text-3xl font-bold text-blue-600">&yen;{total.toLocaleString()}</p>
              </div>

              {/* 会員選択 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">会員（任意）</label>
                {selectedMember ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-medium text-blue-900">{selectedMember.name}</p>
                    <button
                      onClick={() => setSelectedMember(null)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMemberModal(true)}
                    className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-left text-gray-500 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    会員を選択...
                  </button>
                )}
              </div>

              {/* スタッフ選択・クーポンコード */}
              <div className="space-y-3">
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

              {/* 支払い方法選択 */}
              <div>
                <p className="font-medium mb-3">支払い方法</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('credit')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'credit' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <p className="text-sm font-medium">クレジット</p>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('qr')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'qr' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto mb-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <p className="text-sm font-medium">QR決済</p>
                  </button>
                </div>
              </div>

              {/* クレジットの場合 */}
              {paymentMethod === 'credit' && (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-2">クレジットカードを端末にかざしてください</p>
                  <div className="flex justify-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">VISA</span>
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm">MasterCard</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">JCB</span>
                  </div>
                </div>
              )}

              {/* QR決済の場合 */}
              {paymentMethod === 'qr' && (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-2">QRコードを読み取ってください</p>
                  <div className="flex justify-center gap-2">
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm">PayPay</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">LINE Pay</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">楽天Pay</span>
                  </div>
                </div>
              )}

              {/* ボタン */}
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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
                    '決済実行'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 決済完了モーダル */}
      {showCompletedModal && completedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[400px]">
            <CardContent className="pt-6 text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-600">決済完了</h3>
                <p className="text-gray-600 mt-2">お支払いが完了しました</p>
              </div>
              <div className="py-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">お会計金額</p>
                <p className="text-2xl font-bold">&yen;{completedOrder.total_amount.toLocaleString()}</p>
              </div>

              {/* レシートQRコード */}
              {receiptUuid && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">デジタルレシート</p>
                  <div className="flex justify-center">
                    <QRCodeSVG
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/receipt/${receiptUuid}`}
                      size={128}
                      level="M"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    スマートフォンで読み取ってください
                  </p>
                </div>
              )}

              <Button onClick={finishTransaction} className="w-full">
                次のお客様へ
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* スタッフ選択モーダル */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <Card className="w-[50vw] h-[50vh] flex flex-col">
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

      {/* 会員選択モーダル */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <Card className="w-[50vw] h-[50vh] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle>会員を選択</CardTitle>
                <button
                  onClick={() => {
                    setShowMemberModal(false);
                    setMemberSearchQuery('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <Input
                placeholder="名前またはメールで検索..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="mt-3"
              />
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4">
              {filteredMembers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">会員が見つかりません</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setSelectedMember(member);
                        setShowMemberModal(false);
                        setMemberSearchQuery('');
                      }}
                      className="p-4 bg-white border rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-center"
                    >
                      <p className="font-medium truncate">{member.name}</p>
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
