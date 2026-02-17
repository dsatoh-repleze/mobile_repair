'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { isAuthenticated } from '@/lib/auth/hooks';
import { ticketsApi, Ticket } from '@/lib/api/tickets';
import {
  ArrowLeft,
  Search,
  User,
  Ticket as TicketIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Plus,
  Minus,
} from 'lucide-react';

interface Member {
  id: number;
  name: string;
  email: string;
}

type RedeemState = 'idle' | 'loading' | 'success' | 'error';

export default function StaffRedeemPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberTickets, setMemberTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [redeemState, setRedeemState] = useState<RedeemState>('idle');
  const [error, setError] = useState('');
  const [redeemQuantity, setRedeemQuantity] = useState(1);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push('/staff/login');
    }
  }, [router]);

  const handleSearch = useCallback(async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const response = await ticketsApi.searchMembers(searchQuery);
      setSearchResults(response.data.members);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleSelectMember = async (member: Member) => {
    setSelectedMember(member);
    setSearchResults([]);
    setSearchQuery('');
    setLoadingTickets(true);
    try {
      const response = await ticketsApi.getMemberTickets(member.id);
      setMemberTickets(response.data.tickets);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSelectTicket = (ticket: Ticket) => {
    if (!ticket.is_redeemable || ticket.is_in_cooldown) return;
    setSelectedTicket(ticket);
    setConfirmModalOpen(true);
    setRedeemState('idle');
    setError('');
    setRedeemQuantity(1);
  };

  const handleRedeem = async () => {
    if (!selectedTicket || !selectedMember) return;
    setRedeemState('loading');
    try {
      await ticketsApi.staffRedeem(selectedTicket.id, selectedMember.id, redeemQuantity);
      setRedeemState('success');
      // Refresh tickets after 1.5 seconds
      setTimeout(async () => {
        setConfirmModalOpen(false);
        const response = await ticketsApi.getMemberTickets(selectedMember.id);
        setMemberTickets(response.data.tickets);
        setSelectedTicket(null);
        setRedeemQuantity(1);
      }, 1500);
    } catch (err: unknown) {
      setRedeemState('error');
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || '消込に失敗しました');
    }
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setMemberTickets([]);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/staff/dashboard"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>戻る</span>
            </Link>
            <h1 className="text-lg font-bold text-slate-900">チケット消込</h1>
            <div className="w-16" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {!selectedMember ? (
          /* Member Search */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-emerald-500" />
                会員検索
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="メールアドレスまたは名前で検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searching || searchQuery.length < 2}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : '検索'}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-xl divide-y">
                  {searchResults.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                        <User className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{member.name}</p>
                        <p className="text-sm text-slate-500">{member.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                <p className="text-center text-slate-500 py-8">会員が見つかりません</p>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Member Selected - Show Tickets */
          <>
            {/* Selected Member Info */}
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                      <User className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-slate-900">{selectedMember.name}</p>
                      <p className="text-sm text-slate-500">{selectedMember.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleClearMember}>
                    別の会員を選択
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tickets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TicketIcon className="h-5 w-5 text-emerald-500" />
                  利用可能なチケット
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTickets ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                  </div>
                ) : memberTickets.length > 0 ? (
                  <div className="grid gap-4">
                    {memberTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        disabled={!ticket.is_redeemable || ticket.is_in_cooldown}
                        className={`w-full p-6 rounded-2xl text-left transition-all ${
                          ticket.is_redeemable && !ticket.is_in_cooldown
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:scale-[1.02] active:scale-[0.99] cursor-pointer'
                            : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={ticket.is_redeemable ? 'text-white/70' : 'text-slate-400'}>
                              {ticket.ticket_type}
                            </p>
                            <p className="text-3xl font-bold">
                              {ticket.remaining_uses}
                              <span className={`text-lg font-normal ${ticket.is_redeemable ? 'text-white/70' : 'text-slate-400'}`}>
                                回
                              </span>
                            </p>
                            <div className={`flex items-center gap-1 mt-1 text-sm ${ticket.is_redeemable ? 'text-white/70' : 'text-slate-400'}`}>
                              <Calendar className="h-3 w-3" />
                              <span>有効期限: {ticket.expires_at}</span>
                            </div>
                          </div>
                          {ticket.is_redeemable && !ticket.is_in_cooldown && (
                            <span className="px-4 py-2 bg-white/20 rounded-xl font-medium">
                              消込する
                            </span>
                          )}
                          {ticket.is_in_cooldown && (
                            <span className="px-4 py-2 bg-black/10 rounded-xl text-sm">
                              クールダウン中
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <TicketIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">利用可能なチケットがありません</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Confirm Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent onClose={() => setConfirmModalOpen(false)}>
          {redeemState === 'idle' && selectedTicket && selectedMember && (
            <>
              <DialogHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600">
                  <TicketIcon className="h-8 w-8 text-white" />
                </div>
                <DialogTitle className="text-center">消込確認</DialogTitle>
                <DialogDescription className="text-center">
                  以下の内容で消込を実行します
                </DialogDescription>
              </DialogHeader>

              <div className="my-6 space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">会員</p>
                  <p className="font-bold text-lg text-slate-900">{selectedMember.name}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">チケット</p>
                  <p className="font-bold text-lg text-slate-900">
                    {selectedTicket.ticket_type}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-3">消込枚数</p>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setRedeemQuantity(Math.max(1, redeemQuantity - 1))}
                      disabled={redeemQuantity <= 1}
                      className="h-12 w-12 rounded-full"
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <span className="text-4xl font-bold text-slate-900 min-w-[80px] text-center">
                      {redeemQuantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setRedeemQuantity(Math.min(selectedTicket.remaining_uses, redeemQuantity + 1))}
                      disabled={redeemQuantity >= selectedTicket.remaining_uses}
                      className="h-12 w-12 rounded-full"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-center text-sm text-slate-500 mt-3">
                    残り{selectedTicket.remaining_uses}回 → {selectedTicket.remaining_uses - redeemQuantity}回
                  </p>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button onClick={handleRedeem} size="lg" className="w-full bg-emerald-500 hover:bg-emerald-600">
                  消込を実行する
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmModalOpen(false)}
                  size="lg"
                  className="w-full"
                >
                  キャンセル
                </Button>
              </DialogFooter>
            </>
          )}

          {redeemState === 'loading' && (
            <div className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-900">処理中...</p>
            </div>
          )}

          {redeemState === 'success' && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
              <p className="text-xl font-bold text-slate-900">消込完了</p>
              <p className="text-sm text-slate-500 mt-1">正常に処理されました</p>
            </div>
          )}

          {redeemState === 'error' && (
            <>
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
                <p className="text-lg font-bold text-slate-900">エラー</p>
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmModalOpen(false)} className="w-full">
                  閉じる
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
