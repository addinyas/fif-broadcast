<?php

namespace App\Repositories;

use App\Interfaces\CustomerRepositoryInterface;
use App\Models\Customer;
use App\Models\CustomerShare;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class CustomerRepository implements CustomerRepositoryInterface
{
    public function getAll(array $filters = []): LengthAwarePaginator
    {
        $query = Customer::query()->with(['uploader', 'marketing']);

        if (! empty($filters['kios_id'])) {
            $query->where('kios_id', $filters['kios_id']);
        }

        if (! empty($filters['search'])) {
            $searchTerm = $filters['search'];
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                    ->orWhere('phone_number', 'like', "%{$searchTerm}%")
                    ->orWhere('no_contract', 'like', "%{$searchTerm}%")
                    ->orWhere('dynamic_data', 'like', "%{$searchTerm}%");
            });
        }

        if (! empty($filters['assignment_status'])) {
            $query->where('assignment_status', $filters['assignment_status']);
        }

        if (! empty($filters['marketing_id'])) {
            $ids = is_array($filters['marketing_id'])
                ? $filters['marketing_id']
                : explode(',', $filters['marketing_id']);
            $query->whereIn('marketing_id', array_map('intval', $ids));
        }

        if (! empty($filters['marketing_ids'])) {
            $ids = is_array($filters['marketing_ids'])
                ? $filters['marketing_ids']
                : explode(',', $filters['marketing_ids']);
            $query->whereIn('marketing_id', array_map('intval', $ids));
        }

        if (! empty($filters['customer_type'])) {
            $prefix = $filters['customer_type'] === 'NMC' ? '4020%' : '4029%';
            $query->where('no_contract', 'LIKE', $prefix);
        }

        if (($filters['viewer_role'] ?? '') !== 'superadmin') {
            $superadminIds = User::where('role', 'superadmin')->pluck('id');
            if ($superadminIds->isNotEmpty()) {
                $query->whereNotIn('uploaded_by', $superadminIds);
            }
        }

        return $query->latest()->paginate($filters['per_page'] ?? 50);
    }

    public function findById(int $id)
    {
        return Customer::with(['uploader', 'marketing', 'broadcastHistories'])->findOrFail($id);
    }

    public function create(array $data)
    {
        return Customer::create($data);
    }

    public function update(int $id, array $data)
    {
        $customer = Customer::findOrFail($id);
        $customer->update($data);

        return $customer->fresh();
    }

    public function delete(int $id): void
    {
        Customer::findOrFail($id)->delete();
    }

    public function assignToMarketing(int $customerId, int $marketingId)
    {
        $customer = Customer::findOrFail($customerId);
        $customer->update([
            'marketing_id' => $marketingId,
            'assignment_status' => 'assigned',
        ]);

        return $customer->fresh();
    }

    public function unassign(int $customerId)
    {
        $customer = Customer::findOrFail($customerId);
        $customer->update([
            'marketing_id' => null,
            'assignment_status' => 'unassigned',
        ]);

        return $customer->fresh();
    }

    public function getAssignedToMarketing(?int $marketingId, array $filters = []): LengthAwarePaginator
    {
        $sharedIds = [];
        $sharedMap = [];
        if ($marketingId !== null) {
            $shares = CustomerShare::where('to_marketing_id', $marketingId)
                ->where('status', 'approved')
                ->get(['customer_id', 'from_marketing_id']);
            $sharedIds = $shares->pluck('customer_id')->toArray();
            foreach ($shares as $s) {
                $sharedMap[$s->customer_id] = $s->from_marketing_id;
            }
        }

        $ownership = $filters['ownership'] ?? 'all';

        $query = Customer::with(['broadcastHistories' => function ($q) {
            $q->latest();
        }]);

        if ($marketingId !== null) {
            $query->where(function ($q) use ($marketingId, $sharedIds, $ownership) {
                if ($ownership === 'shared') {
                    if (! empty($sharedIds)) {
                        $q->whereIn('id', $sharedIds);
                    } else {
                        $q->whereRaw('0 = 1');
                    }
                } elseif ($ownership === 'own') {
                    $q->where('marketing_id', $marketingId)
                        ->where('assignment_status', 'assigned');
                } else {
                    $q->where('marketing_id', $marketingId)
                        ->where('assignment_status', 'assigned');
                    if (! empty($sharedIds)) {
                        $q->orWhereIn('id', $sharedIds);
                    }
                }
            });
        }

        if (! empty($filters['kios_id'])) {
            $query->where('kios_id', $filters['kios_id']);
        }

        if (! empty($filters['customer_type'])) {
            $prefix = $filters['customer_type'] === 'NMC' ? '4020%' : '4029%';
            $query->where('no_contract', 'LIKE', $prefix);
        }

        if (! empty($filters['sisa_angsuran'])) {
            $range = explode('-', $filters['sisa_angsuran']);
            if (count($range) === 2) {
                $query->whereRaw("CAST(JSON_EXTRACT(dynamic_data, '$.sisa_angsuran') AS INTEGER) BETWEEN ? AND ?", [(int) $range[0], (int) $range[1]]);
            }
        }

        if (! empty($filters['search'])) {
            $searchTerm = $filters['search'];
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                    ->orWhere('phone_number', 'like', "%{$searchTerm}%")
                    ->orWhere('no_contract', 'like', "%{$searchTerm}%")
                    ->orWhere('dynamic_data', 'like', "%{$searchTerm}%");
            });
        }

        if (($filters['viewer_role'] ?? '') !== 'superadmin') {
            $superadminIds = User::where('role', 'superadmin')->pluck('id');
            if ($superadminIds->isNotEmpty()) {
                $query->whereNotIn('uploaded_by', $superadminIds);
            }
        }

        $paginator = $query->latest()->paginate($filters['per_page'] ?? 50);

        if ($marketingId !== null && ! empty($sharedMap)) {
            $fromMarketingIds = array_unique(array_values($sharedMap));
            $fromMarketingNames = User::whereIn('id', $fromMarketingIds)
                ->pluck('name', 'id')
                ->toArray();

            $paginator->getCollection()->transform(function ($customer) use ($sharedMap, $fromMarketingNames) {
                if (isset($sharedMap[$customer->id])) {
                    $fromId = $sharedMap[$customer->id];
                    $customer->from_marketing_name = $fromMarketingNames[$fromId] ?? null;
                    $customer->from_marketing_id = $fromId;
                }

                return $customer;
            });
        }

        return $paginator;
    }

    public function bulkImport(array $customers, int $uploadedBy, ?string $kiosId = null): array
    {
        $imported = 0;
        $failed = [];
        $skipped = [];

        $incomingNoContracts = [];
        foreach ($customers as $index => $data) {
            $dynamicData = $data['dynamic_data'] ?? null;
            if (is_string($dynamicData)) {
                $dynamicData = json_decode($dynamicData, true);
            }
            $noContract = $dynamicData['no_contract'] ?? $data['no_contract'] ?? null;
            if ($noContract) {
                $incomingNoContracts[$noContract] = $index;
            }
        }

        $existingNoContracts = [];
        if (! empty($incomingNoContracts)) {
            $chunks = array_chunk(array_keys($incomingNoContracts), 500);
            foreach ($chunks as $chunk) {
                $query = Customer::whereIn('no_contract', $chunk);
                if ($kiosId) {
                    $query->where('kios_id', $kiosId);
                }
                $found = $query->pluck('no_contract')->toArray();
                foreach ($found as $nc) {
                    $existingNoContracts[$nc] = true;
                }
            }
        }

        $processedNoContracts = [];
        $batchSize = 500;
        $batch = [];
        $batchIndexMap = [];

        foreach ($customers as $index => $data) {
            $dynamicData = $data['dynamic_data'] ?? null;
            if (is_string($dynamicData)) {
                $dynamicData = json_decode($dynamicData, true);
            }
            $noContract = $dynamicData['no_contract'] ?? $data['no_contract'] ?? null;

            if ($noContract) {
                if (isset($existingNoContracts[$noContract]) || isset($processedNoContracts[$noContract])) {
                    $name = $data['name'] ?? '';
                    $reason = isset($existingNoContracts[$noContract])
                        ? "No Contract '$noContract' sudah terdaftar"
                        : "No Contract '$noContract' duplikat dalam 1 file (baris ke-".($processedNoContracts[$noContract] + 1).')';
                    $skipped[] = [
                        'row' => $index + 1,
                        'no_contract' => $noContract,
                        'name' => $name,
                        'reason' => $reason,
                    ];

                    continue;
                }
                $processedNoContracts[$noContract] = $index;
            }

            $batch[] = $data;
            $batchIndexMap[] = $index;

            if (count($batch) >= $batchSize) {
                $this->processBatch($batch, $batchIndexMap, $uploadedBy, $kiosId, $imported, $failed);
                $batch = [];
                $batchIndexMap = [];
            }
        }

        if (! empty($batch)) {
            $this->processBatch($batch, $batchIndexMap, $uploadedBy, $kiosId, $imported, $failed);
        }

        return ['imported' => $imported, 'failed' => $failed, 'skipped' => $skipped];
    }

    public function deleteAll(?string $kiosId = null): int
    {
        $customerIds = Customer::query()
            ->when($kiosId, fn ($q) => $q->where('kios_id', $kiosId))
            ->whereRaw("json_extract(dynamic_data, '$._entry_source') IS NULL OR json_extract(dynamic_data, '$._entry_source') != 'manual'")
            ->pluck('id')
            ->toArray();

        $count = count($customerIds);

        if ($count > 0) {
            $chunks = array_chunk($customerIds, 500);
            foreach ($chunks as $chunk) {
                DB::table('broadcast_histories')->whereIn('customer_id', $chunk)->delete();
                Customer::whereIn('id', $chunk)->forceDelete();
            }
        }

        return $count;
    }

    public function deleteMyData(int $userId): int
    {
        $customerIds = Customer::where('uploaded_by', $userId)
            ->pluck('id')
            ->toArray();

        $count = count($customerIds);

        if ($count > 0) {
            $chunks = array_chunk($customerIds, 500);
            foreach ($chunks as $chunk) {
                DB::table('broadcast_histories')->whereIn('customer_id', $chunk)->delete();
                Customer::whereIn('id', $chunk)->forceDelete();
            }
        }

        return $count;
    }

    public function batchDelete(array $ids): int
    {
        $deleted = 0;
        $chunks = array_chunk($ids, 500);
        foreach ($chunks as $chunk) {
            DB::table('broadcast_histories')->whereIn('customer_id', $chunk)->delete();
            $deleted += DB::table('customers')->whereIn('id', $chunk)->delete();
        }

        return $deleted;
    }

    public function getDistributionReport(?string $viewerRole = null, ?string $kiosId = null): array
    {
        $query = Customer::query();

        if (! empty($kiosId)) {
            $query->where('kios_id', $kiosId);
        }
        if ($viewerRole !== 'superadmin') {
            $superadminIds = User::where('role', 'superadmin')->pluck('id');
            if ($superadminIds->isNotEmpty()) {
                $query->whereNotIn('uploaded_by', $superadminIds);
            }
        }

        $totalCustomers = (clone $query)->count();
        $assigned = (clone $query)->where('assignment_status', 'assigned')->count();
        $unassigned = (clone $query)->where('assignment_status', 'unassigned')->count();

        $byMarketing = (clone $query)->where('assignment_status', 'assigned')
            ->selectRaw('marketing_id, count(*) as total')
            ->groupBy('marketing_id')
            ->pluck('total', 'marketing_id');

        $marketingQuery = User::where('role', 'marketing');
        if (! empty($kiosId)) {
            $marketingQuery->where('kios_id', $kiosId);
        }
        $allMarketing = $marketingQuery->get(['id', 'name']);

        $byMarketingCollection = $allMarketing->map(fn ($user) => [
            'marketing_id' => $user->id,
            'marketing' => ['id' => $user->id, 'name' => $user->name],
            'total' => $byMarketing->get($user->id, 0),
        ])->sortByDesc('total')->values();

        return [
            'total_customers' => $totalCustomers,
            'assigned' => $assigned,
            'unassigned' => $unassigned,
            'by_marketing' => $byMarketingCollection,
        ];
    }

    private function processBatch(array $batch, array $indexMap, int $uploadedBy, ?string $kiosId, int &$imported, array &$failed): void
    {
        DB::beginTransaction();
        try {
            foreach ($batch as $i => $data) {
                $dynamicData = $data['dynamic_data'] ?? null;
                if (is_string($dynamicData)) {
                    $dynamicData = json_decode($dynamicData, true);
                }
                $noContract = $dynamicData['no_contract'] ?? $data['no_contract'] ?? null;

                Customer::create([
                    'no_contract' => $noContract,
                    'name' => $data['name'] ?? '',
                    'phone_number' => $data['phone_number'] ?? '',
                    'uploaded_by' => $uploadedBy,
                    'kios_id' => $kiosId,
                    'dynamic_data' => $dynamicData,
                ]);
            }
            DB::commit();
            $imported += count($batch);
        } catch (\Exception $e) {
            DB::rollBack();
            $this->processBatchIndividually($batch, $indexMap, $uploadedBy, $kiosId, $imported, $failed);
        }
    }

    private function processBatchIndividually(array $batch, array $indexMap, int $uploadedBy, ?string $kiosId, int &$imported, array &$failed): void
    {
        foreach ($batch as $i => $data) {
            try {
                $dynamicData = $data['dynamic_data'] ?? null;
                if (is_string($dynamicData)) {
                    $dynamicData = json_decode($dynamicData, true);
                }
                $noContract = $dynamicData['no_contract'] ?? $data['no_contract'] ?? null;

                DB::beginTransaction();
                Customer::create([
                    'no_contract' => $noContract,
                    'name' => $data['name'] ?? '',
                    'phone_number' => $data['phone_number'] ?? '',
                    'uploaded_by' => $uploadedBy,
                    'kios_id' => $kiosId,
                    'dynamic_data' => $dynamicData,
                ]);
                DB::commit();
                $imported++;
            } catch (\Exception $e) {
                if (DB::transactionLevel() > 0) {
                    DB::rollBack();
                }
                $failed[] = ['row' => $indexMap[$i] + 1, 'error' => $e->getMessage()];
            }
        }
    }
}
