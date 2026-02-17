<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop cash_transactions first (has foreign key to cash_registers)
        Schema::dropIfExists('cash_transactions');
        Schema::dropIfExists('cash_registers');

        // Remove cash-related columns from orders table
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'received_amount')) {
                $table->dropColumn('received_amount');
            }
            if (Schema::hasColumn('orders', 'change_amount')) {
                $table->dropColumn('change_amount');
            }
        });
    }

    public function down(): void
    {
        // Recreate cash_registers table
        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('opened_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->dateTime('opened_at');
            $table->dateTime('closed_at')->nullable();
            $table->integer('opening_amount')->default(0);
            $table->integer('expected_amount')->nullable();
            $table->integer('actual_amount')->nullable();
            $table->integer('discrepancy')->nullable();
            $table->text('discrepancy_note')->nullable();
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamps();

            $table->index(['store_id', 'status']);
            $table->index(['store_id', 'opened_at']);
        });

        // Recreate cash_transactions table
        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_id')->constrained()->cascadeOnDelete();
            $table->foreignId('staff_id')->nullable()->constrained('staffs')->nullOnDelete();
            $table->enum('type', ['deposit', 'withdrawal', 'sale', 'refund']);
            $table->integer('amount');
            $table->string('description')->nullable();
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->timestamps();

            $table->index(['cash_register_id', 'type']);
        });

        // Restore cash-related columns to orders table
        Schema::table('orders', function (Blueprint $table) {
            $table->integer('received_amount')->nullable();
            $table->integer('change_amount')->nullable();
        });
    }
};
