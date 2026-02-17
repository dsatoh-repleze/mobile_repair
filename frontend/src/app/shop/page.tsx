'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { shopApi, ShopProduct, ShopStore } from '@/lib/api/shop';
import { isAuthenticated } from '@/lib/auth/hooks';
import { Store, MapPin, Smartphone, RefreshCw, ShoppingCart, Check, Plus, Minus, X, User, LogIn, ShoppingBag } from 'lucide-react';

interface CartItem {
  product: ShopProduct;
  quantity: number;
}

export default function ShopPage() {
  const [stores, setStores] = useState<ShopStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // カート関連
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [addedProduct, setAddedProduct] = useState<ShopProduct | null>(null);
  const [showAddedModal, setShowAddedModal] = useState(false);

  // 認証状態
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 店舗一覧を取得
  useEffect(() => {
    // 認証状態をチェック
    setIsLoggedIn(isAuthenticated());

    const fetchStores = async () => {
      try {
        const res = await shopApi.getStores();
        setStores(res.data.stores);
        // 保存された店舗ID または 最初の店舗を選択
        const savedStoreId = localStorage.getItem('shop_store_id');
        if (savedStoreId && res.data.stores.some((s: ShopStore) => s.id === parseInt(savedStoreId))) {
          setSelectedStoreId(parseInt(savedStoreId));
        } else if (res.data.stores.length > 0) {
          setSelectedStoreId(res.data.stores[0].id);
          localStorage.setItem('shop_store_id', res.data.stores[0].id.toString());
        }
      } catch (error) {
        console.error('Failed to fetch stores:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();

    // ローカルストレージからカートを復元
    const savedCart = localStorage.getItem('shop_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        // ignore
      }
    }
  }, []);

  // カートをローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('shop_cart', JSON.stringify(cart));
  }, [cart]);

  // 商品一覧を取得
  const fetchProducts = useCallback(async () => {
    if (!selectedStoreId) return;
    setLoadingProducts(true);
    try {
      const res = await shopApi.getProducts(selectedStoreId, {
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
      });
      setProducts(res.data.products);
      setCategories(res.data.categories);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedStoreId, selectedCategory, searchQuery]);

  useEffect(() => {
    if (selectedStoreId) {
      fetchProducts();
    }
  }, [selectedStoreId, selectedCategory, fetchProducts]);

  // 検索実行（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedStoreId) {
        fetchProducts();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedStoreId, fetchProducts]);

  // カートに追加
  const addToCart = (product: ShopProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock_quantity) }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setAddedProduct(product);
    setShowAddedModal(true);
  };

  // カートから削除
  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // カート数量変更
  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock_quantity) }
          : item
      )
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const selectedStore = stores.find(s => s.id === selectedStoreId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/shop" className="flex items-center gap-2 text-blue-600 font-bold">
              <Smartphone className="h-5 w-5" />
              ITX Shop
            </Link>
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <Link href="/shop/purchases">
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
                      <ShoppingBag className="h-4 w-4 mr-1" />
                      購入履歴
                    </Button>
                  </Link>
                  <Link href="/member/dashboard">
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
                      <User className="h-4 w-4 mr-1" />
                      マイページ
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/member/login">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
                    <LogIn className="h-4 w-4 mr-1" />
                    ログイン
                  </Button>
                </Link>
              )}
              {cartItemCount > 0 && (
                <button
                  onClick={() => setShowCartModal(true)}
                  className="relative p-2 text-gray-600 hover:text-blue-600"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Smartphone className="h-10 w-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            ITX スマホアクセサリーショップ
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            高品質なスマートフォンアクセサリーをお届けします
          </p>

          {/* 店舗選択 */}
          <div className="max-w-md mx-auto mb-6">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3">
              <Store className="h-5 w-5" />
              <select
                value={selectedStoreId || ''}
                onChange={(e) => {
                  const newStoreId = parseInt(e.target.value);
                  setSelectedStoreId(newStoreId);
                  setSelectedCategory(null);
                  localStorage.setItem('shop_store_id', newStoreId.toString());
                }}
                className="flex-1 bg-transparent border-none text-white focus:outline-none"
              >
                {stores.map(store => (
                  <option key={store.id} value={store.id} className="text-gray-900">
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedStore && (
              <p className="text-sm text-blue-100 mt-2 flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4" />
                {selectedStore.prefecture}
              </p>
            )}
          </div>

          {/* 検索 */}
          <div className="max-w-md mx-auto">
            <Input
              placeholder="商品を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white text-gray-900"
            />
          </div>
        </div>
      </section>

      {/* 商品一覧 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* カテゴリフィルター */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
          >
            すべて
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {loadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* 商品グリッド */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map(product => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <Link href={`/shop/product/${product.id}?store_id=${selectedStoreId}`}>
                    <div className="aspect-square bg-gray-100 flex items-center justify-center cursor-pointer">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <Smartphone className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <span className="text-xs text-blue-600 font-medium">{product.category}</span>
                    <Link href={`/shop/product/${product.id}?store_id=${selectedStoreId}`}>
                      <h3 className="font-semibold mt-1 text-gray-900 hover:text-blue-600 cursor-pointer">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-lg font-bold text-blue-600">
                        &yen;{product.price.toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        disabled={product.stock_quantity === 0}
                        onClick={() => addToCart(product)}
                      >
                        {product.stock_quantity === 0 ? '在庫切れ' : 'カートに追加'}
                      </Button>
                    </div>
                    {product.is_low_stock && product.stock_quantity > 0 && (
                      <p className="text-xs text-orange-600 mt-2">残りわずか</p>
                    )}
                    {product.stock_quantity === 0 && (
                      <p className="text-xs text-red-600 mt-2">在庫切れ</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12">
                <Smartphone className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">商品が見つかりませんでした</p>
              </div>
            )}
          </>
        )}
      </section>

      {/* 特徴セクション */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-12">ITX Shopの特徴</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">高品質</h3>
              <p className="text-gray-600">厳選された高品質なアクセサリーのみを取り扱っています</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">店舗受取可能</h3>
              <p className="text-gray-600">お近くの店舗でお受け取りいただけます</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">会員特典</h3>
              <p className="text-gray-600">会員登録でポイント還元・限定商品も</p>
            </div>
          </div>
        </div>
      </section>

      {/* フローティングカートボタン */}
      {cartItemCount > 0 && (
        <button
          onClick={() => setShowCartModal(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors z-40"
        >
          <div className="relative">
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {cartItemCount}
            </span>
          </div>
        </button>
      )}

      {/* カートに追加完了モーダル */}
      {showAddedModal && addedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">カートに追加しました</h3>
              <p className="text-gray-600 mb-4">{addedProduct.name}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddedModal(false)}
                >
                  買い物を続ける
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowAddedModal(false);
                    setShowCartModal(true);
                  }}
                >
                  カートを見る
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* カートモーダル */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-lg mx-0 sm:mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                カート ({cartItemCount}点)
              </h3>
              <button onClick={() => setShowCartModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">カートは空です</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover rounded" />
                        ) : (
                          <Smartphone className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.product.name}</p>
                        <p className="text-blue-600 font-bold">&yen;{item.product.price.toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                            disabled={item.quantity >= item.product.stock_quantity}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="ml-auto text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">&yen;{(item.product.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">小計</span>
                  <span className="text-xl font-bold text-blue-600">&yen;{cartTotal.toLocaleString()}</span>
                </div>
                <Link href="/shop/cart">
                  <Button className="w-full" size="lg" onClick={() => setShowCartModal(false)}>
                    購入手続きへ
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
