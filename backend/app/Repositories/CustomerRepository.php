<?php

namespace App\Repositories;

use App\Interfaces\CustomerRepositoryInterface;
use App\Models\CabangWilayah;
use App\Models\Customer;
use App\Models\CustomerShare;
use App\Models\Kios;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class CustomerRepository implements CustomerRepositoryInterface
{
    public function getAll(array $filters = []): LengthAwarePaginator
    {
        $query = Customer::query()->with(['uploader', 'marketing', 'broadcastHistories' => function ($q) {
            $q->with('marketing:id,name')->latest();
        }, 'sentMarks' => function ($q) {
            $q->with('user:id,name,role')->latest();
        }]);

        if (! empty($filters['kios_id'])) {
            $query->where('kios_id', $filters['kios_id']);
        }

        // Marketing viewers: only own assigned + shared (borrowed) customers
        if (($filters['viewer_role'] ?? '') === 'marketing' && ! empty($filters['viewer_id'])) {
            $viewerId = (int) $filters['viewer_id'];
            $sharedIds = CustomerShare::where('to_marketing_id', $viewerId)
                ->where('status', 'approved')
                ->pluck('customer_id')
                ->toArray();

            $query->where(function ($q) use ($viewerId, $sharedIds) {
                $q->where(function ($q2) use ($viewerId) {
                    $q2->where('marketing_id', $viewerId)
                        ->where('assignment_status', 'assigned');
                });
                if (! empty($sharedIds)) {
                    $q->orWhereIn('id', $sharedIds);
                }
            });
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

        if (! in_array(($filters['viewer_role'] ?? ''), ['superadmin', 'AO'])) {
            $existingUserIds = User::pluck('id');
            $viewerKiosId = $filters['kios_id'] ?? null;
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

        $customers = $query->latest()->paginate($filters['per_page'] ?? 50);
        $this->attachWilayahKabupaten($customers->getCollection());

        return $customers;
    }

    public function findById(int $id)
    {
        $customer = Customer::with(['uploader', 'marketing', 'broadcastHistories'])->findOrFail($id);
        $this->attachWilayahKabupaten(collect([$customer]));

        return $customer;
    }

    private function attachWilayahKabupaten(iterable $customers): void
    {
        $lookup = CabangWilayah::query()
            ->whereNotNull('kelurahan')
            ->get(['kecamatan', 'kelurahan', 'kabupaten_kota'])
            ->mapWithKeys(fn ($w) => [
                $this->stripRegionSpaces($w->kecamatan).'|'.$this->stripRegionSpaces($w->kelurahan) => $w->kabupaten_kota,
            ]);

        foreach ($customers as $customer) {
            $d = $customer->dynamic_data;
            if (! is_array($d)) {
                continue;
            }
            $kec = $this->normalizeRegion($d['kecamatan'] ?? null);
            $kel = $this->normalizeRegion($d['kelurahan'] ?? null);
            if (! $kec || ! $kel) {
                continue;
            }
            $key = $this->stripRegionSpaces($kec).'|'.$this->stripRegionSpaces($kel);
            $customer->wilayah_kabupaten = $lookup[$key] ?? null;
        }
    }

    public function create(array $data)
    {
        $dynamicData = $data['dynamic_data'] ?? null;
        if (is_string($dynamicData)) {
            $dynamicData = json_decode($dynamicData, true);
        }

        [$cabangId, $kiosOverride] = $this->detectCabangFromData(is_array($dynamicData) ? $dynamicData : null);

        if ($cabangId) {
            $data['cabang_id'] = $cabangId;
        }
        if ($kiosOverride) {
            $data['kios_id'] = $kiosOverride;
        }

        return Customer::create($data);
    }

    public function update(int $id, array $data)
    {
        $customer = Customer::findOrFail($id);

        if (array_key_exists('dynamic_data', $data)) {
            $dynamicData = $data['dynamic_data'];
            if (is_string($dynamicData)) {
                $dynamicData = json_decode($dynamicData, true);
            }

            [$cabangId, $kiosOverride] = $this->detectCabangFromData(is_array($dynamicData) ? $dynamicData : null);
            $data['cabang_id'] = $cabangId;
        }

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
            $q->with('marketing:id,name')->latest();
        }, 'sentMarks' => function ($q) {
            $q->with('user:id,name,role')->latest();
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
                $sisaCol = DB::getDriverName() === 'pgsql' ? "CAST(dynamic_data->>'sisa_angsuran' AS INTEGER)" : "CAST(JSON_EXTRACT(dynamic_data, '$.sisa_angsuran') AS INTEGER)";
                $query->whereRaw("$sisaCol BETWEEN ? AND ?", [(int) $range[0], (int) $range[1]]);
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

        if (! in_array(($filters['viewer_role'] ?? ''), ['superadmin', 'AO'])) {
            $existingUserIds = User::pluck('id');
            $viewerKiosId = $filters['kios_id'] ?? null;
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
            $existingUserIds = User::pluck('id');
            $chunks = array_chunk(array_keys($incomingNoContracts), 500);
            foreach ($chunks as $chunk) {
                $query = Customer::whereIn('no_contract', $chunk)
                    ->where(function ($q) use ($existingUserIds) {
                        $q->whereIn('uploaded_by', $existingUserIds)
                            ->orWhereNull('uploaded_by');
                    });
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

    public function deleteAll(?string $kiosId = null, bool $isSuperadmin = false): int
    {
        $entrySourceCol = DB::getDriverName() === 'pgsql' ? "dynamic_data->>'_entry_source'" : "json_extract(dynamic_data, '$._entry_source')";
        $query = Customer::query()
            ->when($kiosId, fn ($q) => $q->where('kios_id', $kiosId))
            ->whereRaw("$entrySourceCol IS NULL OR $entrySourceCol != 'manual'");

        if (! $isSuperadmin) {
            $allowedUploaderIds = User::where('role', '!=', 'superadmin')->pluck('id');
            $query->where(function ($q) use ($allowedUploaderIds) {
                $q->whereIn('uploaded_by', $allowedUploaderIds)
                    ->orWhereNull('uploaded_by');
            });
        }

        $customerIds = $query->pluck('id')->toArray();

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
            $existingUserIds = User::pluck('id');
            $query->where(function ($q) use ($existingUserIds, $kiosId) {
                $q->whereIn('uploaded_by', $existingUserIds);
                if ($kiosId) {
                    $q->orWhere(function ($q2) use ($existingUserIds, $kiosId) {
                        $q2->whereNotIn('uploaded_by', $existingUserIds)
                            ->whereNotNull('uploaded_by')
                            ->where('kios_id', $kiosId);
                    });
                }
            });
        }

        $totalCustomers = (clone $query)->count();
        $assigned = (clone $query)->where('assignment_status', 'assigned')->count();

        // Count customers who have never been broadcast (no WA broadcast + no manual send)
        $notBroadcast = (clone $query)->where(function ($q) {
            $q->whereNotIn('id', DB::table('broadcast_histories')->select('customer_id'))
                ->whereNotIn('id', DB::table('customer_sent_marks')->select('customer_id'));
        })->count();

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
            'not_broadcast' => $notBroadcast,
            'by_marketing' => $byMarketingCollection,
        ];
    }

    public function getOrphanStats(): array
    {
        $existingUserIds = User::pluck('id')->toArray();

        $orphanQuery = Customer::query()
            ->whereNotNull('uploaded_by')
            ->whereNotIn('uploaded_by', $existingUserIds);

        $totalOrphans = (clone $orphanQuery)->count();

        $byKios = (clone $orphanQuery)
            ->selectRaw('kios_id, count(*) as total')
            ->groupBy('kios_id')
            ->pluck('total', 'kios_id');

        $kiosNames = [];
        if ($byKios->isNotEmpty()) {
            $kiosRows = DB::table('kios')->whereIn('kios_id', $byKios->keys()->toArray())->get();
            foreach ($kiosRows as $row) {
                $kiosNames[$row->kios_id] = $row->kios_name;
            }
        }

        $noKios = (clone $orphanQuery)->whereNull('kios_id')->count();

        $details = [];
        foreach ($byKios as $kiosId => $count) {
            $details[] = [
                'kios_id' => $kiosId,
                'kios_name' => $kiosNames[$kiosId] ?? 'Unknown',
                'count' => $count,
            ];
        }
        if ($noKios > 0) {
            $details[] = [
                'kios_id' => null,
                'kios_name' => 'Tanpa Kios',
                'count' => $noKios,
            ];
        }

        return [
            'total_orphans' => $totalOrphans,
            'details' => collect($details)->sortByDesc('count')->values()->toArray(),
        ];
    }

    public function deleteOrphan(?string $kiosId = null): int
    {
        $existingUserIds = User::pluck('id')->toArray();

        $customerIds = Customer::query()
            ->whereNotNull('uploaded_by')
            ->whereNotIn('uploaded_by', $existingUserIds)
            ->when($kiosId, fn ($q) => $q->where('kios_id', $kiosId))
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

    public function distributeToUh(?string $viewerKiosId = null): array
    {
        $query = Customer::where('assignment_status', 'unassigned');
        if ($viewerKiosId) {
            $query->where('kios_id', $viewerKiosId);
        }
        Customer::applyOrphanFilter($query, $viewerKiosId);

        $customers = $query->select('id', 'kios_id', 'no_contract')->get();

        if ($customers->isEmpty()) {
            return ['message' => 'Tidak ada data yang belum diassign', 'distributed' => 0, 'per_kios' => []];
        }

        $byKios = $customers->groupBy('kios_id');
        $result = [];
        $assignments = [];

        foreach ($byKios as $kiosId => $kiosCustomers) {
            $uhUsers = User::where('role', 'UH')
                ->when($kiosId, fn ($q) => $q->where('kios_id', $kiosId))
                ->pluck('id')
                ->toArray();

            if (empty($uhUsers)) {
                $result[$kiosId ?? 'null'] = ['total' => $kiosCustomers->count(), 'uh_count' => 0, 'per_uh' => []];

                continue;
            }

            $nmc = $kiosCustomers->filter(fn ($c) => $c->no_contract && str_starts_with($c->no_contract, '4020'))->values();
            $refi = $kiosCustomers->filter(fn ($c) => $c->no_contract && str_starts_with($c->no_contract, '4029'))->values();
            $other = $kiosCustomers->filter(fn ($c) => ! $c->no_contract || (! str_starts_with($c->no_contract, '4020') && ! str_starts_with($c->no_contract, '4029')))->values();

            $uhCount = count($uhUsers);
            $perUh = array_fill_keys($uhUsers, ['nmc' => 0, 'refi' => 0, 'other' => 0]);

            foreach ([['items' => $nmc, 'type' => 'nmc'], ['items' => $refi, 'type' => 'refi'], ['items' => $other, 'type' => 'other']] as $group) {
                $items = $group['items'];
                $type = $group['type'];
                $idx = 0;
                foreach ($items as $item) {
                    $uhId = $uhUsers[$idx % $uhCount];
                    $assignments[$item->id] = $uhId;
                    $perUh[$uhId][$type]++;
                    $idx++;
                }
            }

            $result[$kiosId ?? 'null'] = [
                'total' => $kiosCustomers->count(),
                'uh_count' => $uhCount,
                'per_uh' => $perUh,
            ];
        }

        // Batch update
        DB::beginTransaction();
        try {
            $chunks = array_chunk($assignments, 500, true);
            foreach ($chunks as $chunk) {
                foreach ($chunk as $customerId => $uhId) {
                    Customer::where('id', $customerId)->update(['uh_id' => $uhId]);
                }
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return [
            'message' => 'Distribusi berhasil',
            'distributed' => count($assignments),
            'per_kios' => $result,
        ];
    }

    private function detectCabangFromData(?array $dynamicData): array
    {
        $cabangId = null;
        $kiosIdOverride = null;

        if (! $dynamicData) {
            return [$cabangId, $kiosIdOverride];
        }

        $kabupaten = $this->normalizeRegion(
            $dynamicData['kabupaten_kota']
                ?? $dynamicData['kabupaten']
                ?? $dynamicData['kab_kota']
                ?? $dynamicData['kota_kabupaten']
                ?? null,
            false
        );
        $kecamatan = $this->normalizeRegion($dynamicData['kecamatan'] ?? null);
        $kelurahan = $this->resolveKelurahanAlias(
            $kecamatan,
            $this->normalizeRegion($dynamicData['kelurahan'] ?? null)
        );

        $wilayah = null;

        if ($kelurahan) {
            $wilayah = $this->matchCabangWilayah($kabupaten, $kecamatan, $kelurahan);
        }

        if (! $wilayah && $kecamatan) {
            $wilayah = $this->matchCabangWilayah($kabupaten, $kecamatan, null);
        }

        if ($wilayah) {
            $cabangId = $wilayah->cabang_id;
        }

        return [$cabangId, $kiosIdOverride];
    }

    private function matchCabangWilayah(?string $kabupaten, string $kecamatan, ?string $kelurahan): ?CabangWilayah
    {
        $wilayah = $this->queryCabangWilayah($kabupaten, $kecamatan, $kelurahan);
        if (! $wilayah) {
            $wilayah = $this->queryCabangWilayah($kabupaten, $kecamatan, $kelurahan, true);
        }

        return $wilayah;
    }

    private function queryCabangWilayah(?string $kabupaten, string $kecamatan, ?string $kelurahan, bool $stripSpaces = false): ?CabangWilayah
    {
        $query = CabangWilayah::query();

        if ($stripSpaces) {
            $query->whereRaw("LOWER(REPLACE(kecamatan, ' ', '')) = ?", [$this->stripRegionSpaces($kecamatan)]);
        } else {
            $query->whereRaw('LOWER(kecamatan) = ?', [mb_strtolower($kecamatan)]);
        }

        if ($kelurahan !== null) {
            if ($stripSpaces) {
                $query->whereRaw("LOWER(REPLACE(kelurahan, ' ', '')) = ?", [$this->stripRegionSpaces($kelurahan)]);
            } else {
                $query->whereRaw('LOWER(kelurahan) = ?', [mb_strtolower($kelurahan)]);
            }
        } else {
            $query->whereNull('kelurahan');
        }

        if ($kabupaten) {
            if ($stripSpaces) {
                $query->whereRaw("LOWER(REPLACE(kabupaten_kota, ' ', '')) = ?", [$this->stripRegionSpaces($kabupaten)]);
            } else {
                $query->whereRaw('LOWER(kabupaten_kota) = ?', [mb_strtolower($kabupaten)]);
            }
        }

        $matches = $query->get();

        return $matches->count() === 1 ? $matches->first() : null;
    }

    private function stripRegionSpaces(string $value): string
    {
        return preg_replace('/\s+/', '', mb_strtolower($value));
    }

    private const KELURAHAN_ALIASES = [
        'cangkringan' => [
            'wukir sari' => 'Wukisari',
            'kepuh harjo' => 'Kepuharjo',
        ],
    ];

    private function resolveKelurahanAlias(?string $kecamatan, ?string $kelurahan): ?string
    {
        if (! $kecamatan || ! $kelurahan) {
            return $kelurahan;
        }

        return self::KELURAHAN_ALIASES[mb_strtolower($kecamatan)][mb_strtolower($kelurahan)] ?? $kelurahan;
    }

    private function normalizeRegion(?string $value, bool $stripRegionPrefix = true): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        if ($stripRegionPrefix) {
            $value = preg_replace('/^(kecamatan|kec|kelurahan|kel)\s+/i', '', $value);
        } else {
            $value = preg_replace('/^(kabupaten|kab\.|kab)\s+/i', '', $value);
        }

        $value = preg_replace('/\s+/', ' ', trim($value));

        return $value === '' ? null : $value;
    }

    public function syncCustomerCabang(int $chunkSize = 500): int
    {
        $updated = 0;

        Customer::whereNotNull('dynamic_data')
            ->chunk($chunkSize, function ($customers) use (&$updated) {
                foreach ($customers as $customer) {
                    $dynamicData = $customer->dynamic_data;
                    if (! $dynamicData) {
                        continue;
                    }

                    [$cabangId, $kiosOverride] = $this->detectCabangFromData($dynamicData);

                    $updateData = [];
                    if ($cabangId) {
                        $updateData['cabang_id'] = $cabangId;
                    }
                    if ($kiosOverride) {
                        $updateData['kios_id'] = $kiosOverride;
                    }

                    if (! empty($updateData)) {
                        Customer::where('id', $customer->id)->update($updateData);
                        $updated++;
                    }
                }
            });

        return $updated;
    }

    public function syncCustomerCabangFromKios(int $chunkSize = 500): int
    {
        $updated = 0;

        Customer::whereNotNull('kios_id')
            ->chunk($chunkSize, function ($customers) use (&$updated) {
                foreach ($customers as $customer) {
                    $kios = Kios::where('kios_id', $customer->kios_id)->first();
                    if ($kios && $kios->cabang_id) {
                        Customer::where('id', $customer->id)->update(['cabang_id' => $kios->cabang_id]);
                        $updated++;
                    }
                }
            });

        return $updated;
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

                [$cabangId, $kiosOverride] = $this->detectCabangFromData($dynamicData);

                Customer::create([
                    'no_contract' => $noContract,
                    'name' => $data['name'] ?? '',
                    'phone_number' => $data['phone_number'] ?? '',
                    'uploaded_by' => $uploadedBy,
                    'kios_id' => $kiosOverride ?? $kiosId,
                    'cabang_id' => $cabangId,
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

                [$cabangId, $kiosOverride] = $this->detectCabangFromData($dynamicData);

                DB::beginTransaction();
                Customer::create([
                    'no_contract' => $noContract,
                    'name' => $data['name'] ?? '',
                    'phone_number' => $data['phone_number'] ?? '',
                    'uploaded_by' => $uploadedBy,
                    'kios_id' => $kiosOverride ?? $kiosId,
                    'cabang_id' => $cabangId,
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
