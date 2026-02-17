'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import { Sparkles, Ticket } from 'lucide-react';
import Link from 'next/link';

export default function MemberLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-pink-400 via-transparent to-transparent animate-pulse" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-400 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3s' }} />
        <div className="absolute top-40 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
      </div>

      {/* Glass morphism container */}
      <div className="w-full max-w-md relative z-10">
        <Card className="border-white/20 bg-white/90 backdrop-blur-2xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            {/* Brand logo area */}
            <div className="mx-auto mb-2 flex items-center justify-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
                <Ticket className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-1 text-sm text-violet-600 font-medium">
              <Sparkles className="h-4 w-4" />
              <span>Premium Member</span>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <LoginForm
              role="member"
              title="会員ログイン"
              subtitle="あなたのチケット・特典にアクセス"
            />

            {/* Register link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                まだ会員ではありませんか？
              </p>
              <Link
                href="/member/register"
                className="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors inline-flex items-center gap-1 mt-1"
              >
                新規会員登録
                <Sparkles className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer branding */}
        <div className="mt-8 text-center">
          <p className="text-white/70 text-sm font-medium">ITX Premium</p>
          <p className="text-white/50 text-xs mt-1">あなたのライフスタイルをアップグレード</p>
        </div>
      </div>
    </div>
  );
}
