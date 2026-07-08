<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappConnection extends Model
{
    protected $fillable = [
        'user_id',
        'status',
        'qr_code',
    ];

    protected function casts(): array
    {
        return [
            'qr_code' => 'string',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
