<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'permissions_mode')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('permissions_mode', 16)->default('inherit')->after('permissions');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'permissions_mode')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('permissions_mode');
            });
        }
    }
};
