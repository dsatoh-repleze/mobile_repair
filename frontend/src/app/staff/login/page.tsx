'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import { Store } from 'lucide-react';

export default function StaffLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-200/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-200/50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Subtle pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #059669 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }}
      />

      <div className="w-full max-w-lg relative z-10">
        <Card className="border-emerald-100">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-500/30">
              <Store className="h-10 w-10 text-white" />
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <LoginForm
              role="staff"
              title="スタッフログイン"
              subtitle="店舗POSシステムにアクセス"
            />

            {/* Large touch-friendly note */}
            <div className="mt-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <p className="text-sm text-emerald-700 text-center">
                タブレット・POS端末に最適化されています
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-6">
          ITX POS スタッフ用システム
        </p>
      </div>
    </div>
  );
}
