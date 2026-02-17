<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change any existing 'user' roles to 'staff'
        DB::table('staffs')->where('role', 'user')->update(['role' => 'staff']);

        // Modify enum to remove 'user' option
        DB::statement("ALTER TABLE staffs MODIFY COLUMN role ENUM('admin', 'manager', 'staff') DEFAULT 'staff'");
    }

    public function down(): void
    {
        // Add 'user' back to enum
        DB::statement("ALTER TABLE staffs MODIFY COLUMN role ENUM('admin', 'manager', 'staff', 'user') DEFAULT 'staff'");
    }
};
