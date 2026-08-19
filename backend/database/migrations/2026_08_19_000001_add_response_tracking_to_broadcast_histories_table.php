<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broadcast_histories', function (Blueprint $table) {
            $table->timestamp('replied_at')->nullable()->after('sent_at');
            $table->integer('prospect_score')->nullable()->after('replied_at');
        });
    }

    public function down(): void
    {
        Schema::table('broadcast_histories', function (Blueprint $table) {
            $table->dropColumn(['replied_at', 'prospect_score']);
        });
    }
};
