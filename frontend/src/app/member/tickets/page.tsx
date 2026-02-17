'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ticket as TicketIcon, ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TicketCard } from '@/components/tickets/ticket-card';
import { RedeemModal } from '@/components/tickets/redeem-modal';
import { ticketsApi, Ticket, TicketListResponse } from '@/lib/api/tickets';
import { isAuthenticated } from '@/lib/auth/hooks';

export default function MemberTicketsPage() {
  const router = useRouter();
  const [data, setData] = useState<TicketListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ticketsApi.getTickets();
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/member/login');
      return;
    }
    fetchTickets();
  }, [router, fetchTickets]);

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setModalOpen(true);
  };

  const handleRedeemed = () => {
    fetchTickets();
    setSelectedTicket(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  const activeTickets = data?.tickets.filter((t) => t.status === 'active') || [];
  const inactiveTickets = data?.tickets.filter((t) => t.status !== 'active') || [];

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
              <TicketIcon className="h-5 w-5 text-white" />
              <span className="font-bold text-white">チケット</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTickets}
              className="text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Summary */}
        <div className="mb-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">利用可能なチケット</p>
              <p className="text-3xl font-bold">{data?.summary.total_remaining || 0}回</p>
            </div>
            <Link href="/member/history">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 gap-1"
              >
                <Clock className="h-4 w-4" />
                利用履歴
              </Button>
            </Link>
          </div>
        </div>

        {/* Active Tickets */}
        {activeTickets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white/80 text-sm font-medium mb-3">利用可能</h2>
            <div className="space-y-4">
              {activeTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onSelect={handleSelectTicket}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inactive Tickets */}
        {inactiveTickets.length > 0 && (
          <div>
            <h2 className="text-white/60 text-sm font-medium mb-3">使用済み・期限切れ</h2>
            <div className="space-y-4">
              {inactiveTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onSelect={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!data?.tickets || data.tickets.length === 0) && (
          <div className="text-center py-12">
            <TicketIcon className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/70">チケットがありません</p>
          </div>
        )}
      </main>

      {/* Redeem Modal */}
      <RedeemModal
        ticket={selectedTicket}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onRedeemed={handleRedeemed}
      />
    </div>
  );
}
