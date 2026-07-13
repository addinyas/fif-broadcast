<?php

namespace App\Services;

use App\Interfaces\BroadcastRepositoryInterface;
use App\Models\BroadcastHistory;
use App\Models\Customer;
use Illuminate\Pagination\LengthAwarePaginator;

class BroadcastService
{
    public function __construct(
        protected BroadcastRepositoryInterface $broadcastRepository
    ) {}

    public function prepare(int $customerId, int $marketingId, string $templateBody, array $formValues): array
    {
        $sentToday = BroadcastHistory::where('marketing_id', $marketingId)
            ->where('status', 'sent')
            ->where('created_at', '>=', now()->startOfDay())
            ->count();

        if ($sentToday >= 150) {
            throw new \Exception('Batas broadcast 150 pesan per hari sudah tercapai');
        }

        $mappedMessage = $this->mapFormToMessage($templateBody, $formValues);

        $broadcast = $this->broadcastRepository->create([
            'customer_id' => $customerId,
            'marketing_id' => $marketingId,
            'exact_message' => $mappedMessage,
            'status' => 'pending',
        ]);

        return $broadcast->toArray();
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

        return [
            'assigned_count' => $assignedCount,
            'broadcast' => $stats,
            'not_broadcast_count' => max(0, $assignedCount - $broadcastedCount),
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
        $map = [
            '#nomor_contract' => $values['nomor_contract'] ?? '',
            '#no_contract' => $values['no_contract'] ?? '',
            '#nama' => $values['nama'] ?? '',
            '#motor_dan_tahun' => $values['motor_dan_tahun'] ?? '',
            '#plat' => $values['plat'] ?? '',
            '#obj_desc' => $values['obj_desc'] ?? '',
            '#tahun' => $values['tahun'] ?? '',
            '#plafon' => $values['plafon'] ?? '',
            '#angsuran_kurang' => $values['angsuran_kurang'] ?? '',
            '#input_angsuran' => $values['input_angsuran'] ?? '',
            '#dinego_jadi' => $values['dinego_jadi'] ?? '',
            '#pinjaman' => $values['pinjaman'] ?? '',
            '#pelunasan' => $values['pelunasan'] ?? '',
            '#terima' => $values['terima'] ?? '',
            '#tenor' => $values['tenor'] ?? '',
            '#sisa_angsuran' => $values['sisa_angsuran'] ?? '',
        ];

        $message = $templateBody;
        foreach ($map as $key => $value) {
            $message = str_replace($key, $value, $message);
        }

        return $message;
    }
}
