<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 棚卸しセッション
        Schema::create('stocktaking_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('staffs')->cascadeOnDelete();
            $table->foreignId('completed_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->enum('status', ['in_progress', 'completed', 'cancelled'])->default('in_progress');
            $table->text('notes')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'status']);
            $table->index('started_at');
        });

        // 棚卸し明細
        Schema::create('stocktaking_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stocktaking_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->integer('system_quantity')->comment('システム上の在庫数');
            $table->integer('actual_quantity')->nullable()->comment('実際の在庫数');
            $table->integer('difference')->nullable()->comment('差異（実際 - システム）');
            $table->text('notes')->nullable();
            $table->boolean('is_counted')->default(false);
            $table->timestamps();

            $table->unique(['stocktaking_session_id', 'product_id']);
            $table->index('is_counted');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stocktaking_items');
        Schema::dropIfExists('stocktaking_sessions');
    }
};
