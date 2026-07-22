<?php

namespace App\Repositories;

use App\Interfaces\BroadcastRepositoryInterface;
use App\Models\BroadcastHistory;
use App\Models\CustomerSentMark;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

class BroadcastRepository implements BroadcastRepositoryInterface
{
    public function create(array $data)
    {
        return BroadcastHistory::create($data);
    }

    public function getHistory(?int $marketingId, array $filters = [], ?string $kiosId = null): LengthAwarePaginator
    {
        $query = BroadcastHistory::with('customer:id,name,phone_number')
            ->join('customers', 'broadcast_histories.customer_id', '=', 'customers.id');

        if ($kiosId) {
            $query->where('customers.kios_id', $kiosId);
        }

        if ($marketingId !== null) {
            $query->where('broadcast_histories.marketing_id', $marketingId);
        }

        if (! empty($filters['status'])) {
            if ($filters['status'] === 'failed') {
                $query->whereIn('status', ['failed', 'cancelled']);
            } elseif ($filters['status'] === 'pending_processing') {
                $query->whereIn('status', ['pending', 'processing']);
            } else {
                $query->where('status', $filters['status']);
            }
        }

        if (! empty($filters['date'])) {
            $query->whereDate('broadcast_histories.created_at', $filters['date']);
        }

        return $query->latest()->paginate($filters['per_page'] ?? 50);
    }

    public function getStats(?int $marketingId = null, ?string $kiosId = null): array
    {
        $query = BroadcastHistory::query()
            ->join('customers', 'broadcast_histories.customer_id', '=', 'customers.id');

        if ($kiosId) {
            $query->where('customers.kios_id', $kiosId);
        }
        if ($marketingId) {
            $query->where('broadcast_histories.marketing_id', $marketingId);
        }

        $stats = $query->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status IN ('failed', 'cancelled') THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = 'sent' AND broadcast_histories.created_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as sent_today,
            SUM(CASE WHEN status IN ('failed', 'cancelled') AND broadcast_histories.created_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as failed_today
        ")->first();

        // Count manual broadcasts from customer_sent_marks
        $manualQuery = CustomerSentMark::query();
        $manualTodayQuery = CustomerSentMark::query()->where('sent_at', '>=', now()->startOfDay());
        if ($marketingId) {
            $manualQuery->where('user_id', $marketingId);
            $manualTodayQuery->where('user_id', $marketingId);
        } elseif ($kiosId) {
            $userIds = User::where('kios_id', $kiosId)->pluck('id');
            $manualQuery->whereIn('user_id', $userIds);
            $manualTodayQuery->whereIn('user_id', $userIds);
        }

        return [
            'total' => (int) $stats->total,
            'pending' => (int) $stats->pending,
            'processing' => (int) $stats->processing,
            'broadcast_manual' => $manualQuery->count(),
            'broadcast_manual_today' => $manualTodayQuery->count(),
            'sent' => (int) $stats->sent,
            'failed' => (int) $stats->failed,
            'sent_today' => (int) $stats->sent_today,
            'failed_today' => (int) $stats->failed_today,
        ];
    }

    public function getDailyStats(?string $kiosId = null): array
    {
        // Automated broadcasts today per MCE
        $autoQuery = BroadcastHistory::query()
            ->join('customers', 'broadcast_histories.customer_id', '=', 'customers.id')
            ->where('broadcast_histories.created_at', '>=', now()->startOfDay())
            ->selectRaw("
                broadcast_histories.marketing_id,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_today,
                SUM(CASE WHEN status IN ('failed', 'cancelled') THEN 1 ELSE 0 END) as failed_today,
                SUM(CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE 0 END) as pending_today
            ")
            ->groupBy('broadcast_histories.marketing_id');

        // Manual sends today per MCE
        $manualQuery = CustomerSentMark::query()
            ->where('sent_at', '>=', now()->startOfDay())
            ->selectRaw('user_id, COUNT(*) as manual_today')
            ->groupBy('user_id');

        if ($kiosId) {
            $userIds = User::where('kios_id', $kiosId)->pluck('id');
            $autoQuery->whereIn('broadcast_histories.marketing_id', $userIds);
            $manualQuery->whereIn('user_id', $userIds);
        }

        $autoRows = $autoQuery->get()->keyBy('marketing_id');
        $manualRows = $manualQuery->get()->keyBy('user_id');

        $allUserIds = $autoRows->keys()->merge($manualRows->keys())->unique()->values()->toArray();
        if (empty($allUserIds)) {
            return ['users' => [], 'totals' => ['sent_today' => 0, 'failed_today' => 0, 'pending_today' => 0, 'manual_today' => 0]];
        }

        $users = User::whereIn('id', $allUserIds)->select('id', 'name')->get()->keyBy('id');

        $result = collect($allUserIds)->map(function ($userId) use ($autoRows, $manualRows, $users) {
            $auto = $autoRows->get($userId);
            $manual = $manualRows->get($userId);

            return [
                'marketing_id' => $userId,
                'marketing_name' => $users->get($userId)?->name ?? "User #{$userId}",
                'sent_today' => (int) ($auto->sent_today ?? 0),
                'failed_today' => (int) ($auto->failed_today ?? 0),
                'pending_today' => (int) ($auto->pending_today ?? 0),
                'manual_today' => (int) ($manual->manual_today ?? 0),
            ];
        })->sortByDesc(fn ($r) => $r['sent_today'] + $r['manual_today'])->values()->toArray();

        $totals = [
            'sent_today' => array_sum(array_column($result, 'sent_today')),
            'failed_today' => array_sum(array_column($result, 'failed_today')),
            'pending_today' => array_sum(array_column($result, 'pending_today')),
            'manual_today' => array_sum(array_column($result, 'manual_today')),
        ];

        return ['users' => $result, 'totals' => $totals];
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
