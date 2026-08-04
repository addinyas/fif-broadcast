<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kios', function (Blueprint $table) {
            $table->string('cabang_id', 10)->nullable()->after('kios_name');
        });

        Schema::create('kios_wilayah', function (Blueprint $table) {
            $table->id();
            $table->string('kios_id', 10);
            $table->string('kecamatan', 100);
            $table->string('kelurahan', 100)->nullable();
            $table->timestamps();

            $table->unique(['kios_id', 'kecamatan', 'kelurahan'], 'kios_wilayah_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kios_wilayah');
        Schema::table('kios', function (Blueprint $table) {
            $table->dropColumn('cabang_id');
        });
    }
};
