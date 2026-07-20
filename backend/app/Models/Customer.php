<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class Customer extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'no_contract',
        'name',
        'phone_number',
        'uploaded_by',
        'kios_id',
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

    public function sentMarks(): HasMany
    {
        return $this->hasMany(CustomerSentMark::class);
    }

    /**
     * Get IDs of orphan customers (uploaded by deleted users).
     * Pass $viewerKiosId to also include orphans from the viewer's kios.
     */
    public static function getOrphanIds(?string $viewerKiosId = null): Collection
    {
        $existingUserIds = User::pluck('id');
        $query = static::whereNotNull('uploaded_by')
            ->whereNotIn('uploaded_by', $existingUserIds);

        if ($viewerKiosId) {
            $query->where('kios_id', $viewerKiosId);
        }

        return $query->pluck('id');
    }

    /**
     * Apply orphan filter: exclude orphan customers from queries.
     * Orphans visible only in their own kios for non-superadmin viewers.
     */
    public static function applyOrphanFilter($query, ?string $viewerKiosId = null): void
    {
        $existingUserIds = User::pluck('id');
        $query->where(function ($q) use ($existingUserIds, $viewerKiosId) {
            $q->whereIn('uploaded_by', $existingUserIds);
            if ($viewerKiosId) {
                $q->orWhere(function ($q2) use ($existingUserIds, $viewerKiosId) {
                    $q2->whereNotIn('uploaded_by', $existingUserIds)
                        ->whereNotNull('uploaded_by')
                        ->where('kios_id', $viewerKiosId);
                });
            }
        });
    }
}
