<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_product_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->integer('stock_quantity')->default(0);
            $table->integer('low_stock_threshold')->default(10);
            $table->timestamps();

            $table->unique(['store_id', 'product_id']);
        });

        // Migrate existing stock data: create stock records for all stores
        $stores = DB::table('stores')->pluck('id');
        $products = DB::table('products')->get(['id', 'stock_quantity', 'low_stock_threshold']);

        foreach ($stores as $storeId) {
            foreach ($products as $product) {
                DB::table('store_product_stocks')->insert([
                    'store_id' => $storeId,
                    'product_id' => $product->id,
                    'stock_quantity' => $product->stock_quantity,
                    'low_stock_threshold' => $product->low_stock_threshold ?? 10,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Remove stock columns from products table
        Schema::table('products', function (Blueprint $table) {
            // Drop foreign key constraint first if exists
            if (Schema::hasColumn('products', 'store_id')) {
                $table->dropForeign(['store_id']);
            }
        });

        Schema::table('products', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('products', 'stock_quantity')) {
                $columns[] = 'stock_quantity';
            }
            if (Schema::hasColumn('products', 'low_stock_threshold')) {
                $columns[] = 'low_stock_threshold';
            }
            if (Schema::hasColumn('products', 'store_id')) {
                $columns[] = 'store_id';
            }
            if (count($columns) > 0) {
                $table->dropColumn($columns);
            }
        });
    }

    public function down(): void
    {
        // Re-add stock columns to products table
        Schema::table('products', function (Blueprint $table) {
            $table->integer('stock_quantity')->default(0)->after('price');
            $table->integer('low_stock_threshold')->default(10)->after('stock_quantity');
            $table->foreignId('store_id')->nullable()->after('low_stock_threshold');
        });

        // Migrate stock data back (use first store's stock as the product stock)
        $stocks = DB::table('store_product_stocks')
            ->select('product_id', DB::raw('MAX(stock_quantity) as stock_quantity'), DB::raw('MAX(low_stock_threshold) as low_stock_threshold'))
            ->groupBy('product_id')
            ->get();

        foreach ($stocks as $stock) {
            DB::table('products')
                ->where('id', $stock->product_id)
                ->update([
                    'stock_quantity' => $stock->stock_quantity,
                    'low_stock_threshold' => $stock->low_stock_threshold,
                ]);
        }

        Schema::dropIfExists('store_product_stocks');
    }
};
