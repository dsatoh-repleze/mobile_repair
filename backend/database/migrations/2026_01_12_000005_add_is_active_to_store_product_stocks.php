<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add is_active column to store_product_stocks
        Schema::table('store_product_stocks', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('low_stock_threshold');
        });

        // Migrate is_active data from products to all store_product_stocks
        $products = DB::table('products')->get(['id', 'is_active']);
        foreach ($products as $product) {
            DB::table('store_product_stocks')
                ->where('product_id', $product->id)
                ->update(['is_active' => $product->is_active]);
        }

        // Remove is_active from products table (keep is_ec_visible for EC global visibility)
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });
    }

    public function down(): void
    {
        // Re-add is_active to products table
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('image_url');
        });

        // Migrate is_active back (use any store's value, prefer true if any store has it active)
        $stocks = DB::table('store_product_stocks')
            ->select('product_id', DB::raw('MAX(is_active) as is_active'))
            ->groupBy('product_id')
            ->get();

        foreach ($stocks as $stock) {
            DB::table('products')
                ->where('id', $stock->product_id)
                ->update(['is_active' => $stock->is_active]);
        }

        // Remove is_active from store_product_stocks
        Schema::table('store_product_stocks', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });
    }
};
