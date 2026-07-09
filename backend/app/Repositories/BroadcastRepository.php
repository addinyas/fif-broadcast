<?php

namespace App\Repositories;

use App\Interfaces\BroadcastRepositoryInterface;
use App\Models\BroadcastHistory;
use Illuminate\Pagination\LengthAwarePaginator;

class BroadcastRepository implements BroadcastRepositoryInterface
{
    public function create(array $data)
    {
        return BroadcastHistory::create($data);
    }

    public function getHistory(?int $marketingId, array $filters = []): LengthAwarePaginator
    {
        $query = BroadcastHistory::with('customer:id,name,phone_number');

        if ($marketingId !== null) {
            $query->where('marketing_id', $marketingId);
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->latest()->paginate($filters['per_page'] ?? 50);
    }

    public function getStats(?int $marketingId = null): array
    {
        $query = BroadcastHistory::query();
        if ($marketingId) {
            $query->where('marketing_id', $marketingId);
        }

        $stats = $query->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        ")->first();

        return [
            'total' => (int) $stats->total,
            'pending' => (int) $stats->pending,
            'processing' => (int) $stats->processing,
            'sent' => (int) $stats->sent,
            'failed' => (int) $stats->failed,
        ];
    }

    public function getPendingBroadcasts(int $limit = 10)
    {
        return BroadcastHistory::where('status', 'pending')
            ->with('customer:id,name,phone_number')
            ->limit($limit)
            ->get();
    }

    public function updateStatus(int $id, string $status, ?string $errorLog = null): void
    {
        $data = ['status' => $status];
        if ($status === 'sent') {
            $data['sent_at'] = now();
        }
        if ($errorLog) {
            $data['error_log'] = $errorLog;
        }
        BroadcastHistory::where('id', $id)->update($data);
    }
}
