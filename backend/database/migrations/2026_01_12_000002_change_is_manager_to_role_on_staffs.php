<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffs', function (Blueprint $table) {
            $table->enum('role', ['admin', 'manager', 'staff', 'user'])->default('staff')->after('store_id');
        });

        // Migrate existing data: is_manager=true -> manager, is_manager=false -> staff
        DB::table('staffs')->where('is_manager', true)->update(['role' => 'manager']);
        DB::table('staffs')->where('is_manager', false)->update(['role' => 'staff']);

        Schema::table('staffs', function (Blueprint $table) {
            $table->dropColumn('is_manager');
        });
    }

    public function down(): void
    {
        Schema::table('staffs', function (Blueprint $table) {
            $table->boolean('is_manager')->default(false)->after('store_id');
        });

        // Migrate data back
        DB::table('staffs')->whereIn('role', ['admin', 'manager'])->update(['is_manager' => true]);
        DB::table('staffs')->whereIn('role', ['staff', 'user'])->update(['is_manager' => false]);

        Schema::table('staffs', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
