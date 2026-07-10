<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\CustomerService;
use App\Services\GoogleSheetsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CustomerController extends Controller
{
    public function __construct(
        protected CustomerService $customerService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'assignment_status', 'marketing_id', 'marketing_ids', 'per_page', 'buss_unit']);

        return response()->json($this->customerService->getAll($filters));
    }

    public function show(int $id): JsonResponse
    {
        try {
            return response()->json($this->customerService->findById($id));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Customer not found'], 404);
        }
    }

    public function byNoContract(string $noContract): JsonResponse
    {
        $customer = Customer::where('no_contract', $noContract)->first();

        if (! $customer) {
            // fallback ke dynamic_data untuk data lama
            $customer = Customer::where('dynamic_data', 'like', '%"no_contract":"'.addslashes($noContract).'"%')->orWhere('dynamic_data', 'like', "%'no_contract':'{$noContract}'%")->first();
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

        $data = $request->all();
        $data['uploaded_by'] = $request->user()->id;

        // copy no_contract dari dynamic_data ke kolom
        $dynamicData = $data['dynamic_data'] ?? [];
        if (empty($data['no_contract']) && ! empty($dynamicData['no_contract'])) {
            $data['no_contract'] = $dynamicData['no_contract'];
        }

        // cek duplikat no_contract
        $noContract = $data['no_contract'] ?? null;
        if ($noContract && Customer::where('no_contract', $noContract)->exists()) {
            return response()->json(['message' => "No Contract '$noContract' sudah terdaftar"], 409);
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
            $customer = $this->customerService->update($id, $request->all());

            return response()->json($customer);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Customer not found'], 404);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
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

        $result = $this->customerService->bulkImport($request->customers, $request->user()->id);

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
                $request->user()->id
            );

            if (! isset($result['detected_columns'])) {
                $result['detected_columns'] = [];
            }

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal membaca file: '.$e->getMessage()], 400);
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

            $result = $this->customerService->importFromSpreadsheetData($data, $request->user()->id);

            if ($result['imported'] === 0) {
                $result['detected_columns'] = $rawHeader;
            }

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function deleteAll(Request $request): JsonResponse
    {
        try {
            $count = $this->customerService->deleteAll();

            return response()->json(['message' => "{$count} customer berhasil dihapus"]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal menghapus semua customer: '.$e->getMessage()], 400);
        }
    }

    public function allIds(Request $request): JsonResponse
    {
        $ids = Customer::query()->pluck('id');

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
            $dynamicData = $customer->dynamic_data ?? [];
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
            $count = $this->customerService->batchDelete($request->ids);

            return response()->json(['message' => "{$count} customer berhasil dihapus"]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal menghapus customer: '.$e->getMessage()], 400);
        }
    }

    public function assignedToMe(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'per_page', 'buss_unit', 'sisa_angsuran']);
        $marketingId = in_array($request->user()->role, ['superadmin', 'UH'], true)
            ? null
            : $request->user()->id;
        $customers = $this->customerService->getAssignedToMarketing($marketingId, $filters);

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

        $data = $request->all();
        $dynamicData = $data['dynamic_data'] ?? [];

        // ekstrak & cek duplikat no_contract
        $noContract = $dynamicData['no_contract'] ?? ($data['no_contract'] ?? null);
        if ($noContract) {
            if (Customer::where('no_contract', $noContract)->exists()) {
                return response()->json(['message' => "No Contract '$noContract' sudah terdaftar"], 409);
            }
            $data['no_contract'] = $noContract;
        }

        $data['uploaded_by'] = $request->user()->id;
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

        $dd = $customer->dynamic_data ?? [];
        if (($dd['_entry_source'] ?? null) !== 'manual') {
            return response()->json(['message' => 'Hanya customer input manual yang bisa dihapus'], 403);
        }

        $this->customerService->unassign($id);
        $this->customerService->delete($id);

        return response()->json(['message' => 'Customer berhasil dihapus']);
    }

    public function markSent(Request $request, int $id): JsonResponse
    {
        $query = Customer::where('id', $id);
        if (! in_array($request->user()->role, ['superadmin', 'UH'], true)) {
            $query->where('marketing_id', $request->user()->id);
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
        $query = Customer::whereNotNull('manual_sent_at');
        if (! in_array($request->user()->role, ['superadmin', 'UH'], true)) {
            $query->where('marketing_id', $request->user()->id);
        }
        $ids = $query->pluck('id');

        return response()->json(['ids' => $ids]);
    }

    public function clearSentMarks(Request $request): JsonResponse
    {
        $query = Customer::whereNotNull('manual_sent_at');
        if (in_array($request->user()->role, ['superadmin', 'UH'], true)) {
            $query->where('manual_sent_by', $request->user()->id);
        } else {
            $query->where('marketing_id', $request->user()->id);
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

        $customers = Customer::where(function ($query) use ($q) {
            $query->where('no_contract', $q)
                ->orWhere('no_contract', 'like', "%{$q}%")
                ->orWhere('name', 'like', "%{$q}%");
        })
            ->limit(20)
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
}
