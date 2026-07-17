<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BroadcastSetting extends Model
{
    protected $fillable = ['setting_key', 'setting_value'];

    public function getValue(string $key, mixed $default = null): mixed
    {
        $row = static::where('setting_key', $key)->first();

        return $row ? $row->setting_value : $default;
    }

    public static function getAllAsMap(): array
    {
        return static::pluck('setting_value', 'setting_key')->toArray();
    }

    public static function setMany(array $settings): void
    {
        foreach ($settings as $key => $value) {
            static::updateOrCreate(
                ['setting_key' => $key],
                ['setting_value' => (string) $value]
            );
        }
    }
}
