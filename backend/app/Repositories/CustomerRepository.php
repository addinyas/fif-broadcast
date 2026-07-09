<?php

namespace App\Repositories;

use App\Interfaces\CustomerRepositoryInterface;
use App\Models\Customer;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class CustomerRepository implements CustomerRepositoryInterface
{
    public function getAll(array $filters = []): LengthAwarePaginator
    {
        $query = Customer::query()->with(['uploader', 'marketing']);

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

        if (! empty($filters['buss_unit'])) {
            $query->whereRaw("json_extract(dynamic_data, '$.buss_unit') = ?", [$filters['buss_unit']]);
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
        $query = Customer::with(['broadcastHistories' => function ($q) {
            $q->latest();
        }]);

        if ($marketingId !== null) {
            $query->where('marketing_id', $marketingId)
                  ->where('assignment_status', 'assigned');
        }

        if (! empty($filters['buss_unit'])) {
            $query->where('dynamic_data->buss_unit', $filters['buss_unit']);
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

        return $query->latest()->paginate($filters['per_page'] ?? 50);
    }

    public function bulkImport(array $customers, int $uploadedBy): array
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
            $existingNoContracts = Customer::whereIn('no_contract', array_keys($incomingNoContracts))
                ->pluck('no_contract')
                ->toArray();
            $existingNoContracts = array_flip($existingNoContracts);
        }

        $processedNoContracts = [];

        DB::beginTransaction();
        try {
            foreach ($customers as $index => $data) {
                try {
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

                    Customer::create([
                        'no_contract' => $noContract,
                        'name' => $data['name'] ?? '',
                        'phone_number' => $data['phone_number'] ?? '',
                        'uploaded_by' => $uploadedBy,
                        'dynamic_data' => $dynamicData,
                    ]);
                    $imported++;
                } catch (\Exception $e) {
                    $failed[] = ['row' => $index + 1, 'error' => $e->getMessage()];
                }
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();

            return ['imported' => 0, 'failed' => [['row' => 0, 'error' => 'Database error: '.$e->getMessage()]], 'skipped' => []];
        }

        return ['imported' => $imported, 'failed' => $failed, 'skipped' => $skipped];
    }

    public function deleteAll(): int
    {
        $count = Customer::count();
        DB::table('broadcast_histories')->delete();
        DB::table('customers')->delete();

        return $count;
    }

    public function batchDelete(array $ids): int
    {
        DB::table('broadcast_histories')->whereIn('customer_id', $ids)->delete();

        return DB::table('customers')->whereIn('id', $ids)->delete();
    }

    public function getDistributionReport(): array
    {
        $totalCustomers = Customer::count();
        $assigned = Customer::where('assignment_status', 'assigned')->count();
        $unassigned = Customer::where('assignment_status', 'unassigned')->count();

        $byMarketing = Customer::where('assignment_status', 'assigned')
            ->selectRaw('marketing_id, count(*) as total')
            ->groupBy('marketing_id')
            ->with('marketing:id,name')
            ->get();

        return [
            'total_customers' => $totalCustomers,
            'assigned' => $assigned,
            'unassigned' => $unassigned,
            'by_marketing' => $byMarketing,
        ];
    }
}
