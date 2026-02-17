<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PlanController extends Controller
{
    /**
     * Display a listing of plans
     */
    public function index(Request $request): JsonResponse
    {
        $query = Plan::query();

        if ($request->has('active_only') && $request->active_only) {
            $query->active();
        }

        $plans = $query->withCount('subscriptions')
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
                    'is_active' => $plan->is_active,
                    'subscriptions_count' => $plan->subscriptions_count,
                    'created_at' => $plan->created_at->format('Y-m-d H:i'),
                    'updated_at' => $plan->updated_at->format('Y-m-d H:i'),
                ];
            });

        return response()->json([
            'plans' => $plans,
        ]);
    }

    /**
     * Store a newly created plan
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:plans',
            'price' => 'required|integer|min:0',
            'description' => 'nullable|string|max:1000',
            'ticket_count' => 'required|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $plan = Plan::create([
            'name' => $validated['name'],
            'price' => $validated['price'],
            'description' => $validated['description'] ?? null,
            'ticket_count' => $validated['ticket_count'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'プランを作成しました',
            'plan' => [
                'id' => $plan->id,
                'name' => $plan->name,
                'price' => $plan->price,
                'price_formatted' => '¥' . number_format($plan->price),
                'description' => $plan->description,
                'ticket_count' => $plan->ticket_count,
                'is_active' => $plan->is_active,
            ],
        ], 201);
    }

    /**
     * Display the specified plan
     */
    public function show(int $id): JsonResponse
    {
        $plan = Plan::withCount('subscriptions')->findOrFail($id);

        return response()->json([
            'plan' => [
                'id' => $plan->id,
                'name' => $plan->name,
                'price' => $plan->price,
                'price_formatted' => '¥' . number_format($plan->price),
                'description' => $plan->description,
                'ticket_count' => $plan->ticket_count,
                'is_active' => $plan->is_active,
                'subscriptions_count' => $plan->subscriptions_count,
                'created_at' => $plan->created_at->format('Y-m-d H:i'),
                'updated_at' => $plan->updated_at->format('Y-m-d H:i'),
            ],
        ]);
    }

    /**
     * Update the specified plan
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $plan = Plan::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('plans')->ignore($plan->id)],
            'price' => 'required|integer|min:0',
            'description' => 'nullable|string|max:1000',
            'ticket_count' => 'required|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $plan->update([
            'name' => $validated['name'],
            'price' => $validated['price'],
            'description' => $validated['description'] ?? null,
            'ticket_count' => $validated['ticket_count'],
            'is_active' => $validated['is_active'] ?? $plan->is_active,
        ]);

        return response()->json([
            'message' => 'プランを更新しました',
            'plan' => [
                'id' => $plan->id,
                'name' => $plan->name,
                'price' => $plan->price,
                'price_formatted' => '¥' . number_format($plan->price),
                'description' => $plan->description,
                'ticket_count' => $plan->ticket_count,
                'is_active' => $plan->is_active,
            ],
        ]);
    }

    /**
     * Remove the specified plan
     */
    public function destroy(int $id): JsonResponse
    {
        $plan = Plan::withCount('subscriptions')->findOrFail($id);

        if ($plan->subscriptions_count > 0) {
            return response()->json([
                'message' => 'このプランには登録中の会員がいるため削除できません',
            ], 422);
        }

        $plan->delete();

        return response()->json([
            'message' => 'プランを削除しました',
        ]);
    }

    /**
     * Toggle plan active status
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $plan = Plan::findOrFail($id);
        $plan->is_active = !$plan->is_active;
        $plan->save();

        return response()->json([
            'message' => $plan->is_active ? 'プランを有効化しました' : 'プランを無効化しました',
            'is_active' => $plan->is_active,
        ]);
    }
}
