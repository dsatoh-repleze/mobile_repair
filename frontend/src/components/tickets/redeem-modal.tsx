'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, Ticket as TicketIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Ticket, ticketsApi } from '@/lib/api/tickets';

interface RedeemModalProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedeemed: () => void;
}

type ModalState = 'confirm' | 'loading' | 'success' | 'error' | 'cooldown';

export function RedeemModal({ ticket, open, onOpenChange, onRedeemed }: RedeemModalProps) {
  const [state, setState] = useState<ModalState>('confirm');
  const [error, setError] = useState<string>('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset state when modal opens - using render-time state adjustment pattern
  // instead of useEffect to avoid cascading renders
  if (open && !prevOpen && ticket) {
    setPrevOpen(open);
    if (ticket.is_in_cooldown) {
      setState('cooldown');
      setCooldownSeconds(ticket.cooldown_remaining_seconds);
    } else {
      setState('confirm');
    }
  } else if (open !== prevOpen) {
    setPrevOpen(open);
  }

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            setState('confirm');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownSeconds]);

  const handleRedeem = async () => {
    if (!ticket) return;

    setState('loading');
    setError('');

    try {
      await ticketsApi.redeem(ticket.id);
      setState('success');
      setTimeout(() => {
        onRedeemed();
        onOpenChange(false);
      }, 1500);
    } catch (err: unknown) {
      setState('error');
      const axiosError = err as { response?: { data?: { message?: string; cooldown_remaining_seconds?: number } } };
      if (axiosError.response?.data?.cooldown_remaining_seconds) {
        setState('cooldown');
        setCooldownSeconds(axiosError.response.data.cooldown_remaining_seconds);
      } else {
        setError(axiosError.response?.data?.message || '消込に失敗しました');
      }
    }
  };

  const handleClose = () => {
    if (state !== 'loading') {
      onOpenChange(false);
      setState('confirm');
      setError('');
    }
  };

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose} className="sm:max-w-md">
        {state === 'confirm' && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600">
                <TicketIcon className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-center">チケットを使用</DialogTitle>
              <DialogDescription className="text-center">
                {ticket.ticket_type}チケットを1回分消費します
              </DialogDescription>
            </DialogHeader>

            <div className="my-6 p-4 bg-slate-50 rounded-xl text-center">
              <p className="text-sm text-slate-500">残り回数</p>
              <p className="text-3xl font-bold text-slate-900">
                {ticket.remaining_uses} → {ticket.remaining_uses - 1}
              </p>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={handleRedeem} size="lg" className="w-full">
                消込を実行する
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                size="lg"
                className="w-full"
              >
                キャンセル
              </Button>
            </DialogFooter>
          </>
        )}

        {state === 'loading' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-violet-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-900">処理中...</p>
          </div>
        )}

        {state === 'success' && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-slate-900">消込完了</p>
            <p className="text-sm text-slate-500 mt-1">ご利用ありがとうございます</p>
          </div>
        )}

        {state === 'error' && (
          <>
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <p className="text-lg font-bold text-slate-900">エラー</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="w-full">
                閉じる
              </Button>
            </DialogFooter>
          </>
        )}

        {state === 'cooldown' && (
          <>
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                <span className="text-2xl font-bold text-amber-600">
                  {formatCooldown(cooldownSeconds)}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-900">クールダウン中</p>
              <p className="text-sm text-slate-500 mt-1">
                連続使用防止のため、しばらくお待ちください
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="w-full">
                閉じる
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
