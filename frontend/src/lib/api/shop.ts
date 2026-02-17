import { apiClient } from './client';

export interface ShopStore {
  id: number;
  name: string;
  prefecture: string;
}

export interface ShopProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category: string | null;
  image_url: string | null;
  is_low_stock: boolean;
}

export const shopApi = {
  getStores: () =>
    apiClient.get<{ stores: ShopStore[] }>('/shop/stores'),

  getProducts: (storeId: number, params?: { category?: string; search?: string }) =>
    apiClient.get<{ products: ShopProduct[]; categories: string[] }>('/shop/products', {
      params: { store_id: storeId, ...params },
    }),

  getProductDetail: (productId: number, storeId: number) =>
    apiClient.get<{ product: ShopProduct }>(`/shop/products/${productId}`, {
      params: { store_id: storeId },
    }),
};
