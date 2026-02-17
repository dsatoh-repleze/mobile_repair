'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Ticket,
  Check,
  RefreshCw,
  CreditCard,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ticketsApi } from '@/lib/api/tickets';
import { isAuthenticated } from '@/lib/auth/hooks';

interface Plan {
  id: number;
  name: string;
  price: number;
  price_formatted: string;
  description: string | null;
  ticket_count: number;
}

interface Subscription {
  id: number;
  plan: {
    id: number;
    name: string;
    price: number;
    price_formatted: string;
    ticket_count: number;
  };
  status: string;
  starts_at: string;
  ends_at: string | null;
}

export default function MemberSubscriptionPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, subscriptionRes] = await Promise.all([
        ticketsApi.getSubscriptionPlans(),
        ticketsApi.getCurrentSubscription(),
      ]);
      setPlans(plansRes.data.plans);
      setCurrentSubscription(subscriptionRes.data.subscription);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/member/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  const handleSelectPlan = (planId: number) => {
    setSelectedPlanId(planId);
    setShowConfirmModal(true);
  };

  const handleSubscribe = async () => {
    if (!selectedPlanId) return;

    setSubscribing(true);
    try {
      const response = await ticketsApi.subscribe(selectedPlanId);
      setSuccessMessage(response.data.message);
      setShowConfirmModal(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '加入に失敗しました');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await ticketsApi.cancelSubscription();
      setSuccessMessage(response.data.message);
      setShowCancelModal(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || '解約に失敗しました');
    } finally {
      setCancelling(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/member/dashboard"
              className="flex items-center gap-2 text-white/80 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">戻る</span>
            </Link>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-white" />
              <span className="font-bold text-white">サブスクリプション</span>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-400/30 rounded-xl text-white text-center">
            <Check className="h-6 w-6 mx-auto mb-2" />
            <p>{successMessage}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-white hover:bg-white/10"
              onClick={() => setSuccessMessage(null)}
            >
              閉じる
            </Button>
          </div>
        )}

        {/* Current Subscription */}
        {currentSubscription && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                現在のプラン
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold">{currentSubscription.plan.name}</h3>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                    {currentSubscription.status === 'active' ? '有効' : '解約済み'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-white/90 text-sm">
                  <div className="flex items-center gap-1">
                    <Ticket className="h-4 w-4" />
                    <span>月{currentSubscription.plan.ticket_count}回</span>
                  </div>
                  <span>{currentSubscription.plan.price_formatted}/月</span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20 text-sm text-white/80">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {currentSubscription.starts_at} 〜 {currentSubscription.ends_at || '継続中'}
                    </span>
                  </div>
                </div>
              </div>
              {currentSubscription.status === 'active' && (
                <Button
                  variant="ghost"
                  className="w-full mt-4 text-red-300 hover:text-red-200 hover:bg-red-500/20"
                  onClick={() => setShowCancelModal(true)}
                >
                  解約する
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plans */}
        <div className="space-y-4">
          <h2 className="text-white/80 text-sm font-medium flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            {currentSubscription ? 'プラン変更' : '利用可能なプラン'}
          </h2>

          {plans.length === 0 ? (
            <Card className="bg-white/10 border-white/20">
              <CardContent className="py-8 text-center">
                <Ticket className="h-12 w-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/60">利用可能なプランがありません</p>
              </CardContent>
            </Card>
          ) : (
            plans
              .filter((plan) => !currentSubscription || plan.id !== currentSubscription.plan.id)
              .map((plan) => (
                <Card
                  key={plan.id}
                  className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/15 transition-colors cursor-pointer"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-white/60 text-sm mt-1">{plan.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3 text-sm text-white/80">
                          <div className="flex items-center gap-1">
                            <Ticket className="h-4 w-4" />
                            <span>月{plan.ticket_count}回</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{plan.price_formatted}</p>
                        <p className="text-white/60 text-sm">/月</p>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlan(plan.id);
                      }}
                    >
                      {currentSubscription ? 'このプランに変更' : 'このプランに加入'}
                    </Button>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </main>

      {/* Confirm Subscribe Modal */}
      {showConfirmModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm bg-white">
            <CardHeader>
              <CardTitle className="text-center">
                {currentSubscription ? 'プランを変更' : 'プランに加入'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl text-white">
                <h3 className="text-xl font-bold">{selectedPlan.name}</h3>
                <p className="text-3xl font-bold mt-2">{selectedPlan.price_formatted}</p>
                <p className="text-white/80 text-sm">/月</p>
                <div className="mt-3 flex items-center justify-center gap-1 text-white/90">
                  <Ticket className="h-4 w-4" />
                  <span>月{selectedPlan.ticket_count}回利用可能</span>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                {currentSubscription ? (
                  <>
                    <p>・現在のプランは終了となります</p>
                    <p>・新しいチケットがすぐに付与されます</p>
                    <p>・いつでもプラン変更・解約可能です</p>
                  </>
                ) : (
                  <>
                    <p>・加入後すぐにチケットが付与されます</p>
                    <p>・毎月自動更新されます</p>
                    <p>・いつでも解約可能です</p>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={subscribing}
                >
                  キャンセル
                </Button>
                <Button
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                  onClick={handleSubscribe}
                  disabled={subscribing}
                >
                  {subscribing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : currentSubscription ? (
                    '変更する'
                  ) : (
                    '加入する'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Confirm Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm bg-white">
            <CardHeader>
              <CardTitle className="text-center text-red-600">解約の確認</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center">
                本当にサブスクリプションを解約しますか？
              </p>
              <p className="text-sm text-gray-500 text-center">
                期間終了まではチケットをご利用いただけます。
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                >
                  戻る
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    '解約する'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
