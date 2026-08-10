<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BroadcastSchedule extends Model
{
    protected $fillable = [
        'user_id',
        'schedule_time',
        'days_active',
        'template_body',
        'template_ids',
        'active',
        'last_run_date',
    ];

    protected function casts(): array
    {
        return [
            'days_active' => 'array',
            'template_ids' => 'array',
            'active' => 'boolean',
            'last_run_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
