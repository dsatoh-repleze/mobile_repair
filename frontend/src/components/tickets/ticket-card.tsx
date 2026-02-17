'use client';

import { Ticket } from '@/lib/api/tickets';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketCardProps {
  ticket: Ticket;
  onSelect: (ticket: Ticket) => void;
}

const ticketColors: Record<string, string> = {
  'スタンダード': 'from-violet-500 to-indigo-600',
  'ボーナス': 'from-amber-400 to-orange-500',
  'プレミアム': 'from-rose-400 to-pink-600',
  '先月分': 'from-slate-400 to-slate-500',
  'default': 'from-blue-500 to-cyan-500',
};

export function TicketCard({ ticket, onSelect }: TicketCardProps) {
  const colorClass = ticketColors[ticket.ticket_type] || ticketColors.default;
  const isDisabled = !ticket.is_redeemable;

  return (
    <div
      onClick={() => !isDisabled && onSelect(ticket)}
      className={cn(
        'relative overflow-hidden rounded-2xl text-white transition-all duration-300',
        'bg-gradient-to-br',
        colorClass,
        isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:scale-[1.02] active:scale-[0.99] shadow-lg hover:shadow-xl'
      )}
    >
      {/* Expiring soon badge */}
      {ticket.is_expiring_soon && ticket.status === 'active' && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-white/20 rounded-full text-xs font-medium animate-pulse">
          まもなく期限切れ
        </div>
      )}

      {/* Cooldown badge */}
      {ticket.is_in_cooldown && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/20 rounded-full text-xs font-medium flex items-center gap-1">
          <Clock className="h-3 w-3" />
          クールダウン中
        </div>
      )}

      {/* Status badge for inactive tickets */}
      {ticket.status !== 'active' && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/30 rounded-full text-xs font-medium">
          {ticket.status === 'used' ? '使用済み' : '期限切れ'}
        </div>
      )}

      <div className="p-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/70 text-sm">{ticket.ticket_type}</p>
            <p className="text-4xl font-bold">
              {ticket.remaining_uses}
              <span className="text-lg font-normal text-white/70">回</span>
            </p>
            <div className="flex items-center gap-1 mt-2 text-white/70 text-xs">
              <Calendar className="h-3 w-3" />
              <span>有効期限: {ticket.expires_at}</span>
            </div>
          </div>

          {ticket.is_redeemable && !ticket.is_in_cooldown && (
            <div className="flex items-center gap-1 px-4 py-2 bg-white/20 rounded-xl text-sm font-medium">
              利用する
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
