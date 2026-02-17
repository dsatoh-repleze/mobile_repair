'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api/client';

interface User {
  id: number;
  name: string;
  email: string;
}

interface ECLayoutProps {
  children: React.ReactNode;
}

export default function ECLayout({ children }: ECLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const token = Cookies.get('access_token');
    const role = Cookies.get('user_role');

    if (token && role === 'member') {
      setIsAuthenticated(true);
      authApi.getMe('member').then((response) => {
        setUser(response.data.user || response.data);
      }).catch(() => {
        setIsAuthenticated(false);
      });
    }
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await authApi.logout('member');
    } catch {
      // ログアウトエラーは無視
    } finally {
      Cookies.remove('access_token');
      Cookies.remove('user_role');
      setUser(null);
      setIsAuthenticated(false);
      router.push('/shop');
    }
  };

  const navLinks = [
    { label: '商品一覧', href: '/shop' },
    { label: 'マイページ', href: '/member/dashboard', requireAuth: true },
    { label: 'チケット', href: '/member/tickets', requireAuth: true },
    { label: '購入履歴', href: '/member/purchases', requireAuth: true },
  ];

  const filteredLinks = navLinks.filter(
    (link) => !link.requireAuth || isAuthenticated
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* ロゴ */}
            <Link href="/shop" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">ITX Shop</span>
            </Link>

            {/* デスクトップナビゲーション */}
            <nav className="hidden md:flex items-center gap-6">
              {filteredLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname === link.href || pathname.startsWith(link.href + '/')
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* 右側のアクション */}
            <div className="flex items-center gap-4">
              {/* カートアイコン */}
              <Link
                href="/shop/cart"
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </Link>

              {/* ユーザーメニュー */}
              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-sm text-gray-600">{user?.name}</span>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    href="/member/login"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    ログイン
                  </Link>
                  <Link
                    href="/member/register"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    新規登録
                  </Link>
                </div>
              )}

              {/* モバイルメニューボタン */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* モバイルメニュー */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <nav className="flex flex-col gap-2">
                {filteredLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      pathname === link.href
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-4 py-2 text-sm font-medium text-left text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
                  </button>
                ) : (
                  <>
                    <Link
                      href="/member/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      ログイン
                    </Link>
                    <Link
                      href="/member/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-center"
                    >
                      新規登録
                    </Link>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1">
        {children}
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* ブランド */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">ITX Shop</span>
              </div>
              <p className="text-sm text-gray-400">
                お客様に最高のショッピング体験をお届けします。
              </p>
            </div>

            {/* リンク */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">ショップ</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/shop" className="text-sm text-gray-400 hover:text-white transition-colors">
                    商品一覧
                  </Link>
                </li>
                <li>
                  <Link href="/shop/cart" className="text-sm text-gray-400 hover:text-white transition-colors">
                    カート
                  </Link>
                </li>
              </ul>
            </div>

            {/* サポート */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">サポート</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="text-sm text-gray-400 hover:text-white transition-colors">
                    ヘルプ
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">
                    お問い合わせ
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                    プライバシーポリシー
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                    利用規約
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} ITX Shop. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
