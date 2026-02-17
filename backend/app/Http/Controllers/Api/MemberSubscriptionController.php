<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MemberSubscriptionController extends Controller
{
    /**
     * 利用可能なプラン一覧を取得
     */
    public function plans(): JsonResponse
    {
        $plans = Plan::active()
            ->orderBy('price')
            ->get()
            ->map(function ($plan) {
                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'price' => $plan->price,
                    'price_formatted' => '¥' . number_format($plan->price),
                    'description' => $plan->description,
                    'ticket_count' => $plan->ticket_count,
                ];
            });

        return response()->json([
            'plans' => $plans,
        ]);
    }

    /**
     * 現在のサブスクリプションを取得
     */
    public function current(): JsonResponse
    {
        $member = auth('member')->user();

        $subscription = Subscription::with('plan')
            ->where('member_id', $member->id)
            ->where('status', 'active')
            ->first();

        if (!$subscription) {
            return response()->json([
                'subscription' => null,
            ]);
        }

        return response()->json([
            'subscription' => [
                'id' => $subscription->id,
                'plan' => [
                    'id' => $subscription->plan->id,
                    'name' => $subscription->plan->name,
                    'price' => $subscription->plan->price,
                    'price_formatted' => '¥' . number_format($subscription->plan->price),
                    'ticket_count' => $subscription->plan->ticket_count,
                ],
                'status' => $subscription->status,
                'starts_at' => $subscription->starts_at->format('Y-m-d'),
                'ends_at' => $subscription->ends_at?->format('Y-m-d'),
            ],
        ]);
    }

    /**
     * プランに加入または変更する
     */
    public function subscribe(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);

        $member = auth('member')->user();
        $plan = Plan::active()->findOrFail($request->plan_id);

        // 既にアクティブなサブスクリプションがあるか確認
        $existingSubscription = Subscription::where('member_id', $member->id)
            ->where('status', 'active')
            ->first();

        // 同じプランへの変更は不可
        if ($existingSubscription && $existingSubscription->plan_id === $plan->id) {
            return response()->json([
                'message' => '既に同じプランに加入しています。',
            ], 422);
        }

        return DB::transaction(function () use ($member, $plan, $existingSubscription) {
            $now = Carbon::now();
            $isChange = false;

            // 既存のサブスクリプションがある場合は変更処理
            if ($existingSubscription) {
                $isChange = true;
                // 既存のサブスクリプションを終了
                $existingSubscription->update([
                    'status' => 'changed',
                    'ends_at' => $now,
                ]);
            }

            // 新しいサブスクリプション作成
            $subscription = Subscription::create([
                'member_id' => $member->id,
                'plan_id' => $plan->id,
                'status' => 'active',
                'starts_at' => $now,
                'ends_at' => $now->copy()->addMonth(),
            ]);

            // チケットを付与
            Ticket::create([
                'member_id' => $member->id,
                'subscription_id' => $subscription->id,
                'ticket_type' => $plan->name,
                'total_uses' => $plan->ticket_count,
                'remaining_uses' => $plan->ticket_count,
                'status' => 'active',
                'expires_at' => $now->copy()->addMonth(),
            ]);

            $message = $isChange ? 'プランを変更しました' : 'サブスクリプションに加入しました';

            return response()->json([
                'message' => $message,
                'subscription' => [
                    'id' => $subscription->id,
                    'plan' => [
                        'id' => $plan->id,
                        'name' => $plan->name,
                        'price_formatted' => '¥' . number_format($plan->price),
                        'ticket_count' => $plan->ticket_count,
                    ],
                    'starts_at' => $subscription->starts_at->format('Y-m-d'),
                    'ends_at' => $subscription->ends_at->format('Y-m-d'),
                ],
            ], 201);
        });
    }

    /**
     * サブスクリプションを解約する
     */
    public function cancel(): JsonResponse
    {
        $member = auth('member')->user();

        $subscription = Subscription::where('member_id', $member->id)
            ->where('status', 'active')
            ->first();

        if (!$subscription) {
            return response()->json([
                'message' => 'アクティブなサブスクリプションがありません',
            ], 404);
        }

        $subscription->update([
            'status' => 'cancelled',
            'cancelled_at' => Carbon::now(),
        ]);

        return response()->json([
            'message' => 'サブスクリプションを解約しました。期間終了まではチケットをご利用いただけます。',
        ]);
    }
}
