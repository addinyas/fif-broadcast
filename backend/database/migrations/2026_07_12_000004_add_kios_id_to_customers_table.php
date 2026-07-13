<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('kios_id')->nullable()->after('uploaded_by');
        });

        // Backfill: set kios_id from uploader's kios
        $users = DB::table('users')->whereNotNull('kios_id')->pluck('kios_id', 'id');
        $customers = DB::table('customers')->select('id', 'uploaded_by')->get();
        foreach ($customers as $c) {
            $kiosId = $users->get($c->uploaded_by) ?? null;
            if ($kiosId) {
                DB::table('customers')->where('id', $c->id)->update(['kios_id' => $kiosId]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('kios_id');
        });
    }
};
