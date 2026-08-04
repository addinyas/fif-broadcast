<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const KECAMATAN_KABUPATEN = [
        'Danurejan' => 'Kota Yogyakarta',
        'Gedongtengen' => 'Kota Yogyakarta',
        'Gondokusuman' => 'Kota Yogyakarta',
        'Gondomanan' => 'Kota Yogyakarta',
        'Jetis' => 'Kota Yogyakarta',
        'Kotagede' => 'Kota Yogyakarta',
        'Kraton' => 'Kota Yogyakarta',
        'Mantrijeron' => 'Kota Yogyakarta',
        'Mergangsan' => 'Kota Yogyakarta',
        'Ngampilan' => 'Kota Yogyakarta',
        'Pakualaman' => 'Kota Yogyakarta',
        'Tegalrejo' => 'Kota Yogyakarta',
        'Umbulharjo' => 'Kota Yogyakarta',
        'Wirobrajan' => 'Kota Yogyakarta',
        'Berbah' => 'Sleman',
        'Cangkringan' => 'Sleman',
        'Depok' => 'Sleman',
        'Gamping' => 'Sleman',
        'Godean' => 'Sleman',
        'Kalasan' => 'Sleman',
        'Minggir' => 'Sleman',
        'Mlati' => 'Sleman',
        'Moyudan' => 'Sleman',
        'Ngaglik' => 'Sleman',
        'Ngemplak' => 'Sleman',
        'Pakem' => 'Sleman',
        'Prambanan' => 'Sleman',
        'Seyegan' => 'Sleman',
        'Sleman' => 'Sleman',
        'Tempel' => 'Sleman',
        'Turi' => 'Sleman',
        'Bambanglipuro' => 'Bantul',
        'Banguntapan' => 'Bantul',
        'Bantul' => 'Bantul',
        'Dlingo' => 'Bantul',
        'Imogiri' => 'Bantul',
        'Kasihan' => 'Bantul',
        'Kretek' => 'Bantul',
        'Pajangan' => 'Bantul',
        'Pandak' => 'Bantul',
        'Piyungan' => 'Bantul',
        'Pleret' => 'Bantul',
        'Pundong' => 'Bantul',
        'Sanden' => 'Bantul',
        'Sedayu' => 'Bantul',
        'Sewon' => 'Bantul',
        'Srandakan' => 'Bantul',
        'Galur' => 'Kulon Progo',
        'Girimulyo' => 'Kulon Progo',
        'Kalibawang' => 'Kulon Progo',
        'Kokap' => 'Kulon Progo',
        'Lendah' => 'Kulon Progo',
        'Nanggulan' => 'Kulon Progo',
        'Panjatan' => 'Kulon Progo',
        'Pengasih' => 'Kulon Progo',
        'Samigaluh' => 'Kulon Progo',
        'Sentolo' => 'Kulon Progo',
        'Temon' => 'Kulon Progo',
        'Wates' => 'Kulon Progo',
    ];

    private const KELURAHAN_KABUPATEN_JETIS = [
        'Bumijo' => 'Kota Yogyakarta',
        'Cokrodiningratan' => 'Kota Yogyakarta',
        'Gowongan' => 'Kota Yogyakarta',
        'Canden' => 'Bantul',
        'Patalan' => 'Bantul',
        'Sumberagung' => 'Bantul',
        'Trimulyo' => 'Bantul',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cabang_wilayah', function (Blueprint $table) {
            $table->string('kabupaten_kota', 100)->nullable()->after('cabang_id');
        });

        DB::table('cabang_wilayah')->orderBy('id')->get()->each(function ($row) {
            $kabupaten = null;
            if ($row->kecamatan === 'Jetis') {
                $kabupaten = $row->kelurahan
                    ? (self::KELURAHAN_KABUPATEN_JETIS[$row->kelurahan] ?? 'Kota Yogyakarta')
                    : 'Kota Yogyakarta';
            } else {
                $kabupaten = self::KECAMATAN_KABUPATEN[$row->kecamatan] ?? null;
            }

            if ($kabupaten) {
                DB::table('cabang_wilayah')
                    ->where('id', $row->id)
                    ->update(['kabupaten_kota' => $kabupaten]);
            }
        });

        Schema::table('cabang_wilayah', function (Blueprint $table) {
            $table->dropUnique('cabang_wilayah_unique');
            $table->unique(['kabupaten_kota', 'kecamatan', 'kelurahan'], 'cabang_wilayah_kabupaten_unique');
        });
    }

    public function down(): void
    {
        Schema::table('cabang_wilayah', function (Blueprint $table) {
            $table->dropUnique('cabang_wilayah_kabupaten_unique');
            $table->unique(['kecamatan', 'kelurahan'], 'cabang_wilayah_unique');
        });

        Schema::table('cabang_wilayah', function (Blueprint $table) {
            $table->dropColumn('kabupaten_kota');
        });
    }
};
