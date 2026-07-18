<?php

namespace App\Services;

use App\Interfaces\BroadcastRepositoryInterface;
use App\Models\BroadcastHistory;
use App\Models\Customer;
use App\Models\CustomerShare;
use App\Models\Template;
use App\Models\User;
use App\Models\WhatsappConnection;
use Illuminate\Pagination\LengthAwarePaginator;

class BroadcastService
{
    public function __construct(
        protected BroadcastRepositoryInterface $broadcastRepository
    ) {}

    public function prepare(int $customerId, int $marketingId, string $templateBody, array $formValues): array
    {
        $waConnection = WhatsappConnection::where('user_id', $marketingId)->first();
        if (! $waConnection || $waConnection->status !== 'connected') {
            throw new \Exception('WhatsApp belum terhubung. Silakan hubungkan WhatsApp terlebih dahulu di menu Connect.');
        }

        $sentToday = BroadcastHistory::where('marketing_id', $marketingId)
            ->where('status', 'sent')
            ->where('created_at', '>=', now()->startOfDay())
            ->count();

        if ($sentToday >= 150) {
            throw new \Exception('Batas broadcast 150 pesan per hari sudah tercapai');
        }

        $marketingUser = User::find($marketingId);
        $formValues['_namapanggilan'] = $marketingUser?->display_name ?? $marketingUser?->name ?? '';
        $formValues['_nomor'] = $marketingUser?->phone_number ?? '';

        $effectiveBody = $templateBody;
        if ($templateBody === 'random') {
            $effectiveBody = $this->pickRandomTemplate($marketingUser);
        }

        $mappedMessage = $this->mapFormToMessage($effectiveBody, $formValues);

        $broadcast = $this->broadcastRepository->create([
            'customer_id' => $customerId,
            'marketing_id' => $marketingId,
            'exact_message' => $mappedMessage,
            'status' => 'pending',
        ]);

        return $broadcast->toArray();
    }

    private function pickRandomTemplate(?User $user): string
    {
        $query = Template::query();
        if ($user && $user->role === 'superadmin') {
            // superadmin sees all templates
        } elseif ($user) {
            $query->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)
                    ->orWhere('is_default', true);
            });
        }

        $templates = $query->get(['id', 'message_body']);
        if ($templates->isEmpty()) {
            throw new \Exception('Tidak ada template tersedia untuk random selection');
        }

        return $templates->random()->message_body;
    }

    public function getHistory(?int $marketingId, array $filters = [], ?string $kiosId = null): LengthAwarePaginator
    {
        return $this->broadcastRepository->getHistory($marketingId, $filters, $kiosId);
    }

    public function getStats(?int $marketingId = null, ?string $kiosId = null): array
    {
        return $this->broadcastRepository->getStats($marketingId, $kiosId);
    }

    public function marketingSummary(?int $marketingId, ?string $kiosId = null): array
    {
        $customerQuery = Customer::where('assignment_status', 'assigned');
        $historyQuery = BroadcastHistory::query()
            ->join('customers', 'broadcast_histories.customer_id', '=', 'customers.id');

        if ($kiosId) {
            $customerQuery->where('customers.kios_id', $kiosId);
            $historyQuery->where('customers.kios_id', $kiosId);
        }
        if ($marketingId !== null) {
            $customerQuery->where('marketing_id', $marketingId);
            $historyQuery->where('broadcast_histories.marketing_id', $marketingId);
        }

        Customer::applyOrphanFilter($customerQuery, $kiosId);

        $assignedCount = $customerQuery->count();

        $stats = $this->getStats($marketingId, $kiosId);

        // Count unique customers who received broadcasts (not total rows)
        $broadcastedCustomerQuery = (clone $historyQuery)->select('customer_id')->distinct();
        $broadcastedCount = $broadcastedCustomerQuery->count();

        $lastBroadcast = (clone $historyQuery)->with('customer:id,name')
            ->latest('created_at')
            ->first();

        $recent = (clone $historyQuery)->with('customer:id,name')
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->toArray();

        // Shared (borrowed) data for this marketing user
        $sharedData = ['total_shared' => 0, 'owners' => []];
        if ($marketingId !== null) {
            $sharedQuery = CustomerShare::where('to_marketing_id', $marketingId)
                ->where('status', 'approved');
            $sharedCount = $sharedQuery->count();
            $ownerIds = (clone $sharedQuery)->pluck('from_marketing_id')->unique()->values()->toArray();
            $ownerNames = $ownerIds ? User::whereIn('id', $ownerIds)->pluck('name')->toArray() : [];
            $sharedData = [
                'total_shared' => $sharedCount,
                'owners' => $ownerNames,
            ];
        }

        return [
            'assigned_count' => $assignedCount,
            'broadcast' => $stats,
            'not_broadcast_count' => max(0, $assignedCount - $broadcastedCount),
            'shared_data' => $sharedData,
            'last_broadcast' => $lastBroadcast ? [
                'customer_name' => $lastBroadcast->customer?->name ?? "Customer #{$lastBroadcast->customer_id}",
                'status' => $lastBroadcast->status,
                'sent_at' => $lastBroadcast->sent_at?->toIso8601String(),
                'created_at' => $lastBroadcast->created_at?->toIso8601String(),
            ] : null,
            'recent' => array_map(fn ($b) => [
                'id' => $b['id'],
                'customer_name' => $b['customer']['name'] ?? "Customer #{$b['customer_id']}",
                'status' => $b['status'],
                'sent_at' => $b['sent_at'] ? date('c', strtotime($b['sent_at'])) : null,
                'created_at' => date('c', strtotime($b['created_at'])),
            ], $recent),
        ];
    }

    protected function mapFormToMessage(string $templateBody, array $values): string
    {
        $hour = (int) now('Asia/Jakarta')->format('G');
        if ($hour >= 4 && $hour < 11) {
            $waktu = 'Pagi';
        } elseif ($hour >= 11 && $hour < 15) {
            $waktu = 'Siang';
        } elseif ($hour >= 15 && $hour < 18) {
            $waktu = 'Sore';
        } else {
            $waktu = 'Malam';
        }

        // Compute plafon from OTR + CORI (not stored in dynamic_data)
        $otr = (int) ($values['otr'] ?? 0);
        $cori = strtoupper($values['cori'] ?? '');
        $plafon = '';
        if ($otr > 0 && $cori !== '') {
            if ($cori === 'BAD') {
                $plafon = number_format($this->roundPlafon($otr * 0.65), 0, '', '.');
            } elseif ($cori === 'MEDIUM') {
                $plafon = number_format($this->roundPlafon($otr * 0.75), 0, '', '.');
            } elseif (in_array($cori, ['GOOD', 'GOOD LOYAL'], true)) {
                $plafon = number_format($this->roundPlafon($otr * 0.90), 0, '', '.');
            }
        }

        $map = [
            '#nomor_contract' => $values['nomor_contract'] ?? '',
            '#no_contract' => $values['no_contract'] ?? '',
            '#nomor' => $values['_nomor'] ?? '',
            '#nama' => $values['nama'] ?? '',
            '#namapanggilan' => $values['_namapanggilan'] ?? '',
            '#motor_dan_tahun' => $values['motor_dan_tahun'] ?? '',
            '#plat' => $values['plat'] ?? '',
            '#obj_desc' => $values['obj_desc'] ?? '',
            '#tahun' => $values['tahun'] ?? '',
            '#plafon' => $plafon,
            '#angsuran_kurang' => $values['angsuran_kurang'] ?? '',
            '#input_angsuran' => $values['input_angsuran'] ?? '',
            '#dinego_jadi' => $values['dinego_jadi'] ?? '',
            '#pinjaman' => $values['pinjaman'] ?? '',
            '#pelunasan' => $values['pelunasan'] ?? '',
            '#terima' => $values['terima'] ?? '',
            '#tenor' => $values['tenor'] ?? '',
            '#sisa_angsuran' => $values['sisa_angsuran'] ?? '',
            '#waktu' => $waktu,
        ];

        $message = $templateBody;
        uksort($map, fn ($a, $b) => strlen($b) - strlen($a));
        foreach ($map as $key => $value) {
            $message = str_replace($key, $value, $message);
        }

        return $message;
    }

    private function roundPlafon(float $raw): int
    {
        $remainder = (int) $raw % 100000;
        if ($remainder < 50000) {
            return (int) $raw - $remainder;
        }

        return (int) $raw - $remainder + 50000;
    }

    public function getProgress(User $user): array
    {
        $query = BroadcastHistory::query()
            ->join('customers', 'broadcast_histories.customer_id', '=', 'customers.id');

        if ($user->role !== 'superadmin' && $user->kios_id) {
            $query->where('customers.kios_id', $user->kios_id);
        }
        if ($user->role === 'marketing') {
            $query->where('broadcast_histories.marketing_id', $user->id);
        }

        // Pending & processing: all-time (show stuck messages from any day)
        // Sent/failed/cancelled: today only
        $stats = $query->selectRaw("
            SUM(CASE WHEN broadcast_histories.status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN broadcast_histories.status = 'processing' THEN 1 ELSE 0 END) as processing,
            SUM(CASE WHEN broadcast_histories.status = 'sent' AND broadcast_histories.created_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN broadcast_histories.status = 'failed' AND broadcast_histories.created_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN broadcast_histories.status = 'cancelled' AND broadcast_histories.created_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as cancelled,
            COUNT(*) as total
        ")->first();

        return [
            'pending' => (int) ($stats->pending ?? 0),
            'processing' => (int) ($stats->processing ?? 0),
            'sent' => (int) ($stats->sent ?? 0),
            'failed' => (int) ($stats->failed ?? 0),
            'cancelled' => (int) ($stats->cancelled ?? 0),
            'total' => (int) ($stats->total ?? 0),
            'is_active' => ((int) ($stats->pending ?? 0) + (int) ($stats->processing ?? 0)) > 0,
        ];
    }

    public function cancelPending(User $user): array
    {
        $query = BroadcastHistory::whereIn('status', ['pending', 'processing']);

        if ($user->role === 'marketing') {
            $query->where('marketing_id', $user->id);
        } elseif ($user->role === 'UH') {
            if ($user->kios_id) {
                $query->whereHas('customer', function ($q) use ($user) {
                    $q->where('kios_id', $user->kios_id);
                });
            }
        } elseif ($user->kios_id) {
            $query->whereHas('customer', function ($q) use ($user) {
                $q->where('kios_id', $user->kios_id);
            });
        }

        $cancelled = $query->update(['status' => 'cancelled', 'updated_at' => now()]);

        return ['cancelled' => $cancelled];
    }

    public function cancelItem(int $historyId, User $user): bool
    {
        $query = BroadcastHistory::where('id', $historyId)->whereIn('status', ['pending', 'processing']);

        if ($user->role === 'marketing') {
            $query->where('marketing_id', $user->id);
        } elseif ($user->role === 'UH') {
            if ($user->kios_id) {
                $query->whereHas('customer', function ($q) use ($user) {
                    $q->where('kios_id', $user->kios_id);
                });
            }
        }

        $item = $query->first();
        if (! $item) {
            return false;
        }

        $item->update(['status' => 'cancelled', 'updated_at' => now()]);

        return true;
    }

    public function getWorkerStatus(User $user): array
    {
        $query = BroadcastHistory::query()
            ->join('customers', 'broadcast_histories.customer_id', '=', 'customers.id')
            ->join('users', 'broadcast_histories.marketing_id', '=', 'users.id');

        // Kios scoping
        if ($user->role === 'marketing') {
            $query->where('broadcast_histories.marketing_id', $user->id);
        } elseif ($user->role === 'UH' && $user->kios_id) {
            $query->where('customers.kios_id', $user->kios_id);
        }

        $rows = $query->selectRaw("
            broadcast_histories.marketing_id,
            users.name as marketing_name,
            users.kios_id,
            users.kios_name,
            SUM(CASE WHEN broadcast_histories.status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN broadcast_histories.status = 'processing' THEN 1 ELSE 0 END) as processing,
            SUM(CASE WHEN broadcast_histories.status = 'sent' AND broadcast_histories.created_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as sent_today,
            SUM(CASE WHEN broadcast_histories.status = 'failed' AND broadcast_histories.created_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as failed_today,
            SUM(CASE WHEN broadcast_histories.status = 'cancelled' AND broadcast_histories.created_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as cancelled_today,
            MAX(CASE WHEN broadcast_histories.status IN ('sent', 'processing', 'pending') THEN broadcast_histories.updated_at END) as last_activity
        ")->groupBy('broadcast_histories.marketing_id', 'users.name', 'users.kios_id', 'users.kios_name')
            ->orderByDesc('pending')
            ->orderByDesc('processing')
            ->orderByDesc('last_activity')
            ->get();

        // Also add users with 0 broadcasts if superadmin/UH
        if ($user->role !== 'marketing') {
            $existingIds = $rows->pluck('marketing_id')->toArray();
            $userQuery = User::where('role', 'marketing')
                ->select('id', 'name', 'kios_id', 'kios_name');

            if ($user->role === 'UH' && $user->kios_id) {
                $userQuery->where('kios_id', $user->kios_id);
            }

            $emptyUsers = $userQuery->whereNotIn('id', $existingIds)->get();
            foreach ($emptyUsers as $eu) {
                $rows->push((object) [
                    'marketing_id' => $eu->id,
                    'marketing_name' => $eu->name,
                    'kios_id' => $eu->kios_id,
                    'kios_name' => $eu->kios_name,
                    'pending' => 0,
                    'processing' => 0,
                    'sent_today' => 0,
                    'failed_today' => 0,
                    'cancelled_today' => 0,
                    'last_activity' => null,
                ]);
            }
        }

        $users = $rows->values();

        $summary = [
            'total_pending' => $users->sum('pending'),
            'total_processing' => $users->sum('processing'),
            'total_sent_today' => $users->sum('sent_today'),
            'total_failed_today' => $users->sum('failed_today'),
            'total_cancelled_today' => $users->sum('cancelled_today'),
        ];

        // Get pending items for the cancel feature
        $pendingQuery = BroadcastHistory::query()
            ->join('customers', 'broadcast_histories.customer_id', '=', 'customers.id')
            ->join('users', 'broadcast_histories.marketing_id', '=', 'users.id')
            ->where('broadcast_histories.status', 'pending');

        if ($user->role === 'marketing') {
            $pendingQuery->where('broadcast_histories.marketing_id', $user->id);
        } elseif ($user->role === 'UH' && $user->kios_id) {
            $pendingQuery->where('customers.kios_id', $user->kios_id);
        }

        $pendingItems = $pendingQuery
            ->select('broadcast_histories.id', 'customers.name as customer_name', 'broadcast_histories.marketing_id', 'users.name as marketing_name')
            ->orderBy('broadcast_histories.created_at')
            ->limit(100)
            ->get();

        return [
            'summary' => $summary,
            'users' => $users,
            'pending_items' => $pendingItems,
        ];
    }
}
