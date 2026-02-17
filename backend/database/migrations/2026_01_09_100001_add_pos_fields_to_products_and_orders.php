<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Products テーブルにPOS関連フィールドを追加
        Schema::table('products', function (Blueprint $table) {
            $table->string('barcode')->nullable()->after('name');
            $table->string('category')->nullable()->after('description');
            $table->boolean('is_ec_visible')->default(true)->after('is_active');

            $table->index('barcode');
            $table->index('category');
        });

        // Orders テーブルにPOS関連フィールドを追加
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('store_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->foreignId('staff_id')->nullable()->after('member_id')->constrained('staffs')->nullOnDelete();
            $table->uuid('receipt_uuid')->nullable()->after('payment_id');
            $table->string('payment_method')->nullable()->after('status'); // cash, credit, qr
            $table->integer('received_amount')->nullable()->after('payment_method');
            $table->integer('change_amount')->nullable()->after('received_amount');

            // member_id をnullable に変更（POS売上は会員情報なしの場合あり）
            $table->unsignedBigInteger('member_id')->nullable()->change();

            $table->index('receipt_uuid');
            $table->index(['store_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['store_id']);
            $table->dropForeign(['staff_id']);
            $table->dropIndex(['receipt_uuid']);
            $table->dropIndex(['store_id', 'created_at']);
            $table->dropColumn(['store_id', 'staff_id', 'receipt_uuid', 'payment_method', 'received_amount', 'change_amount']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['barcode']);
            $table->dropIndex(['category']);
            $table->dropColumn(['barcode', 'category', 'is_ec_visible']);
        });
    }
};
