<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('gender')->nullable()->after('avatar');
            $table->string('npo_mce_id')->nullable()->after('gender');
            $table->string('kios_name')->nullable()->after('npo_mce_id');
            $table->string('kios_id')->nullable()->after('kios_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['gender', 'npo_mce_id', 'kios_name', 'kios_id']);
        });
    }
};
