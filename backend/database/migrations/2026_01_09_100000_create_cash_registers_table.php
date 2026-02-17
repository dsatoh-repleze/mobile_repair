<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('opened_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->dateTime('opened_at');
            $table->dateTime('closed_at')->nullable();
            $table->integer('opening_amount')->default(0); // 準備金
            $table->integer('expected_amount')->nullable(); // 理論値（自動計算）
            $table->integer('actual_amount')->nullable(); // 実査金額
            $table->integer('discrepancy')->nullable(); // 違算
            $table->text('discrepancy_note')->nullable(); // 違算理由
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamps();

            $table->index(['store_id', 'status']);
            $table->index(['store_id', 'opened_at']);
        });

        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_id')->constrained()->cascadeOnDelete();
            $table->foreignId('staff_id')->nullable()->constrained('staffs')->nullOnDelete();
            $table->enum('type', ['deposit', 'withdrawal', 'sale', 'refund']); // 入金, 出金, 売上, 返金
            $table->integer('amount');
            $table->string('description')->nullable();
            $table->string('reference_type')->nullable(); // order, manual など
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->timestamps();

            $table->index(['cash_register_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_transactions');
        Schema::dropIfExists('cash_registers');
    }
};
