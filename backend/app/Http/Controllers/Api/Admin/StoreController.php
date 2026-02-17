<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\RedemptionLog;
use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StoreController extends Controller
{
    /**
     * Display a listing of stores
     */
    public function index(Request $request): JsonResponse
    {
        $query = Store::withCount('staffs');

        if ($request->has('prefecture') && $request->prefecture) {
            $query->where('prefecture', $request->prefecture);
        }

        $stores = $query->orderBy('name')
            ->get()
            ->map(function ($store) {
                $startOfMonth = Carbon::now()->startOfMonth();
                $redemptionsThisMonth = RedemptionLog::where('store_id', $store->id)
                    ->where('redeemed_at', '>=', $startOfMonth)
                    ->count();

                return [
                    'id' => $store->id,
                    'name' => $store->name,
                    'address' => $store->address,
                    'phone' => $store->phone,
                    'prefecture' => $store->prefecture,
                    'staff_count' => $store->staffs_count,
                    'redemptions_this_month' => $redemptionsThisMonth,
                    'created_at' => $store->created_at->format('Y-m-d H:i'),
                ];
            });

        // Get unique prefectures for filter
        $prefectures = Store::distinct()->pluck('prefecture')->filter()->sort()->values();

        return response()->json([
            'stores' => $stores,
            'prefectures' => $prefectures,
        ]);
    }

    /**
     * Store a newly created store
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:stores',
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:20',
            'prefecture' => 'required|string|max:50',
        ]);

        $store = Store::create($validated);

        return response()->json([
            'message' => '店舗を作成しました',
            'store' => [
                'id' => $store->id,
                'name' => $store->name,
                'address' => $store->address,
                'phone' => $store->phone,
                'prefecture' => $store->prefecture,
            ],
        ], 201);
    }

    /**
     * Display the specified store
     */
    public function show(int $id): JsonResponse
    {
        $store = Store::with('staffs')->findOrFail($id);

        $startOfMonth = Carbon::now()->startOfMonth();
        $redemptionsThisMonth = RedemptionLog::where('store_id', $store->id)
            ->where('redeemed_at', '>=', $startOfMonth)
            ->count();

        $totalRedemptions = RedemptionLog::where('store_id', $store->id)->count();

        return response()->json([
            'store' => [
                'id' => $store->id,
                'name' => $store->name,
                'address' => $store->address,
                'phone' => $store->phone,
                'prefecture' => $store->prefecture,
                'staff_count' => $store->staffs->count(),
                'staffs' => $store->staffs->map(function ($staff) {
                    return [
                        'id' => $staff->id,
                        'name' => $staff->name,
                        'email' => $staff->email,
                    ];
                }),
                'redemptions_this_month' => $redemptionsThisMonth,
                'total_redemptions' => $totalRedemptions,
                'created_at' => $store->created_at->format('Y-m-d H:i'),
                'updated_at' => $store->updated_at->format('Y-m-d H:i'),
            ],
        ]);
    }

    /**
     * Update the specified store
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $store = Store::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('stores')->ignore($store->id)],
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:20',
            'prefecture' => 'required|string|max:50',
        ]);

        $store->update($validated);

        return response()->json([
            'message' => '店舗情報を更新しました',
            'store' => [
                'id' => $store->id,
                'name' => $store->name,
                'address' => $store->address,
                'phone' => $store->phone,
                'prefecture' => $store->prefecture,
            ],
        ]);
    }

    /**
     * Remove the specified store
     */
    public function destroy(int $id): JsonResponse
    {
        $store = Store::withCount('staffs')->findOrFail($id);

        if ($store->staffs_count > 0) {
            return response()->json([
                'message' => 'この店舗にはスタッフが所属しているため削除できません',
            ], 422);
        }

        $store->delete();

        return response()->json([
            'message' => '店舗を削除しました',
        ]);
    }

    /**
     * Get store statistics
     */
    public function stats(int $id): JsonResponse
    {
        $store = Store::findOrFail($id);

        // Get monthly redemptions for last 12 months
        $months = collect();
        for ($i = 11; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $startOfMonth = $date->copy()->startOfMonth();
            $endOfMonth = $date->copy()->endOfMonth();

            $count = RedemptionLog::where('store_id', $store->id)
                ->whereBetween('redeemed_at', [$startOfMonth, $endOfMonth])
                ->count();

            $months->push([
                'label' => $date->format('Y年n月'),
                'count' => $count,
            ]);
        }

        return response()->json([
            'store_id' => $store->id,
            'store_name' => $store->name,
            'monthly_redemptions' => $months,
        ]);
    }
}
