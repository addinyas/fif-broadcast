<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KiosSeeder extends Seeder
{
    public function run(): void
    {
        $kios = [
            ['kios_id' => '40200', 'kios_name' => 'CRE'],
            ['kios_id' => '40207', 'kios_name' => 'POS WATES'],
            ['kios_id' => '40272', 'kios_name' => 'PASAR TELO'],
            ['kios_id' => '40274', 'kios_name' => 'GODEAN'],
            ['kios_id' => '40275', 'kios_name' => 'SEDAYU'],
            ['kios_id' => '40276', 'kios_name' => 'COKRO'],
            ['kios_id' => '40278', 'kios_name' => 'WATES KOTA'],
            ['kios_id' => '40279', 'kios_name' => 'YOGYAKARTA'],
        ];

        foreach ($kios as $entry) {
            DB::table('kios')->insertOrIgnore([
                'kios_id' => $entry['kios_id'],
                'kios_name' => $entry['kios_name'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
