'use client';

import { ReactNode } from 'react';
import { StoreProvider } from '@/contexts/store-context';

export function Providers({ children }: { children: ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>;
}
