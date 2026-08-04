<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('excel_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ao_id')->constrained('users')->onDelete('cascade');
            $table->string('kios_id'); // each config is per-kios
            $table->string('platform'); // 'google_sheets' | 'excel_online'
            $table->string('excel_url');
            $table->string('spreadsheet_id')->nullable(); // Google Sheets ID or OneDrive file ID
            $table->string('sheet_name')->nullable(); // specific sheet/tab name
            $table->json('column_mapping')->nullable(); // { "header_name": "field_key" }
            $table->string('total_rows')->nullable(); // last known row count
            $table->json('oauth_token')->nullable(); // encrypted { access_token, refresh_token, expires_at }
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['ao_id', 'kios_id']); // 1 active config per kios per AO
            $table->index(['kios_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('excel_configs');
    }
};
