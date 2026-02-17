'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/api/client';

interface Store {
  id: number;
  name: string;
  address: string;
}

interface StoreContextValue {
  stores: Store[];
  selectedStoreId: number | null;
  isAdmin: boolean;
  isLoading: boolean;
  setSelectedStoreId: (storeId: number) => void;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreIdState] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchStores = useCallback(async () => {
    if (hasFetched) return;

    setIsLoading(true);
    try {
      const response = await apiClient.get('/staff/stores');
      const storeList = response.data.stores || [];
      setStores(storeList);
      setIsAdmin(response.data.is_admin);
      setHasFetched(true);

      // 保存された店舗IDを復元、なければ最初の店舗を選択
      const savedStoreId = Cookies.get('selected_store_id');
      if (savedStoreId && storeList.some((s: Store) => s.id === parseInt(savedStoreId))) {
        setSelectedStoreIdState(parseInt(savedStoreId));
      } else if (storeList.length > 0) {
        setSelectedStoreIdState(storeList[0].id);
        Cookies.set('selected_store_id', storeList[0].id.toString());
      }
    } catch {
      // エラー時は何もしない
    } finally {
      setIsLoading(false);
    }
  }, [hasFetched]);

  useEffect(() => {
    const storedRole = Cookies.get('user_role');
    if (storedRole && (storedRole === 'admin' || storedRole === 'staff')) {
      fetchStores();
    } else {
      setIsLoading(false);
    }
  }, [fetchStores]);

  const setSelectedStoreId = useCallback((storeId: number) => {
    setSelectedStoreIdState(storeId);
    Cookies.set('selected_store_id', storeId.toString());
    // ページをリロードして新しい店舗のデータを取得
    window.location.reload();
  }, []);

  const refreshStores = useCallback(async () => {
    setHasFetched(false);
    await fetchStores();
  }, [fetchStores]);

  return (
    <StoreContext.Provider
      value={{
        stores,
        selectedStoreId,
        isAdmin,
        isLoading,
        setSelectedStoreId,
        refreshStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStores() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStores must be used within a StoreProvider');
  }
  return context;
}
