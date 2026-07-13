<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerShare extends Model
{
    protected $fillable = [
        'customer_id',
        'from_marketing_id',
        'to_marketing_id',
        'status',
        'share_type',
        'shared_count',
        'requested_by',
        'approved_by',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function fromMarketing(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_marketing_id');
    }

    public function toMarketing(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_marketing_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
