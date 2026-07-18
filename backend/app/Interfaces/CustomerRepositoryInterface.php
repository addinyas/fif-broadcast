<?php

namespace App\Interfaces;

use Illuminate\Pagination\LengthAwarePaginator;

interface CustomerRepositoryInterface
{
    public function getAll(array $filters = []): LengthAwarePaginator;

    public function findById(int $id);

    public function create(array $data);

    public function update(int $id, array $data);

    public function delete(int $id): void;

    public function assignToMarketing(int $customerId, int $marketingId);

    public function unassign(int $customerId);

    public function getAssignedToMarketing(?int $marketingId, array $filters = []): LengthAwarePaginator;

    public function bulkImport(array $customers, int $uploadedBy, ?string $kiosId = null): array;

    public function getDistributionReport(): array;

    public function deleteAll(?string $kiosId = null, bool $isSuperadmin = false): int;

    public function deleteMyData(int $userId): int;

    public function batchDelete(array $ids): int;

    public function getOrphanStats(): array;

    public function deleteOrphan(?string $kiosId = null): int;
}
