import Link from 'next/link';
import { Shield, Store, Ticket, Sparkles, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
              <Ticket className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">ITX POS</h1>
          <p className="text-violet-200/70">サブスクリプション管理 & POSシステム</p>
        </div>

        {/* Login options */}
        <div className="w-full max-w-md space-y-4">
          <Link
            href="/admin/login"
            className="group flex items-center justify-between p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">管理者</h2>
                <p className="text-sm text-white/60">システム管理・運営</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/staff/login"
            className="group flex items-center justify-between p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">スタッフ</h2>
                <p className="text-sm text-white/60">店舗POS操作</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/member/login"
            className="group flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-violet-500/20 to-indigo-500/20 backdrop-blur-sm border border-violet-400/20 hover:from-violet-500/30 hover:to-indigo-500/30 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">会員</h2>
                <p className="text-sm text-white/60">チケット・特典利用</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-white/40 text-sm">
            &copy; 2026 ITX POS System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
