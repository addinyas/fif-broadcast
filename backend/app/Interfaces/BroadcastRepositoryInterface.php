<?php

namespace App\Interfaces;

use Illuminate\Pagination\LengthAwarePaginator;

interface BroadcastRepositoryInterface
{
    public function create(array $data);

    public function getHistory(?int $marketingId, array $filters = [], ?string $kiosId = null): LengthAwarePaginator;

    public function getStats(?int $marketingId = null, ?string $kiosId = null): array;

    public function getPendingBroadcasts(int $limit = 10);

    public function updateStatus(int $id, string $status, ?string $errorLog = null): void;
}
