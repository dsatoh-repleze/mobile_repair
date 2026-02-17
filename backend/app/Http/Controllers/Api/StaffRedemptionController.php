<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\RedemptionLog;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StaffRedemptionController extends Controller
{
    /**
     * Search member by email or ID
     */
    public function searchMember(Request $request): JsonResponse
    {
        $request->validate([
            'query' => 'nullable|string',
        ]);

        $query = $request->input('query', '');

        $membersQuery = Member::where('status', 'active');

        if (!empty($query)) {
            $membersQuery->where(function ($q) use ($query) {
                $q->where('email', 'like', "%{$query}%")
                    ->orWhere('name', 'like', "%{$query}%")
                    ->orWhere('id', $query);
            });
        }

        $members = $membersQuery
            ->orderBy('name')
            ->limit(100)
            ->get(['id', 'name', 'email']);

        return response()->json([
            'members' => $members,
        ]);
    }

    /**
     * Get member's active tickets
     */
    public function getMemberTickets(int $memberId): JsonResponse
    {
        $member = Member::findOrFail($memberId);

        $tickets = Ticket::forMember($memberId)
            ->active()
            ->orderBy('expires_at', 'asc')
            ->get()
            ->map(function ($ticket) {
                return [
                    'id' => $ticket->id,
                    'ticket_type' => $ticket->ticket_type,
                    'remaining_uses' => $ticket->remaining_uses,
                    'expires_at' => $ticket->expires_at->format('Y/m/d'),
                    'is_expiring_soon' => $ticket->expires_at->diffInDays(now()) <= 7,
                    'is_redeemable' => $ticket->isRedeemable(),
                    'is_in_cooldown' => $ticket->isInCooldown(),
                    'cooldown_remaining_seconds' => $ticket->getCooldownRemainingSeconds(),
                ];
            });

        return response()->json([
            'member' => [
                'id' => $member->id,
                'name' => $member->name,
            ],
            'tickets' => $tickets,
        ]);
    }

    /**
     * Redeem ticket for member (staff action)
     */
    public function redeemForMember(Request $request, int $ticketId): JsonResponse
    {
        $staff = Auth::guard('staff')->user();

        $request->validate([
            'member_id' => 'required|integer|exists:members,id',
            'quantity' => 'nullable|integer|min:1',
        ]);

        $memberId = $request->input('member_id');
        $quantity = $request->input('quantity', 1);
        $ticket = Ticket::forMember($memberId)->findOrFail($ticketId);

        if (!$ticket->isRedeemable()) {
            return response()->json([
                'message' => 'このチケットは使用できません。',
            ], 422);
        }

        if ($ticket->isInCooldown()) {
            return response()->json([
                'message' => 'クールダウン中です。',
                'cooldown_remaining_seconds' => $ticket->getCooldownRemainingSeconds(),
            ], 429);
        }

        if ($quantity > $ticket->remaining_uses) {
            return response()->json([
                'message' => '消込枚数が残り回数を超えています。',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $ticket->remaining_uses -= $quantity;
            $ticket->last_redeemed_at = now();

            if ($ticket->remaining_uses <= 0) {
                $ticket->status = 'used';
            }

            $ticket->save();

            // Create redemption logs for each use
            $now = now();
            $lastLog = null;
            for ($i = 0; $i < $quantity; $i++) {
                $lastLog = RedemptionLog::create([
                    'ticket_id' => $ticket->id,
                    'member_id' => $memberId,
                    'staff_id' => $staff->id,
                    'store_id' => $staff->store_id,
                    'redeemed_at' => $now,
                ]);
            }

            DB::commit();

            $member = Member::find($memberId);

            return response()->json([
                'message' => $quantity > 1 ? "{$quantity}回分の消込が完了しました。" : '消込が完了しました。',
                'member' => [
                    'id' => $member->id,
                    'name' => $member->name,
                ],
                'ticket' => [
                    'id' => $ticket->id,
                    'ticket_type' => $ticket->ticket_type,
                    'remaining_uses' => $ticket->remaining_uses,
                    'status' => $ticket->status,
                ],
                'redemption' => [
                    'id' => $lastLog->id,
                    'redeemed_at' => $lastLog->redeemed_at->format('Y/m/d H:i:s'),
                    'quantity' => $quantity,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => '消込処理に失敗しました。',
            ], 500);
        }
    }

    /**
     * Get today's redemption history for staff's store
     */
    public function todayHistory(): JsonResponse
    {
        $staff = Auth::guard('staff')->user();

        $logs = RedemptionLog::where('store_id', $staff->store_id)
            ->whereDate('redeemed_at', today())
            ->with(['member', 'ticket', 'staff'])
            ->orderBy('redeemed_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'history' => $logs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'member_name' => $log->member?->name ?? '不明',
                    'ticket_type' => $log->ticket?->ticket_type ?? 'N/A',
                    'staff_name' => $log->staff?->name ?? '不明',
                    'redeemed_at' => $log->redeemed_at->format('H:i'),
                    'minutes_ago' => $log->redeemed_at->diffInMinutes(now()),
                ];
            }),
            'total_today' => $logs->count(),
        ]);
    }
}
