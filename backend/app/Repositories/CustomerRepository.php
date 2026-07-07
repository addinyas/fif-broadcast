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
                    ->orWhereRaw("json_extract(dynamic_data, '$.no_contract') LIKE ?", ["%{$searchTerm}%"]);
            });
        }

        if (! empty($filters['assignment_status'])) {
            $query->where('assignment_status', $filters['assignment_status']);
        }

        if (! empty($filters['marketing_id'])) {
            $query->where('marketing_id', $filters['marketing_id']);
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

    public function getAssignedToMarketing(int $marketingId, array $filters = []): LengthAwarePaginator
    {
        $query = Customer::where('marketing_id', $marketingId)
            ->where('assignment_status', 'assigned')
            ->with(['broadcastHistories' => function ($q) {
                $q->latest();
            }]);

        if (! empty($filters['search'])) {
            $searchTerm = $filters['search'];
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                    ->orWhere('phone_number', 'like', "%{$searchTerm}%")
                    ->orWhere('no_contract', 'like', "%{$searchTerm}%")
                    ->orWhereRaw("json_extract(dynamic_data, '$.no_contract') LIKE ?", ["%{$searchTerm}%"]);
            });
        }

        return $query->latest()->paginate($filters['per_page'] ?? 50);
    }

    public function bulkImport(array $customers, int $uploadedBy): array
    {
        $imported = 0;
        $failed = [];

        DB::beginTransaction();
        try {
            foreach ($customers as $index => $data) {
                try {
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

            return ['imported' => 0, 'failed' => [['row' => 0, 'error' => 'Database error: '.$e->getMessage()]]];
        }

        return ['imported' => $imported, 'failed' => $failed];
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
