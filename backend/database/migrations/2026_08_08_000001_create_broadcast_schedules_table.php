<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('broadcast_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->time('schedule_time'); // e.g. 09:00:00 WIB
            $table->json('days_active'); // e.g. ["Mon","Tue",...] — day-of-week ISO names
            $table->text('template_body')->nullable(); // literal template or 'random'
            $table->boolean('active')->default(true);
            $table->date('last_run_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('broadcast_schedules');
    }
};
