<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broadcast_schedules', function (Blueprint $table) {
            $table->json('template_ids')->nullable()->after('template_body');
        });
    }

    public function down(): void
    {
        Schema::table('broadcast_schedules', function (Blueprint $table) {
            $table->dropColumn('template_ids');
        });
    }
};
