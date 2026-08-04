<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CabangWilayah extends Model
{
    protected $table = 'cabang_wilayah';

    protected $fillable = [
        'cabang_id',
        'kabupaten_kota',
        'kecamatan',
        'kelurahan',
    ];
}
