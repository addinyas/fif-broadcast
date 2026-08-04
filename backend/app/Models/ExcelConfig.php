<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExcelConfig extends Model
{
    protected $fillable = [
        'ao_id',
        'kios_id',
        'platform',
        'excel_url',
        'spreadsheet_id',
        'sheet_name',
        'column_mapping',
        'total_rows',
        'oauth_token',
        'is_active',
    ];

    protected $casts = [
        'column_mapping' => 'array',
        'oauth_token' => 'array',
        'is_active' => 'boolean',
    ];

    public function ao(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ao_id');
    }

    public static function detectPlatform(string $url): ?string
    {
        if (str_contains($url, 'docs.google.com') || str_contains($url, 'sheets.google.com')) {
            return 'google_sheets';
        }
        if (str_contains($url, 'onedrive.live.com') || str_contains($url, 'office.com')
            || str_contains($url, 'sharepoint.com') || str_contains($url, 'microsoft.com')) {
            return 'excel_online';
        }

        return null;
    }

    public static function extractGoogleSheetsId(string $url): ?string
    {
        if (preg_match('#/d/([a-zA-Z0-9-_]+)#', $url, $m)) {
            return $m[1];
        }

        return null;
    }

    public static function extractOneDriveFileId(string $url): ?string
    {
        if (preg_match('#/items/([a-zA-Z0-9-_]+)#', $url, $m)) {
            return $m[1];
        }
        if (preg_match('#/drive/items/([a-zA-Z0-9-_]+)#', $url, $m)) {
            return $m[1];
        }

        return $url;
    }
}
