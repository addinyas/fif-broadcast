<?php

namespace App\Services;

use App\Interfaces\CustomerRepositoryInterface;
use App\Models\BroadcastHistory;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;

class CustomerService
{
    public function __construct(
        protected CustomerRepositoryInterface $customerRepository
    ) {}

    public function getAll(array $filters = []): LengthAwarePaginator
    {
        return $this->customerRepository->getAll($filters);
    }

    public function findById(int $id)
    {
        return $this->customerRepository->findById($id);
    }

    public function create(array $data)
    {
        return $this->customerRepository->create($data);
    }

    public function update(int $id, array $data)
    {
        return $this->customerRepository->update($id, $data);
    }

    public function delete(int $id): void
    {
        $this->customerRepository->delete($id);
    }

    public function assignToMarketing(int $customerId, int $marketingId)
    {
        return $this->customerRepository->assignToMarketing($customerId, $marketingId);
    }

    public function unassign(int $customerId)
    {
        return $this->customerRepository->unassign($customerId);
    }

    public function getAssignedToMarketing(?int $marketingId, array $filters = []): LengthAwarePaginator
    {
        return $this->customerRepository->getAssignedToMarketing($marketingId, $filters);
    }

    public function bulkImport(array $customers, int $uploadedBy): array
    {
        return $this->customerRepository->bulkImport($customers, $uploadedBy);
    }

    public function normalizeHeaders(array $headers): array
    {
        $normalized = [];
        $seen = [];
        foreach ($headers as $h) {
            $key = strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '_', $h)));
            $key = trim($key, '_');
            if (isset($seen[$key])) {
                $seen[$key]++;
                $key .= '_'.$seen[$key];
            } else {
                $seen[$key] = 1;
            }
            $normalized[] = $key;
        }

        return $normalized;
    }

    protected function extractFromRow(array $row): ?array
    {
        $name = $row['name'] ?? $row['nama'] ?? $row['nama_lengkap'] ?? $row['customer_name'] ?? $row['nama_customer'] ?? '';
        $phone = $row['phone_number'] ?? $row['phone'] ?? $row['no_hp'] ?? $row['telepon'] ?? $row['nomor_telepon'] ?? $row['no_telepon'] ?? $row['no_whatsapp'] ?? $row['whatsapp'] ?? $row['hp'] ?? $row['wa'] ?? '';
        if (empty($name)) {
            return null;
        }

        return [
            'name' => $name,
            'phone_number' => preg_replace('/[^0-9+]/', '', $phone),
            'dynamic_data' => $row,
        ];
    }

    public function importFromFile(UploadedFile $file, int $uploadedBy): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $rows = [];
        $rawHeader = [];

        if ($extension !== 'csv') {
            return ['imported' => 0, 'failed' => [['row' => 0, 'error' => 'Hanya format CSV yang didukung']], 'detected_columns' => []];
        }

        $contents = file_get_contents($file->getPathname());
        if (str_starts_with($contents, "\xEF\xBB\xBF")) {
            $contents = substr($contents, 3);
        }
        $firstLine = strtok($contents, "\n\r");
        $commaCount = substr_count($firstLine, ',');
        $semicolonCount = substr_count($firstLine, ';');
        $delimiter = $semicolonCount > $commaCount ? ';' : ',';
        $handle = fopen('php://temp', 'r+');
        fwrite($handle, $contents);
        rewind($handle);
        $header = null;
        while (($line = fgetcsv($handle, null, $delimiter)) !== false) {
            if (! $header) {
                $rawHeader = $line;
                $header = $this->normalizeHeaders($line);

                continue;
            }
            if (count($header) === count($line)) {
                $parsed = array_combine($header, $line);
                if ($parsed !== false) {
                    $rows[] = $parsed;
                }
            }
        }
        fclose($handle);

        $customers = [];
        foreach ($rows as $row) {
            $parsed = $this->extractFromRow($row);
            if ($parsed) {
                $customers[] = $parsed;
            }
        }

        $result = $this->customerRepository->bulkImport($customers, $uploadedBy);
        $result['detected_columns'] = $rawHeader;

        return $result;
    }

    public function importFromSpreadsheetData(array $rows, int $uploadedBy): array
    {
        $customers = [];
        foreach ($rows as $row) {
            $parsed = $this->extractFromRow($row);
            if ($parsed) {
                $customers[] = $parsed;
            }
        }

        return $this->customerRepository->bulkImport($customers, $uploadedBy);
    }

    public function deleteAll(): int
    {
        return $this->customerRepository->deleteAll();
    }

    public function batchDelete(array $ids): int
    {
        return $this->customerRepository->batchDelete($ids);
    }

    public function getDistributionReport(): array
    {
        $report = $this->customerRepository->getDistributionReport();

        $byMarketing = $report['by_marketing'];
        $marketingIds = $byMarketing->pluck('marketing_id')->toArray();

        if (! empty($marketingIds)) {
            $stats = BroadcastHistory::whereIn('marketing_id', $marketingIds)
                ->selectRaw("
                    marketing_id,
                    COUNT(*) as total_broadcasts,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing
                ")
                ->groupBy('marketing_id')
                ->get()
                ->keyBy('marketing_id');

            foreach ($byMarketing as $item) {
                $s = $stats->get($item->marketing_id);
                $item->total_broadcasts = $s ? (int) $s->total_broadcasts : 0;
                $item->sent = $s ? (int) $s->sent : 0;
                $item->failed = $s ? (int) $s->failed : 0;
                $item->pending = $s ? (int) $s->pending : 0;
                $item->processing = $s ? (int) $s->processing : 0;
            }
        }

        return $report;
    }
}
