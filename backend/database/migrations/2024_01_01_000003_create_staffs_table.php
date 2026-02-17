<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staffs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_manager')->default(false);
            $table->rememberToken();
            $table->timestamps();
        });

        // Add foreign key to stores table for manager
        Schema::table('stores', function (Blueprint $table) {
            $table->foreign('manager_id')->references('id')->on('staffs')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropForeign(['manager_id']);
        });

        Schema::dropIfExists('staffs');
    }
};
