<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cabang_wilayah', function (Blueprint $table) {
            $table->id();
            $table->string('cabang_id', 10);
            $table->string('kecamatan', 100);
            $table->string('kelurahan', 100)->nullable();
            $table->timestamps();

            $table->unique(['kecamatan', 'kelurahan'], 'cabang_wilayah_unique');
        });

        Schema::dropIfExists('kios_wilayah');
    }

    public function down(): void
    {
        Schema::create('kios_wilayah', function (Blueprint $table) {
            $table->id();
            $table->string('kios_id', 10);
            $table->string('kecamatan', 100);
            $table->string('kelurahan', 100)->nullable();
            $table->timestamps();

            $table->unique(['kios_id', 'kecamatan', 'kelurahan'], 'kios_wilayah_unique');
        });

        Schema::dropIfExists('cabang_wilayah');
    }
};
