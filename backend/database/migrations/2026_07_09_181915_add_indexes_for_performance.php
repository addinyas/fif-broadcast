<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->index('assignment_status');
            $table->index('marketing_id');
            $table->index('no_contract');
            $table->index(['marketing_id', 'assignment_status']);
        });

        Schema::table('broadcast_histories', function (Blueprint $table) {
            $table->index('marketing_id');
            $table->index('status');
            $table->index('sent_at');
            $table->index('created_at');
            $table->index(['marketing_id', 'status']);
            $table->index(['marketing_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['assignment_status']);
            $table->dropIndex(['marketing_id']);
            $table->dropIndex(['no_contract']);
            $table->dropIndex(['marketing_id', 'assignment_status']);
        });

        Schema::table('broadcast_histories', function (Blueprint $table) {
            $table->dropIndex(['marketing_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['sent_at']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['marketing_id', 'status']);
            $table->dropIndex(['marketing_id', 'created_at']);
        });
    }
};
