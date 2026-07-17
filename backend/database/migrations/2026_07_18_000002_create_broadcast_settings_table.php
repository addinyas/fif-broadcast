<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('broadcast_settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key')->unique();
            $table->text('setting_value');
            $table->timestamps();
        });

        $defaults = [
            'messages_per_session' => '50',
            'min_delay_sec' => '6',
            'max_delay_sec' => '12',
            'rest_every_x_messages' => '12',
            'rest_duration_min_sec' => '30',
            'rest_duration_max_sec' => '90',
            'session_break_min_sec' => '1200',
            'session_break_max_sec' => '2400',
            'max_retry' => '3',
            'random_template' => '1',
            'random_delay' => '1',
            'concurrency' => '6',
            'queue_enabled' => '1',
        ];

        $now = now()->toDateTimeString();
        $rows = [];
        foreach ($defaults as $key => $value) {
            $rows[] = "('{$key}', '{$value}', '{$now}', '{$now}')";
        }

        DB::statement('INSERT INTO broadcast_settings (setting_key, setting_value, created_at, updated_at) VALUES '.implode(', ', $rows));
    }

    public function down(): void
    {
        Schema::dropIfExists('broadcast_settings');
    }
};
