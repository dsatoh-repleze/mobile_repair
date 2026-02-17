'use client';

import { usePathname } from 'next/navigation';
import POSLayout from '@/components/layouts/pos-layout';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // ログインページにはレイアウトを適用しない
  if (pathname === '/staff/login') {
    return <>{children}</>;
  }

  return <POSLayout>{children}</POSLayout>;
}
