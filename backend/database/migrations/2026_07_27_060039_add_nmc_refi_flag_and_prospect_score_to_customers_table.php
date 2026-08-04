<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('nmc_refi_flag')->nullable()->after('no_contract'); // 'NMC' | 'REFI'
            $table->integer('prospect_score')->nullable()->after('assignment_status'); // 25 | 50 | 75 | 100
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['nmc_refi_flag', 'prospect_score']);
        });
    }
};
