<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('number_warmup_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('stage', ['inactive', 'passive', 'active', 'mature'])->default('inactive');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('stage_started_at')->nullable();
            $table->integer('daily_outbound_limit')->default(0);
            $table->integer('messages_sent_today')->default(0);
            $table->date('counter_date')->nullable();
            $table->timestamp('last_send_at')->nullable();
            $table->integer('consecutive_active_days')->default(0);
            $table->json('health')->nullable();
            $table->json('flags')->nullable();
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('number_warmup_profiles');
    }
};
