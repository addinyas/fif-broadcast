<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\ExcelConfig;
use App\Services\CloudExcelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class CloudExcelController extends Controller
{
    public function __construct(
        private readonly CloudExcelService $cloudExcel,
    ) {}

    /**
     * POST /api/single-data/preview-excel
     * Fetch headers + first 5 rows for column mapping preview.
     */
    public function previewExcel(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'excel_url' => 'required|url',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $result = $this->cloudExcel->fetchData($request->excel_url);

            return response()->json([
                'platform' => $result['platform'],
                'headers' => $result['headers'],
                'total_rows' => count($result['rows']),
                'preview' => array_slice($result['rows'], 0, 5),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        } catch (\Exception $e) {
            Log::error('previewExcel error', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Gagal mengakses Excel. Coba lagi atau hubungi admin.'], 500);
        }
    }

    /**
     * POST /api/single-data/save-excel-config
     * Save Excel link + column mapping for a specific kios.
     */
    public function saveConfig(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'kios_id' => 'required|string',
            'excel_url' => 'required|url',
            'column_mapping' => 'required|array|min:1',
            'sheet_name' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $kiosId = $request->kios_id;
        $url = $request->excel_url;
        $platform = ExcelConfig::detectPlatform($url);

        if (! $platform) {
            return response()->json(['message' => 'URL tidak dikenali. Gunakan link Google Sheets atau Excel Online (OneDrive).'], 422);
        }

        $spreadsheetId = match ($platform) {
            'google_sheets' => ExcelConfig::extractGoogleSheetsId($url),
            'excel_online' => ExcelConfig::extractOneDriveFileId($url),
            default => null,
        };

        $config = ExcelConfig::updateOrCreate(
            [
                'ao_id' => $user->id,
                'kios_id' => $kiosId,
            ],
            [
                'platform' => $platform,
                'excel_url' => $url,
                'spreadsheet_id' => $spreadsheetId,
                'sheet_name' => $request->sheet_name,
                'column_mapping' => $request->column_mapping,
                'is_active' => true,
            ]
        );

        return response()->json([
            'message' => 'Konfigurasi Excel untuk kios ini berhasil disimpan.',
            'config' => $config,
        ]);
    }

    /**
     * POST /api/single-data/import-from-excel
     * Import customers from a specific kios's configured Excel link.
     */
    public function importFromExcel(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'kios_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $kiosId = $request->kios_id;

        $config = ExcelConfig::where('ao_id', $user->id)
            ->where('kios_id', $kiosId)
            ->where('is_active', true)
            ->first();

        if (! $config) {
            return response()->json(['message' => "Belum ada konfigurasi Excel untuk kios {$kiosId}. Simpan konfigurasi terlebih dahulu."], 404);
        }

        try {
            $result = $this->cloudExcel->fetchData($config->excel_url, $config->sheet_name);
            $mapping = $config->column_mapping;

            $imported = 0;
            $failed = 0;

            foreach ($result['rows'] as $row) {
                $mapped = [];
                foreach ($mapping as $headerCol => $fieldKey) {
                    $value = $row[$headerCol] ?? '';
                    $mapped[$fieldKey] = trim((string) $value);
                }

                $name = $mapped['nama'] ?? $mapped['name'] ?? '';
                $phone = $mapped['phone_number'] ?? $mapped['no_whatsapp'] ?? $mapped['no_hp'] ?? '';
                $noContract = $mapped['no_contract'] ?? $mapped['nomor_contract'] ?? '';

                if (blank($name) || blank($phone)) {
                    $failed++;

                    continue;
                }

                $phone = preg_replace('/[^0-9+]/', '', $phone);

                $nmcRefiFlag = null;
                if ($noContract) {
                    $nmcRefiFlag = str_starts_with($noContract, '4020') ? 'NMC' : (str_starts_with($noContract, '4029') ? 'REFI' : null);
                }

                Customer::create([
                    'name' => $name,
                    'no_contract' => $noContract ?: null,
                    'phone_number' => $phone,
                    'uploaded_by' => $user->id,
                    'kios_id' => $kiosId,
                    'assignment_status' => 'unassigned',
                    'dynamic_data' => $mapped,
                    'nmc_refi_flag' => $nmcRefiFlag,
                ]);
                $imported++;
            }

            // Update total_rows in config
            $config->update(['total_rows' => (string) count($result['rows'])]);

            return response()->json([
                'message' => "Import selesai untuk kios {$kiosId}: {$imported} berhasil, {$failed} gagal.",
                'imported' => $imported,
                'failed' => $failed,
                'kios_id' => $kiosId,
            ]);
        } catch (\Exception $e) {
            Log::error('importFromExcel error', ['kios_id' => $kiosId, 'error' => $e->getMessage()]);

            return response()->json(['message' => 'Gagal import: '.$e->getMessage()], 500);
        }
    }

    /**
     * GET /api/single-data/excel-configs
     * List all Excel configs for the AO (grouped by kios).
     */
    public function index(Request $request): JsonResponse
    {
        $configs = ExcelConfig::where('ao_id', $request->user()->id)
            ->with('ao:id,name')
            ->orderBy('kios_id')
            ->get();

        return response()->json(['data' => $configs]);
    }

    /**
     * DELETE /api/single-data/excel-configs/{id}
     */
    public function destroy(int $id, Request $request): JsonResponse
    {
        $config = ExcelConfig::where('id', $id)
            ->where('ao_id', $request->user()->id)
            ->first();

        if (! $config) {
            return response()->json(['message' => 'Config tidak ditemukan'], 404);
        }

        $config->delete();

        return response()->json(['message' => 'Config dihapus.']);
    }
}
