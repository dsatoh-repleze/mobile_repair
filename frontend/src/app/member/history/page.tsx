'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ticketsApi, RedemptionHistory, RedemptionHistoryResponse } from '@/lib/api/tickets';
import { isAuthenticated } from '@/lib/auth/hooks';

export default function MemberHistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<RedemptionHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await ticketsApi.getHistory(pageNum);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/member/login');
      return;
    }
    fetchHistory(page);
  }, [router, fetchHistory, page]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/member/tickets"
              className="flex items-center gap-2 text-white/80 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">戻る</span>
            </Link>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-white" />
              <span className="font-bold text-white">利用履歴</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchHistory(page)}
              className="text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-white animate-spin" />
          </div>
        ) : (
          <>
            {/* History list */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="p-0">
                {data?.history && data.history.length > 0 ? (
                  <div className="divide-y divide-white/10">
                    {data.history.map((item: RedemptionHistory) => (
                      <div key={item.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-white">{item.ticket_type}</p>
                            <div className="flex items-center gap-1 mt-1 text-white/60 text-sm">
                              <MapPin className="h-3 w-3" />
                              <span>{item.store_name}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-white/80">{item.redeemed_at}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Clock className="h-12 w-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">履歴がありません</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {data?.pagination && data.pagination.last_page > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  前へ
                </Button>
                <span className="text-white/70 text-sm px-4">
                  {page} / {data.pagination.last_page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pagination.last_page, p + 1))}
                  disabled={page === data.pagination.last_page}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  次へ
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
