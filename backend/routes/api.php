<?php

use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\MemberController;
use App\Http\Controllers\Api\Admin\PlanController;
use App\Http\Controllers\Api\Admin\ProductController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\StaffController;
use App\Http\Controllers\Api\Admin\StocktakingController;
use App\Http\Controllers\Api\Admin\StoreController;
use App\Http\Controllers\Api\Auth\AdminAuthController;
use App\Http\Controllers\Api\Auth\MemberAuthController;
use App\Http\Controllers\Api\Auth\StaffAuthController;
use App\Http\Controllers\Api\EcOrderController;
use App\Http\Controllers\Api\MemberOrderController;
use App\Http\Controllers\Api\MemberSubscriptionController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\Staff\POSController;
use App\Http\Controllers\Api\Staff\StockController;
use App\Http\Controllers\Api\StaffRedemptionController;
use App\Http\Controllers\Api\TicketController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin Authentication Routes
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->group(function () {
    Route::post('/login', [AdminAuthController::class, 'login']);

    // Protected admin routes
    Route::middleware('auth:admin')->group(function () {
        Route::post('/logout', [AdminAuthController::class, 'logout']);
        Route::post('/refresh', [AdminAuthController::class, 'refresh']);
        Route::get('/me', [AdminAuthController::class, 'me']);
        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/dashboard/activity', [DashboardController::class, 'recentActivity']);
        Route::get('/dashboard/trend', [DashboardController::class, 'monthlyTrend']);
        Route::get('/dashboard/stores', [DashboardController::class, 'storeStats']);
        Route::get('/dashboard/tickets', [DashboardController::class, 'ticketDistribution']);
        Route::get('/dashboard/staff-ranking', [DashboardController::class, 'staffRanking']);
        Route::get('/dashboard/sales-trend', [DashboardController::class, 'salesTrend']);

        // Plans management
        Route::get('/plans', [PlanController::class, 'index']);
        Route::post('/plans', [PlanController::class, 'store']);
        Route::get('/plans/{id}', [PlanController::class, 'show']);
        Route::put('/plans/{id}', [PlanController::class, 'update']);
        Route::delete('/plans/{id}', [PlanController::class, 'destroy']);
        Route::post('/plans/{id}/toggle-status', [PlanController::class, 'toggleStatus']);

        // Stores management
        Route::get('/stores', [StoreController::class, 'index']);
        Route::post('/stores', [StoreController::class, 'store']);
        Route::get('/stores/{id}', [StoreController::class, 'show']);
        Route::put('/stores/{id}', [StoreController::class, 'update']);
        Route::delete('/stores/{id}', [StoreController::class, 'destroy']);
        Route::get('/stores/{id}/stats', [StoreController::class, 'stats']);

        // Products management
        Route::get('/products', [ProductController::class, 'index']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::get('/products/categories', [ProductController::class, 'categories']);
        Route::get('/products/stores', [ProductController::class, 'stores']);
        Route::get('/products/{product}', [ProductController::class, 'show']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::post('/products/{product}/adjust-stock', [ProductController::class, 'adjustStock']);
        Route::get('/products/{product}/stocks', [ProductController::class, 'storeStocks']);
        Route::put('/products/{product}/stocks/{store}', [ProductController::class, 'updateStoreStock']);
        Route::post('/products/{product}/stocks/{store}/toggle-status', [ProductController::class, 'toggleStoreStatus']);
        Route::get('/products/export/stock', [ProductController::class, 'exportStockCsv']);

        // Reports
        Route::get('/reports/stores', [ReportController::class, 'stores']);
        Route::get('/reports/transactions', [ReportController::class, 'transactions']);
        Route::get('/reports/sales/summary', [ReportController::class, 'salesSummary']);
        Route::get('/reports/sales/export', [ReportController::class, 'exportSalesCsv']);

        // Staff management
        Route::get('/staffs', [StaffController::class, 'index']);
        Route::post('/staffs', [StaffController::class, 'store']);
        Route::get('/staffs/stores', [StaffController::class, 'stores']);
        Route::get('/staffs/roles', [StaffController::class, 'roles']);
        Route::get('/staffs/{id}', [StaffController::class, 'show']);
        Route::put('/staffs/{id}', [StaffController::class, 'update']);
        Route::delete('/staffs/{id}', [StaffController::class, 'destroy']);

        // Members management
        Route::get('/members', [MemberController::class, 'index']);
        Route::get('/members/statuses', [MemberController::class, 'statuses']);
        Route::get('/members/{id}', [MemberController::class, 'show']);
        Route::put('/members/{id}', [MemberController::class, 'update']);
        Route::delete('/members/{id}', [MemberController::class, 'destroy']);

        // Stocktaking (棚卸し)
        Route::get('/stocktaking', [StocktakingController::class, 'index']);
        Route::post('/stocktaking', [StocktakingController::class, 'store']);
        Route::get('/stocktaking/{id}', [StocktakingController::class, 'show']);
        Route::put('/stocktaking/{sessionId}/items/{itemId}', [StocktakingController::class, 'updateItem']);
        Route::post('/stocktaking/{sessionId}/scan', [StocktakingController::class, 'scanBarcode']);
        Route::post('/stocktaking/{id}/complete', [StocktakingController::class, 'complete']);
        Route::post('/stocktaking/{id}/cancel', [StocktakingController::class, 'cancel']);
    });
});

/*
|--------------------------------------------------------------------------
| Staff Authentication Routes
|--------------------------------------------------------------------------
*/
Route::prefix('staff')->group(function () {
    Route::post('/login', [StaffAuthController::class, 'login']);

    // Protected staff routes (staff only)
    Route::middleware('auth:staff')->group(function () {
        Route::post('/logout', [StaffAuthController::class, 'logout']);
        Route::post('/refresh', [StaffAuthController::class, 'refresh']);
        Route::get('/me', [StaffAuthController::class, 'me']);
    });

    // POS routes (admin or staff)
    Route::middleware('auth:admin,staff')->group(function () {
        // 店舗一覧（POS用）
        Route::get('/stores', [POSController::class, 'stores']);

        Route::get('/members/search', [StaffRedemptionController::class, 'searchMember']);
        Route::get('/members/{memberId}/tickets', [StaffRedemptionController::class, 'getMemberTickets']);
        Route::post('/tickets/{ticketId}/redeem', [StaffRedemptionController::class, 'redeemForMember']);
        Route::get('/redemptions/today', [StaffRedemptionController::class, 'todayHistory']);

        // POS機能
        Route::get('/pos/products', [POSController::class, 'products']);
        Route::post('/pos/scan', [POSController::class, 'scanBarcode']);
        Route::post('/pos/sale', [POSController::class, 'createSale']);
        Route::get('/pos/sales', [POSController::class, 'salesHistory']);

        // 在庫管理（自店舗のみ）
        Route::get('/stock', [StockController::class, 'index']);
        Route::get('/stock/categories', [StockController::class, 'categories']);
        Route::get('/stock/summary', [StockController::class, 'summary']);
        Route::get('/stock/export', [StockController::class, 'exportCsv']);
        Route::post('/stock/{productId}/adjust', [StockController::class, 'adjust']);
    });
});

/*
|--------------------------------------------------------------------------
| Member Authentication Routes
|--------------------------------------------------------------------------
*/
Route::prefix('member')->group(function () {
    Route::post('/register', [MemberAuthController::class, 'register']);
    Route::post('/login', [MemberAuthController::class, 'login']);

    // Protected member routes
    Route::middleware('auth:member')->group(function () {
        Route::post('/logout', [MemberAuthController::class, 'logout']);
        Route::post('/refresh', [MemberAuthController::class, 'refresh']);
        Route::get('/me', [MemberAuthController::class, 'me']);
        Route::get('/tickets', [TicketController::class, 'index']);
        Route::get('/tickets/{id}', [TicketController::class, 'show']);
        Route::get('/tickets/{id}/prepare-redeem', [TicketController::class, 'prepareRedeem']);
        Route::post('/tickets/{id}/redeem', [TicketController::class, 'redeem']);
        Route::get('/redemption-history', [TicketController::class, 'history']);

        // 購入履歴
        Route::get('/orders', [MemberOrderController::class, 'index']);
        Route::get('/orders/{id}', [MemberOrderController::class, 'show']);

        // EC注文
        Route::post('/ec-orders', [EcOrderController::class, 'store']);

        // サブスクリプション
        Route::get('/subscription/plans', [MemberSubscriptionController::class, 'plans']);
        Route::get('/subscription/current', [MemberSubscriptionController::class, 'current']);
        Route::post('/subscription/subscribe', [MemberSubscriptionController::class, 'subscribe']);
        Route::post('/subscription/cancel', [MemberSubscriptionController::class, 'cancel']);
    });
});

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
// デジタルレシート（公開アクセス）
Route::get('/receipt/{uuid}', [ReceiptController::class, 'show']);

// ショップAPI（公開アクセス）
Route::prefix('shop')->group(function () {
    Route::get('/stores', [ShopController::class, 'stores']);
    Route::get('/products', [ShopController::class, 'products']);
    Route::get('/products/{id}', [ShopController::class, 'productDetail']);
    Route::get('/staffs', [ShopController::class, 'staffs']);
});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});
