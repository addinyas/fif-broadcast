<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NumberWarmupProfile extends Model
{
    protected $fillable = [
        'user_id',
        'stage',
        'started_at',
        'stage_started_at',
        'daily_outbound_limit',
        'messages_sent_today',
        'counter_date',
        'last_send_at',
        'consecutive_active_days',
        'health',
        'flags',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'stage_started_at' => 'datetime',
            'counter_date' => 'date',
            'last_send_at' => 'datetime',
            'health' => 'array',
            'flags' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
