<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'no_contract',
        'name',
        'phone_number',
        'uploaded_by',
        'marketing_id',
        'assignment_status',
        'dynamic_data',
    ];

    protected function casts(): array
    {
        return [
            'dynamic_data' => 'array',
        ];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function marketing(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marketing_id');
    }

    public function broadcastHistories(): HasMany
    {
        return $this->hasMany(BroadcastHistory::class);
    }
}
