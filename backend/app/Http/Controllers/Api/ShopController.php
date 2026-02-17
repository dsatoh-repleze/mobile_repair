<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Staff;
use App\Models\Store;
use App\Models\StoreProductStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShopController extends Controller
{
    /**
     * 店舗一覧を取得（公開API）
     */
    public function stores(): JsonResponse
    {
        $stores = Store::orderBy('name')->get(['id', 'name', 'prefecture']);

        return response()->json([
            'stores' => $stores,
        ]);
    }

    /**
     * 店舗別商品一覧を取得（公開API）
     */
    public function products(Request $request): JsonResponse
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'category' => 'nullable|string',
            'search' => 'nullable|string|max:100',
        ]);

        $storeId = $request->store_id;

        $query = Product::activeForStore($storeId);

        // 検索
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // カテゴリフィルター
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $products = $query->orderBy('name')->get();

        // カテゴリ一覧を取得
        $categories = Product::activeForStore($storeId)
            ->distinct()
            ->whereNotNull('category')
            ->pluck('category')
            ->sort()
            ->values();

        return response()->json([
            'products' => $products->map(function ($p) use ($storeId) {
                $stock = $p->getStockForStore($storeId);
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'description' => $p->description,
                    'price' => $p->price,
                    'stock_quantity' => $stock ? $stock->stock_quantity : 0,
                    'category' => $p->category,
                    'image_url' => $p->image_url,
                    'is_low_stock' => $stock ? $stock->isLowStock() : true,
                ];
            }),
            'categories' => $categories,
        ]);
    }

    /**
     * 商品詳細を取得（公開API）
     */
    public function productDetail(Request $request, int $productId): JsonResponse
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
        ]);

        $storeId = $request->store_id;

        $product = Product::activeForStore($storeId)->find($productId);

        if (!$product) {
            return response()->json([
                'message' => '商品が見つかりません',
            ], 404);
        }

        $stock = $product->getStockForStore($storeId);

        return response()->json([
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'description' => $product->description,
                'price' => $product->price,
                'stock_quantity' => $stock ? $stock->stock_quantity : 0,
                'category' => $product->category,
                'image_url' => $product->image_url,
                'is_low_stock' => $stock ? $stock->isLowStock() : true,
            ],
        ]);
    }

    /**
     * スタッフ一覧を取得（公開API）
     */
    public function staffs(Request $request): JsonResponse
    {
        $query = Staff::query();

        // 店舗でフィルタリング（任意）
        if ($request->filled('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        $staffs = $query->orderBy('name')->get(['id', 'name', 'store_id']);

        return response()->json([
            'staffs' => $staffs->map(fn($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'store_id' => $s->store_id,
            ]),
        ]);
    }
}
