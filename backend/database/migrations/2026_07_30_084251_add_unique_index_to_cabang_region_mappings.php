<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cabang_region_mappings', function (Blueprint $table) {
            $dbDriver = DB::getDriverName();
            if ($dbDriver === 'pgsql') {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS cabang_mappings_unique_idx ON cabang_region_mappings (COALESCE(kecamatan, \'\'), COALESCE(kelurahan, \'\'))');
            } else {
                $table->unique(['kecamatan', 'kelurahan'], 'cabang_mappings_unique_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cabang_region_mappings', function (Blueprint $table) {
            $table->dropIndex('cabang_mappings_unique_idx');
        });
    }
};
