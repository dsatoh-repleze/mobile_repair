import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type UserRole = 'admin' | 'staff' | 'member';

// ルート設定
const ROUTE_CONFIG = {
  // POS領域 - Admin/Staff専用
  pos: {
    patterns: ['/admin', '/staff'],
    allowedRoles: ['admin', 'staff'] as UserRole[],
    loginPath: '/admin/login',
    redirectOnDenied: '/shop',
  },
  // EC領域 - Member専用
  ec: {
    patterns: ['/member'],
    allowedRoles: ['member'] as UserRole[],
    loginPath: '/member/login',
    redirectOnDenied: '/admin/dashboard',
  },
  // ショップ - Member & ゲスト
  shop: {
    patterns: ['/shop'],
    allowedRoles: ['member', null] as (UserRole | null)[],
    loginPath: '/member/login',
    guestAllowed: true,
  },
  // 公開ページ - 認証不要
  public: {
    patterns: [
      '/receipt',        // デジタルレシート
      '/admin/login',
      '/staff/login',
      '/member/login',
      '/member/register',
      '/',
    ],
  },
};

// 静的アセットとAPIのパターン
const IGNORE_PATTERNS = [
  '/_next',
  '/api',
  '/favicon.ico',
  '/images',
  '/static',
];

function matchPath(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('*')) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    return pathname === pattern || pathname.startsWith(pattern + '/');
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静的アセットとAPIはスキップ
  if (IGNORE_PATTERNS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 公開ページはそのまま通す
  if (matchPath(pathname, ROUTE_CONFIG.public.patterns)) {
    return NextResponse.next();
  }

  // Cookieからトークンとロールを取得
  const token = request.cookies.get('access_token')?.value;
  const role = request.cookies.get('user_role')?.value as UserRole | undefined;

  // ショップ領域の処理（ゲストアクセス可）
  if (matchPath(pathname, ROUTE_CONFIG.shop.patterns)) {
    // Admin/Staffはショップ領域へのアクセス禁止
    if (role === 'admin' || role === 'staff') {
      const url = request.nextUrl.clone();
      url.pathname = `/${role}/dashboard`;
      return NextResponse.redirect(url);
    }
    // Member またはゲストは許可
    return NextResponse.next();
  }

  // POS領域の処理
  if (matchPath(pathname, ROUTE_CONFIG.pos.patterns)) {
    // 未認証の場合はログインへ
    if (!token || !role) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTE_CONFIG.pos.loginPath;
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Member はPOS領域へのアクセス禁止
    if (role === 'member') {
      const url = request.nextUrl.clone();
      url.pathname = ROUTE_CONFIG.pos.redirectOnDenied;
      return NextResponse.redirect(url);
    }

    // Admin/Staff間の細かいアクセス制御
    // StaffはAdmin専用ページにアクセス不可
    if (role === 'staff' && pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
      const url = request.nextUrl.clone();
      url.pathname = '/staff/dashboard';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // EC領域 (Member専用) の処理
  if (matchPath(pathname, ROUTE_CONFIG.ec.patterns)) {
    // 未認証の場合はログインへ
    if (!token || !role) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTE_CONFIG.ec.loginPath;
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Admin/Staff はMember領域へのアクセス禁止
    if (role === 'admin' || role === 'staff') {
      const url = request.nextUrl.clone();
      url.pathname = ROUTE_CONFIG.ec.redirectOnDenied;
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // その他のパスはそのまま通す
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
