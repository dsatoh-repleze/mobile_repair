<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RedemptionLog;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TicketController extends Controller
{
    /**
     * Get member's tickets
     */
    public function index(): JsonResponse
    {
        $member = Auth::guard('member')->user();

        $tickets = Ticket::forMember($member->id)
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderBy('expires_at', 'asc')
            ->get()
            ->map(function ($ticket) {
                return [
                    'id' => $ticket->id,
                    'ticket_type' => $ticket->ticket_type,
                    'remaining_uses' => $ticket->remaining_uses,
                    'status' => $ticket->status,
                    'expires_at' => $ticket->expires_at->format('Y/m/d'),
                    'is_expiring_soon' => $ticket->expires_at->diffInDays(now()) <= 7,
                    'is_redeemable' => $ticket->isRedeemable(),
                    'is_in_cooldown' => $ticket->isInCooldown(),
                    'cooldown_remaining_seconds' => $ticket->getCooldownRemainingSeconds(),
                ];
            });

        return response()->json([
            'tickets' => $tickets,
            'summary' => [
                'total_remaining' => $tickets->where('status', 'active')->sum('remaining_uses'),
                'active_count' => $tickets->where('status', 'active')->count(),
            ],
        ]);
    }

    /**
     * Get single ticket details
     */
    public function show(int $id): JsonResponse
    {
        $member = Auth::guard('member')->user();

        $ticket = Ticket::forMember($member->id)->findOrFail($id);

        return response()->json([
            'ticket' => [
                'id' => $ticket->id,
                'ticket_type' => $ticket->ticket_type,
                'remaining_uses' => $ticket->remaining_uses,
                'status' => $ticket->status,
                'expires_at' => $ticket->expires_at->format('Y/m/d H:i'),
                'is_redeemable' => $ticket->isRedeemable(),
                'is_in_cooldown' => $ticket->isInCooldown(),
                'cooldown_remaining_seconds' => $ticket->getCooldownRemainingSeconds(),
                'last_redeemed_at' => $ticket->last_redeemed_at?->format('Y/m/d H:i'),
            ],
        ]);
    }

    /**
     * Prepare ticket for redemption (show confirmation info)
     */
    public function prepareRedeem(int $id): JsonResponse
    {
        $member = Auth::guard('member')->user();

        $ticket = Ticket::forMember($member->id)->findOrFail($id);

        if (!$ticket->isRedeemable()) {
            return response()->json([
                'message' => 'このチケットは使用できません。',
                'reason' => $this->getUnredeemableReason($ticket),
            ], 422);
        }

        if ($ticket->isInCooldown()) {
            return response()->json([
                'message' => 'クールダウン中です。しばらくお待ちください。',
                'cooldown_remaining_seconds' => $ticket->getCooldownRemainingSeconds(),
            ], 429);
        }

        return response()->json([
            'ticket' => [
                'id' => $ticket->id,
                'ticket_type' => $ticket->ticket_type,
                'remaining_uses' => $ticket->remaining_uses,
            ],
            'member' => [
                'id' => $member->id,
                'name' => $member->name,
            ],
            'confirmation_message' => "チケットを1枚消費します。よろしいですか？",
        ]);
    }

    /**
     * Redeem a ticket
     */
    public function redeem(Request $request, int $id): JsonResponse
    {
        $member = Auth::guard('member')->user();

        // Get staff and store info if available
        $staffId = null;
        $storeId = null;

        if (Auth::guard('staff')->check()) {
            $staff = Auth::guard('staff')->user();
            $staffId = $staff->id;
            $storeId = $staff->store_id;
        }

        // Use optional staff/store from request (for API testing)
        $staffId = $request->input('staff_id', $staffId);
        $storeId = $request->input('store_id', $storeId);

        $ticket = Ticket::forMember($member->id)->findOrFail($id);

        if (!$ticket->isRedeemable()) {
            return response()->json([
                'message' => 'このチケットは使用できません。',
                'reason' => $this->getUnredeemableReason($ticket),
            ], 422);
        }

        if ($ticket->isInCooldown()) {
            return response()->json([
                'message' => 'クールダウン中です。しばらくお待ちください。',
                'cooldown_remaining_seconds' => $ticket->getCooldownRemainingSeconds(),
            ], 429);
        }

        try {
            DB::beginTransaction();

            // Decrement remaining uses
            $ticket->remaining_uses -= 1;
            $ticket->last_redeemed_at = now();

            // Update status if no more uses
            if ($ticket->remaining_uses <= 0) {
                $ticket->status = 'used';
            }

            $ticket->save();

            // Create redemption log
            $log = RedemptionLog::create([
                'ticket_id' => $ticket->id,
                'member_id' => $member->id,
                'staff_id' => $staffId,
                'store_id' => $storeId,
                'redeemed_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'チケットを消費しました。',
                'ticket' => [
                    'id' => $ticket->id,
                    'remaining_uses' => $ticket->remaining_uses,
                    'status' => $ticket->status,
                ],
                'redemption' => [
                    'id' => $log->id,
                    'redeemed_at' => $log->redeemed_at->format('Y/m/d H:i:s'),
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
     * Get redemption history for member
     */
    public function history(Request $request): JsonResponse
    {
        $member = Auth::guard('member')->user();

        $perPage = $request->input('per_page', 20);

        $logs = RedemptionLog::where('member_id', $member->id)
            ->with(['ticket', 'store', 'staff'])
            ->orderBy('redeemed_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'history' => $logs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'ticket_type' => $log->ticket?->ticket_type ?? 'N/A',
                    'store_name' => $log->store?->name ?? '不明',
                    'staff_name' => $log->staff?->name ?? null,
                    'redeemed_at' => $log->redeemed_at->format('Y/m/d H:i'),
                ];
            }),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    private function getUnredeemableReason(Ticket $ticket): string
    {
        if ($ticket->status !== 'active') {
            return 'チケットが無効です。';
        }
        if ($ticket->remaining_uses <= 0) {
            return '残り回数がありません。';
        }
        if ($ticket->expires_at->isPast()) {
            return 'チケットの有効期限が切れています。';
        }
        return '不明なエラーです。';
    }
}
