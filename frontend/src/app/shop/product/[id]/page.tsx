'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { shopApi, ShopProduct, ShopStore } from '@/lib/api/shop';
import {
  Smartphone,
  RefreshCw,
  ShoppingCart,
  Check,
  Plus,
  Minus,
  ChevronLeft,
  Store,
  MapPin,
  Package,
  Shield,
  Truck,
} from 'lucide-react';

interface CartItem {
  product: ShopProduct;
  quantity: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = parseInt(params.id as string);
  const storeIdParam = searchParams.get('store_id');

  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [stores, setStores] = useState<ShopStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(
    storeIdParam ? parseInt(storeIdParam) : null
  );
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showAddedModal, setShowAddedModal] = useState(false);

  // 店舗と商品を取得
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 店舗一覧取得
        const storeRes = await shopApi.getStores();
        setStores(storeRes.data.stores);

        // 店舗IDが指定されていない場合は最初の店舗を使用
        const storeId = selectedStoreId || storeRes.data.stores[0]?.id;
        if (!storeId) {
          setLoading(false);
          return;
        }
        setSelectedStoreId(storeId);

        // 商品詳細取得
        const productRes = await shopApi.getProductDetail(productId, storeId);
        setProduct(productRes.data.product);
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productId, selectedStoreId]);

  // 店舗変更時に商品情報を再取得
  const handleStoreChange = async (newStoreId: number) => {
    setSelectedStoreId(newStoreId);
    setLoading(true);
    try {
      const productRes = await shopApi.getProductDetail(productId, newStoreId);
      setProduct(productRes.data.product);
      setQuantity(1);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  // カートに追加
  const addToCart = () => {
    if (!product) return;

    // ローカルストレージからカートを取得
    const savedCart = localStorage.getItem('shop_cart');
    let cart: CartItem[] = [];
    if (savedCart) {
      try {
        cart = JSON.parse(savedCart);
      } catch {
        // ignore
      }
    }

    // カートに追加
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      cart = cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock_quantity) }
          : item
      );
    } else {
      cart = [...cart, { product, quantity }];
    }

    // ローカルストレージに保存
    localStorage.setItem('shop_cart', JSON.stringify(cart));

    // モーダル表示
    setShowAddedModal(true);
  };

  const selectedStore = stores.find(s => s.id === selectedStoreId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Smartphone className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">商品が見つかりませんでした</p>
          <Link href="/shop">
            <Button>ショップに戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* パンくずリスト */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/shop" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            <ChevronLeft className="h-4 w-4 mr-1" />
            ショップに戻る
          </Link>
        </div>
      </div>

      {/* 商品詳細 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 lg:p-8">
            {/* 商品画像 */}
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-32 h-32 text-gray-400" />
                </div>
              )}
            </div>

            {/* 商品情報 */}
            <div>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-4">
                {product.category}
              </span>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                {product.name}
              </h1>
              <p className="text-gray-600 mb-6">{product.description}</p>

              {/* 価格 */}
              <div className="mb-6">
                <span className="text-3xl font-bold text-blue-600">
                  &yen;{product.price.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500 ml-2">(税込)</span>
              </div>

              {/* 店舗選択 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  受取店舗
                </label>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <Store className="h-5 w-5 text-gray-400" />
                  <select
                    value={selectedStoreId || ''}
                    onChange={(e) => handleStoreChange(parseInt(e.target.value))}
                    className="flex-1 border-none focus:outline-none"
                  >
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedStore && (
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {selectedStore.prefecture}
                  </p>
                )}
              </div>

              {/* 在庫状況 */}
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-gray-400" />
                  {product.stock_quantity > 0 ? (
                    <span className="text-green-600 font-medium">
                      在庫あり（残り{product.stock_quantity}点）
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">在庫切れ</span>
                  )}
                </div>
                {product.is_low_stock && product.stock_quantity > 0 && (
                  <p className="text-orange-600 text-sm mt-1">残りわずかです。お早めにどうぞ。</p>
                )}
              </div>

              {/* 数量選択 */}
              {product.stock_quantity > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    数量
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="w-12 text-center text-xl font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      disabled={quantity >= product.stock_quantity}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* カートに追加ボタン */}
              <Button
                size="lg"
                className="w-full mb-4"
                disabled={product.stock_quantity === 0}
                onClick={addToCart}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {product.stock_quantity === 0 ? '在庫切れ' : 'カートに追加'}
              </Button>

              {/* 特典 */}
              <div className="border-t pt-6 mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>安心の品質保証</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Truck className="h-5 w-5 text-blue-500" />
                  <span>店舗受取で送料無料</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* カートに追加完了モーダル */}
      {showAddedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">カートに追加しました</h3>
              <p className="text-gray-600 mb-2">{product.name}</p>
              <p className="text-blue-600 font-bold mb-4">
                {quantity}点 &times; &yen;{product.price.toLocaleString()} = &yen;{(product.price * quantity).toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddedModal(false)}
                >
                  買い物を続ける
                </Button>
                <Link href="/shop/cart" className="flex-1">
                  <Button className="w-full">
                    カートを見る
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
