'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Settings,
  Store,
  Trophy,
  ClipboardList,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'ダッシュボード', icon: BarChart3, activeColor: 'bg-violet-50 text-violet-600' },
  { href: '/admin/plans', label: 'プラン管理', icon: Settings, activeColor: 'bg-violet-50 text-violet-600' },
  { href: '/admin/stores', label: '店舗管理', icon: Store, activeColor: 'bg-violet-50 text-violet-600' },
  { href: '/admin/staff-ranking', label: '売上ランキング', icon: Trophy, activeColor: 'bg-yellow-50 text-yellow-600' },
  { href: '/admin/stocktaking', label: '棚卸し', icon: ClipboardList, activeColor: 'bg-teal-50 text-teal-600' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 py-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={isActive ? item.activeColor : ''}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
