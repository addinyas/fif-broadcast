<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Notification;
use App\Services\CustomerService;
use App\Services\GoogleSheetsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class CustomerController extends Controller
{
    public function __construct(
        protected CustomerService $customerService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'assignment_status', 'marketing_id', 'marketing_ids', 'per_page', 'customer_type']);

        $user = $request->user();
        $filters['viewer_role'] = $user->role;
        if (in_array($user->role, ['UH', 'marketing'], true) && $user->kios_id) {
            $filters['kios_id'] = $user->kios_id;
        }

        // Marketing: only see own assigned + shared (borrowed) customers
        if ($user->role === 'marketing') {
            $filters['viewer_id'] = $user->id;
        }

        return response()->json($this->customerService->getAll($filters));
    }

    public function show(int $id, Request $request): JsonResponse
    {
        try {
            $customer = $this->customerService->findById($id);
            $user = $request->user();
            if ($user->role !== 'superadmin' && $user->kios_id && $customer->kios_id !== $user->kios_id) {
                return response()->json(['message' => 'Customer not found'], 404);
            }

            return response()->json($customer);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Customer not found'], 404);
        }
    }

    public function byNoContract(string $noContract, Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Customer::where('no_contract', $noContract);
        if ($user->role !== 'superadmin' && $user->kios_id) {
            $query->where('kios_id', $user->kios_id);
        }
        $customer = $query->first();

        if (! $customer) {
            $escaped = '%'.addcslashes($noContract, '%_\\').'%';
            $fallbackQuery = Customer::where('dynamic_data', 'like', $escaped)
                ->whereRaw("json_extract(dynamic_data, '$.no_contract') = ?", [$noContract]);
            if ($user->role !== 'superadmin' && $user->kios_id) {
                $fallbackQuery->where('kios_id', $user->kios_id);
            }
            $customer = $fallbackQuery->first();
        }

        if (! $customer) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        return response()->json($customer);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone_number' => 'required|string|max:20',
            'dynamic_data' => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only(['name', 'phone_number', 'dynamic_data']);
        $data['uploaded_by'] = $request->user()->id;
        if ($request->user()->kios_id) {
            $data['kios_id'] = $request->user()->kios_id;
        }

        // copy no_contract dari dynamic_data ke kolom
        $dynamicData = $data['dynamic_data'] ?? [];
        if (empty($data['no_contract']) && ! empty($dynamicData['no_contract'])) {
            $data['no_contract'] = $dynamicData['no_contract'];
        }

        // cek duplikat no_contract (per kios)
        $noContract = $data['no_contract'] ?? null;
        if ($noContract) {
            $dupQuery = Customer::where('no_contract', $noContract);
            if (! empty($data['kios_id'])) {
                $dupQuery->where('kios_id', $data['kios_id']);
            }
            if ($dupQuery->exists()) {
                return response()->json(['message' => "No Contract '$noContract' sudah terdaftar"], 409);
            }
        }

        $customer = $this->customerService->create($data);

        return response()->json($customer, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'phone_number' => 'sometimes|string|max:20',
            'dynamic_data' => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $customer = $this->customerService->findById($id);
            $user = $request->user();
            if ($user->role !== 'superadmin' && $user->kios_id && $customer->kios_id !== $user->kios_id) {
                return response()->json(['message' => 'Customer not found'], 404);
            }

            $validated = $request->only(['name', 'phone_number', 'dynamic_data']);
            $customer = $this->customerService->update($id, $validated);

            return response()->json($customer);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Customer not found'], 404);
        }
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        try {
            $customer = $this->customerService->findById($id);
            $user = $request->user();
            if ($user->role !== 'superadmin' && $user->kios_id && $customer->kios_id !== $user->kios_id) {
                return response()->json(['message' => 'Customer not found'], 404);
            }

            $this->customerService->delete($id);

            return response()->json(['message' => 'Customer deleted']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Customer not found'], 404);
        }
    }

    public function import(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'customers' => 'required|array',
            'customers.*.name' => 'required|string',
            'customers.*.phone_number' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $result = $this->customerService->bulkImport($request->customers, $request->user()->id, $request->user()->kios_id);

        if (($result['imported'] ?? 0) > 0) {
            $user = $request->user();
            Notification::create([
                'user_id' => $user->id,
                'type' => 'import',
                'title' => 'Import berhasil',
                'message' => "{$result['imported']} data berhasil diimport.",
                'data' => [
                    'imported' => $result['imported'],
                    'failed' => $result['failed'] ?? [],
                ],
            ]);
        }

        return response()->json($result);
    }

    public function importFile(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $result = $this->customerService->importFromFile(
                $request->file('file'),
                $request->user()->id,
                $request->user()->kios_id
            );

            if (! isset($result['detected_columns'])) {
                $result['detected_columns'] = [];
            }

            if (($result['imported'] ?? 0) > 0) {
                $user = $request->user();
                Notification::create([
                    'user_id' => $user->id,
                    'type' => 'import',
                    'title' => 'Import berhasil',
                    'message' => "{$result['imported']} data berhasil diimport dari file.",
                    'data' => [
                        'imported' => $result['imported'],
                        'failed' => $result['failed'] ?? [],
                    ],
                ]);
            }

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal membaca file'], 400);
        }
    }

    public function importSpreadsheet(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'spreadsheet_url' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $spreadsheetId = GoogleSheetsService::parseSpreadsheetUrl($request->spreadsheet_url);
            $sheetsService = app(GoogleSheetsService::class);
            $rows = $sheetsService->getSheetData($spreadsheetId);

            if (empty($rows)) {
                return response()->json(['message' => 'Spreadsheet kosong atau tidak ditemukan. Pastikan sheet memiliki data dan di-share publik.'], 400);
            }

            $rawHeader = $rows[0];
            $header = $this->customerService->normalizeHeaders($rawHeader);
            $data = [];
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                if (array_filter($row) && count($header) === count($row)) {
                    $combined = array_combine($header, $row);
                    if ($combined !== false) {
                        $data[] = $combined;
                    }
                }
            }

            if (empty($data)) {
                return response()->json([
                    'imported' => 0,
                    'failed' => [['row' => 0, 'error' => 'Tidak ada baris data yang valid. Header yang terdeteksi: '.implode(', ', $rawHeader)]],
                    'detected_columns' => $rawHeader,
                ], 200);
            }

            $result = $this->customerService->importFromSpreadsheetData($data, $request->user()->id, $request->user()->kios_id);

            if ($result['imported'] === 0) {
                $result['detected_columns'] = $rawHeader;
            }

            if (($result['imported'] ?? 0) > 0) {
                $user = $request->user();
                Notification::create([
                    'user_id' => $user->id,
                    'type' => 'import',
                    'title' => 'Import berhasil',
                    'message' => "{$result['imported']} data berhasil diimport dari spreadsheet.",
                    'data' => [
                        'imported' => $result['imported'],
                        'failed' => $result['failed'] ?? [],
                    ],
                ]);
            }

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal memproses spreadsheet'], 400);
        }
    }

    public function deleteAll(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'confirm' => 'required|in:DELETE_ALL',
            'kios_id' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Konfirmasi diperlukan. Kirim confirm: "DELETE_ALL"'], 422);
        }

        try {
            $user = $request->user();
            $kiosId = null;
            if ($user->role !== 'superadmin') {
                $kiosId = $user->kios_id;
            } elseif ($request->has('kios_id') && $request->kios_id !== '') {
                $kiosId = $request->kios_id;
            }
            $count = $this->customerService->deleteAll($kiosId);

            return response()->json(['message' => "{$count} customer berhasil dihapus"]);
        } catch (\Exception $e) {
            Log::error('deleteAll failed', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'Gagal menghapus semua customer: '.$e->getMessage()], 500);
        }
    }

    public function deleteMyData(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'confirm' => 'required|in:DELETE_MY_DATA',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Konfirmasi diperlukan. Kirim confirm: "DELETE_MY_DATA"'], 422);
        }

        try {
            $user = $request->user();
            $count = $this->customerService->deleteMyData($user->id);

            return response()->json(['message' => "{$count} customer milik Anda berhasil dihapus"]);
        } catch (\Exception $e) {
            Log::error('deleteMyData failed', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'Gagal menghapus data: '.$e->getMessage()], 500);
        }
    }

    public function allIds(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Customer::query();
        if ($user->role !== 'superadmin' && $user->kios_id) {
            $query->where('kios_id', $user->kios_id);
        }
        $ids = $query->pluck('id');

        return response()->json(['ids' => $ids, 'total' => $ids->count()]);
    }

    public function updateCori(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'cori' => 'required|string|in:MEDIUM,GOOD,GOOD LOYAL',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $customer = $this->customerService->findById($id);
            $user = $request->user();
            if ($user->role !== 'superadmin' && $user->kios_id && $customer->kios_id !== $user->kios_id) {
                return response()->json(['message' => 'Customer not found'], 404);
            }
            $dynamicData = $customer->dynamic_data ?? [];

            // Save CORI only — plafon is computed on-the-fly from OTR + CORI
            $dynamicData['cori'] = $request->cori;

            $customer = $this->customerService->update($id, ['dynamic_data' => $dynamicData]);

            return response()->json($customer);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Customer not found'], 404);
        }
    }

    public function batchDelete(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:customers,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $user = $request->user();
            $ids = $request->ids;
            if ($user->role !== 'superadmin' && $user->kios_id) {
                $ids = Customer::whereIn('id', $ids)
                    ->where('kios_id', $user->kios_id)
                    ->pluck('id')
                    ->toArray();
            }
            $count = $this->customerService->batchDelete($ids);

            return response()->json(['message' => "{$count} customer berhasil dihapus"]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal menghapus customer'], 400);
        }
    }

    public function assignedToMe(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'per_page', 'customer_type', 'sisa_angsuran', 'ownership']);
        $user = $request->user();

        // Marketing: only their assigned customers. Superadmin/UH: all (scoped by kios below).
        $marketingId = $user->role === 'marketing' ? $user->id : null;

        // UH/marketing: scope to their kios
        if (in_array($user->role, ['UH', 'marketing'], true) && $user->kios_id) {
            $filters['kios_id'] = $user->kios_id;
        }

        $filters['viewer_role'] = $user->role;

        $customers = $this->customerService->getAssignedToMarketing($marketingId, $filters);

        Log::info('assignedToMe', [
            'user_id' => $user->id,
            'role' => $user->role,
            'marketing_id' => $marketingId,
            'kios_id' => $filters['kios_id'] ?? null,
            'total' => $customers->total(),
            'page_count' => $customers->count(),
        ]);

        return response()->json($customers);
    }

    public function marketingAdd(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone_number' => 'required|string|max:20',
            'dynamic_data' => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only(['name', 'phone_number', 'dynamic_data']);
        $dynamicData = $data['dynamic_data'] ?? [];

        // ekstrak & cek duplikat no_contract (per kios)
        $noContract = $dynamicData['no_contract'] ?? null;
        if ($noContract) {
            $dupQuery = Customer::where('no_contract', $noContract);
            $userKiosId = $request->user()->kios_id;
            if ($userKiosId) {
                $dupQuery->where('kios_id', $userKiosId);
            }
            if ($dupQuery->exists()) {
                return response()->json(['message' => "No Contract '$noContract' sudah terdaftar"], 409);
            }
            $data['no_contract'] = $noContract;
        }

        $data['uploaded_by'] = $request->user()->id;
        if ($request->user()->kios_id) {
            $data['kios_id'] = $request->user()->kios_id;
        }
        $dynamicData['_entry_source'] = 'manual';
        $data['dynamic_data'] = $dynamicData;

        $customer = $this->customerService->create($data);
        $this->customerService->assignToMarketing($customer->id, $request->user()->id);

        return response()->json($customer, 201);
    }

    public function destroyManual(int $id, Request $request): JsonResponse
    {
        try {
            $customer = $this->customerService->findById($id);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'superadmin' && $user->kios_id && $customer->kios_id !== $user->kios_id) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $dd = $customer->dynamic_data ?? [];
        if (($dd['_entry_source'] ?? null) !== 'manual') {
            return response()->json(['message' => 'Hanya customer input manual yang bisa dihapus'], 403);
        }

        // Marketing can only delete their own manual entries
        if ($user->role === 'marketing' && $customer->marketing_id !== $user->id) {
            return response()->json(['message' => 'Tidak bisa menghapus customer milik marketing lain'], 403);
        }

        $this->customerService->unassign($id);
        $this->customerService->delete($id);

        return response()->json(['message' => 'Customer berhasil dihapus']);
    }

    public function markSent(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $query = Customer::where('id', $id);
        if ($user->role === 'marketing') {
            $query->where('marketing_id', $user->id);
        } elseif ($user->role !== 'superadmin' && $user->kios_id) {
            $query->where('kios_id', $user->kios_id);
        }

        $customer = $query->first();

        if (! $customer) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $customer->manual_sent_at = now();
        $customer->manual_sent_by = $request->user()->id;
        $customer->save();

        return response()->json(['message' => 'Marked as sent']);
    }

    public function sentIds(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Customer::whereNotNull('manual_sent_at');
        if ($user->role === 'marketing') {
            $query->where('marketing_id', $user->id);
        } elseif ($user->role !== 'superadmin' && $user->kios_id) {
            $query->where('kios_id', $user->kios_id);
        }
        $ids = $query->pluck('id');

        return response()->json(['ids' => $ids]);
    }

    public function clearSentMarks(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Customer::whereNotNull('manual_sent_at');
        if ($user->role === 'marketing') {
            $query->where('marketing_id', $user->id);
        } elseif ($user->role !== 'superadmin' && $user->kios_id) {
            $query->where('kios_id', $user->kios_id);
        } else {
            $query->where('manual_sent_by', $user->id);
        }
        $query->update(['manual_sent_at' => null, 'manual_sent_by' => null]);

        return response()->json(['message' => 'Sent marks cleared']);
    }

    public function searchCalculator(Request $request): JsonResponse
    {
        $q = $request->query('q', '');
        if (strlen(trim($q)) < 2) {
            return response()->json([]);
        }

        $user = $request->user();
        $query = Customer::where(function ($query) use ($q) {
            $query->where('no_contract', $q)
                ->orWhere('no_contract', 'like', "%{$q}%")
                ->orWhere('name', 'like', "%{$q}%");
        });
        if ($user->role !== 'superadmin' && $user->kios_id) {
            $query->where('kios_id', $user->kios_id);
        }

        $customers = $query->limit(20)
            ->get(['id', 'name', 'no_contract', 'dynamic_data']);

        // sort: exact no_contract match first
        $customers = $customers->sortByDesc(function ($c) use ($q) {
            $score = 0;
            if ($c->no_contract === $q) {
                $score += 100;
            }
            if (str_starts_with($c->no_contract ?? '', $q)) {
                $score += 50;
            }
            if (str_starts_with($c->name, $q)) {
                $score += 25;
            }

            return $score;
        })->values();

        return response()->json($customers);
    }

    public function templateDownload()
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        $headers = [
            'NO_CONTRACT', 'NAMA', 'SISA ANGSURAN', 'KECAMATAN', 'KELURAHAN',
            'OBJ_DESC', 'VCODE', 'TAHUN', 'OTR',
            'CORI', 'NO_WHATSAPP',
        ];

        $sampleData = [
            '40200001', 'Nama Contoh', '6', 'Gamping', 'Trimurti',
            'Honda Beat', '001', '2023', '18000000',
            'GOOD', '08123456789',
        ];

        foreach ($headers as $col => $header) {
            $coord = Coordinate::stringFromColumnIndex($col + 1).'1';
            $cell = $sheet->getCell($coord);
            $cell->setValue($header);
            $cell->getStyle()->getFont()->setBold(true);
        }

        foreach ($sampleData as $col => $value) {
            $coord = Coordinate::stringFromColumnIndex($col + 1).'2';
            $sheet->getCell($coord)->setValue($value);
        }

        foreach ($headers as $col => $header) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($col + 1))->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $tempPath = tempnam(sys_get_temp_dir(), 'template_');
        $writer->save($tempPath);
        $spreadsheet->disconnectWorksheets();

        $contents = file_get_contents($tempPath);
        unlink($tempPath);

        return Response::make($contents, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment;filename="template_import_customer.xlsx"',
        ]);
    }
}
