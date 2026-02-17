'use client';

import { usePathname } from 'next/navigation';
import ECLayout from '@/components/layouts/ec-layout';

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // ログイン・登録ページにはレイアウトを適用しない
  if (pathname === '/member/login' || pathname === '/member/register') {
    return <>{children}</>;
  }

  return <ECLayout>{children}</ECLayout>;
}
