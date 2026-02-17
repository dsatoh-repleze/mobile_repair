<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\Order;
use App\Models\RedemptionLog;
use App\Models\Staff;
use App\Models\Store;
use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get overview statistics
     */
    public function index(): JsonResponse
    {
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

        // Total members
        $totalMembers = Member::count();
        $newMembersThisMonth = Member::where('created_at', '>=', $startOfMonth)->count();
        $newMembersLastMonth = Member::whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->count();
        $memberGrowthRate = $newMembersLastMonth > 0
            ? round((($newMembersThisMonth - $newMembersLastMonth) / $newMembersLastMonth) * 100, 1)
            : ($newMembersThisMonth > 0 ? 100 : 0);

        // Redemptions this month
        $redemptionsThisMonth = RedemptionLog::where('redeemed_at', '>=', $startOfMonth)->count();
        $redemptionsLastMonth = RedemptionLog::whereBetween('redeemed_at', [$startOfLastMonth, $endOfLastMonth])->count();
        $redemptionGrowthRate = $redemptionsLastMonth > 0
            ? round((($redemptionsThisMonth - $redemptionsLastMonth) / $redemptionsLastMonth) * 100, 1)
            : ($redemptionsThisMonth > 0 ? 100 : 0);

        // Active tickets
        $activeTickets = Ticket::where('status', 'active')
            ->where('remaining_uses', '>', 0)
            ->where('expires_at', '>', $now)
            ->count();

        // Total remaining uses
        $totalRemainingUses = Ticket::where('status', 'active')
            ->where('remaining_uses', '>', 0)
            ->where('expires_at', '>', $now)
            ->sum('remaining_uses');

        // Stores count
        $storesCount = Store::count();

        // Sales statistics
        $salesToday = Order::paid()->whereDate('created_at', $now->toDateString())->sum('total_amount');
        $salesThisMonth = Order::paid()->where('created_at', '>=', $startOfMonth)->sum('total_amount');
        $salesLastMonth = Order::paid()->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->sum('total_amount');
        $salesGrowthRate = $salesLastMonth > 0
            ? round((($salesThisMonth - $salesLastMonth) / $salesLastMonth) * 100, 1)
            : ($salesThisMonth > 0 ? 100 : 0);

        $ordersToday = Order::paid()->whereDate('created_at', $now->toDateString())->count();
        $ordersThisMonth = Order::paid()->where('created_at', '>=', $startOfMonth)->count();

        return response()->json([
            'stats' => [
                'total_members' => $totalMembers,
                'new_members_this_month' => $newMembersThisMonth,
                'member_growth_rate' => $memberGrowthRate,
                'redemptions_this_month' => $redemptionsThisMonth,
                'redemption_growth_rate' => $redemptionGrowthRate,
                'active_tickets' => $activeTickets,
                'total_remaining_uses' => $totalRemainingUses,
                'stores_count' => $storesCount,
                'sales_today' => $salesToday,
                'sales_this_month' => $salesThisMonth,
                'sales_growth_rate' => $salesGrowthRate,
                'orders_today' => $ordersToday,
                'orders_this_month' => $ordersThisMonth,
            ],
        ]);
    }

    /**
     * Get recent redemption activity
     */
    public function recentActivity(): JsonResponse
    {
        $recentLogs = RedemptionLog::with(['member', 'staff', 'store', 'ticket'])
            ->orderBy('redeemed_at', 'desc')
            ->limit(20)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'member_name' => $log->member?->name ?? '不明',
                    'staff_name' => $log->staff?->name ?? 'セルフ',
                    'store_name' => $log->store?->name ?? '不明',
                    'ticket_type' => $log->ticket?->ticket_type ?? '不明',
                    'redeemed_at' => $log->redeemed_at->format('Y-m-d H:i'),
                    'time_ago' => $log->redeemed_at->diffForHumans(),
                ];
            });

        return response()->json([
            'activities' => $recentLogs,
        ]);
    }

    /**
     * Get monthly redemption trend
     */
    public function monthlyTrend(): JsonResponse
    {
        $months = collect();
        for ($i = 11; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $months->push([
                'year' => $date->year,
                'month' => $date->month,
                'label' => $date->format('Y年n月'),
            ]);
        }

        $redemptions = RedemptionLog::select(
            DB::raw('YEAR(redeemed_at) as year'),
            DB::raw('MONTH(redeemed_at) as month'),
            DB::raw('COUNT(*) as count')
        )
            ->where('redeemed_at', '>=', Carbon::now()->subMonths(11)->startOfMonth())
            ->groupBy('year', 'month')
            ->get()
            ->keyBy(function ($item) {
                return $item->year . '-' . $item->month;
            });

        $trend = $months->map(function ($month) use ($redemptions) {
            $key = $month['year'] . '-' . $month['month'];
            return [
                'label' => $month['label'],
                'count' => $redemptions->has($key) ? $redemptions[$key]->count : 0,
            ];
        });

        return response()->json([
            'trend' => $trend->values(),
        ]);
    }

    /**
     * Get redemption stats by store
     */
    public function storeStats(): JsonResponse
    {
        $startOfMonth = Carbon::now()->startOfMonth();

        $stats = Store::withCount(['staffs'])
            ->get()
            ->map(function ($store) use ($startOfMonth) {
                $redemptionsThisMonth = RedemptionLog::where('store_id', $store->id)
                    ->where('redeemed_at', '>=', $startOfMonth)
                    ->count();

                $totalRedemptions = RedemptionLog::where('store_id', $store->id)->count();

                return [
                    'id' => $store->id,
                    'name' => $store->name,
                    'prefecture' => $store->prefecture,
                    'staff_count' => $store->staffs_count,
                    'redemptions_this_month' => $redemptionsThisMonth,
                    'total_redemptions' => $totalRedemptions,
                ];
            })
            ->sortByDesc('redemptions_this_month')
            ->values();

        return response()->json([
            'stores' => $stats,
        ]);
    }

    /**
     * Get ticket type distribution
     */
    public function ticketDistribution(): JsonResponse
    {
        $distribution = Ticket::select('ticket_type', DB::raw('COUNT(*) as count'), DB::raw('SUM(remaining_uses) as remaining'))
            ->where('status', 'active')
            ->where('expires_at', '>', now())
            ->groupBy('ticket_type')
            ->get();

        return response()->json([
            'distribution' => $distribution,
        ]);
    }

    /**
     * Get staff sales ranking
     */
    public function staffRanking(Request $request): JsonResponse
    {
        $period = $request->get('period', 'month'); // today, week, month, year, all
        $storeId = $request->get('store_id');

        $now = Carbon::now();

        $query = Order::paid()
            ->select(
                'staff_id',
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(total_amount) as total_sales')
            )
            ->whereNotNull('staff_id')
            ->groupBy('staff_id');

        // Period filter
        switch ($period) {
            case 'today':
                $query->whereDate('created_at', $now->toDateString());
                break;
            case 'week':
                $query->where('created_at', '>=', $now->copy()->startOfWeek());
                break;
            case 'month':
                $query->where('created_at', '>=', $now->copy()->startOfMonth());
                break;
            case 'year':
                $query->where('created_at', '>=', $now->copy()->startOfYear());
                break;
            // 'all' - no filter
        }

        // Store filter
        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        $rankings = $query->orderBy('total_sales', 'desc')->get();

        // Get staff details
        $staffIds = $rankings->pluck('staff_id');
        $staffs = Staff::whereIn('id', $staffIds)->with('store')->get()->keyBy('id');

        $result = $rankings->map(function ($ranking, $index) use ($staffs) {
            $staff = $staffs->get($ranking->staff_id);
            return [
                'rank' => $index + 1,
                'staff_id' => $ranking->staff_id,
                'staff_name' => $staff?->name ?? '不明',
                'store_name' => $staff?->store?->name ?? '不明',
                'order_count' => $ranking->order_count,
                'total_sales' => $ranking->total_sales,
                'average_order' => $ranking->order_count > 0
                    ? round($ranking->total_sales / $ranking->order_count)
                    : 0,
            ];
        });

        // Summary
        $totalSales = $rankings->sum('total_sales');
        $totalOrders = $rankings->sum('order_count');

        return response()->json([
            'rankings' => $result->values(),
            'summary' => [
                'total_sales' => $totalSales,
                'total_orders' => $totalOrders,
                'staff_count' => $rankings->count(),
            ],
        ]);
    }

    /**
     * Get sales trend (daily for current month)
     */
    public function salesTrend(Request $request): JsonResponse
    {
        $storeId = $request->get('store_id');
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();

        $query = Order::paid()
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(total_amount) as total_sales')
            )
            ->where('created_at', '>=', $startOfMonth)
            ->groupBy('date')
            ->orderBy('date');

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        $dailySales = $query->get()->keyBy('date');

        // Fill all days of the month
        $days = collect();
        for ($i = 0; $i < $now->day; $i++) {
            $date = $startOfMonth->copy()->addDays($i)->format('Y-m-d');
            $days->push([
                'date' => $date,
                'label' => Carbon::parse($date)->format('n/j'),
                'order_count' => $dailySales->has($date) ? $dailySales[$date]->order_count : 0,
                'total_sales' => $dailySales->has($date) ? $dailySales[$date]->total_sales : 0,
            ]);
        }

        return response()->json([
            'trend' => $days->values(),
        ]);
    }
}
