<?php

namespace App\Services;

use App\Models\ExcelConfig;
use Illuminate\Support\Facades\Log;

class CloudExcelService
{
    private GoogleSheetsService $googleSheets;

    private MicrosoftGraphService $microsoftGraph;

    public function __construct()
    {
        $this->googleSheets = new GoogleSheetsService;
        $this->microsoftGraph = MicrosoftGraphService::fromConfig();
    }

    /**
     * Auto-detect platform from URL and fetch data.
     *
     * @return array{platform: string, headers: string[], rows: array<int, array<string, mixed>>}
     */
    public function fetchData(string $url, ?string $sheetName = null): array
    {
        $platform = ExcelConfig::detectPlatform($url);

        if ($platform === 'google_sheets') {
            return $this->fetchGoogleSheets($url, $sheetName);
        }

        if ($platform === 'excel_online') {
            return $this->fetchExcelOnline($url, $sheetName);
        }

        throw new \InvalidArgumentException('URL tidak dikenali. Gunakan link Google Sheets atau Excel Online (OneDrive).');
    }

    private function fetchGoogleSheets(string $url, ?string $sheetName): array
    {
        $spreadsheetId = ExcelConfig::extractGoogleSheetsId($url);
        if (! $spreadsheetId) {
            throw new \InvalidArgumentException('ID spreadsheet tidak ditemukan dari URL.');
        }

        $allRows = $this->googleSheets->getSheetData($spreadsheetId, $sheetName);
        if (empty($allRows)) {
            throw new \RuntimeException('Data spreadsheet kosong atau tidak bisa diakses.');
        }

        $headers = array_map(fn ($h) => trim((string) $h), $allRows[0]);
        $rows = [];
        for ($i = 1; $i < count($allRows); $i++) {
            $rows[] = array_combine($headers, $allRows[$i]);
        }

        return [
            'platform' => 'google_sheets',
            'headers' => $headers,
            'rows' => $rows,
        ];
    }

    private function fetchExcelOnline(string $url, ?string $sheetName): array
    {
        if (! $this->microsoftGraph->isConfigured()) {
            throw new \RuntimeException('Microsoft Graph API belum dikonfigurasi. Hubungi admin.');
        }

        $fileId = ExcelConfig::extractOneDriveFileId($url);
        if (! $fileId) {
            throw new \InvalidArgumentException('File ID tidak ditemukan dari URL OneDrive.');
        }

        $tabs = $this->microsoftGraph->listSheets($fileId);
        $targetSheet = $sheetName ?? ($tabs[0]['name'] ?? 'Sheet1');

        $allRows = $this->microsoftGraph->readExcelFile($fileId, $targetSheet);
        if (empty($allRows)) {
            throw new \RuntimeException('Data Excel kosong atau tidak bisa diakses.');
        }

        $headers = array_map(fn ($h) => trim((string) $h), $allRows[0]);
        $rows = [];
        for ($i = 1; $i < count($allRows); $i++) {
            $rowData = $allRows[$i];
            $rows[] = array_combine($headers, array_pad($rowData, count($headers), ''));
        }

        return [
            'platform' => 'excel_online',
            'headers' => $headers,
            'rows' => $rows,
        ];
    }

    /**
     * Write status update back to the Excel file.
     */
    public function writeStatus(ExcelConfig $config, int $rowNumber, string $statusColumn, string $timeColumn, string $status, string $time): bool
    {
        try {
            if ($config->platform === 'google_sheets') {
                $spreadsheetId = $config->spreadsheet_id ?? ExcelConfig::extractGoogleSheetsId($config->excel_url);
                if (! $spreadsheetId) {
                    return false;
                }
                $service = new GoogleSheetsService;
                $sheetName = $config->sheet_name ?? 'Sheet1';
                $range = "{$sheetName}!{$statusColumn}{$rowNumber}";
                $service->writeCell($spreadsheetId, $range, [[$status]]);

                $timeRange = "{$sheetName}!{$timeColumn}{$rowNumber}";
                $service->writeCell($spreadsheetId, $timeRange, [[$time]]);

                return true;
            }

            if ($config->platform === 'excel_online') {
                $fileId = $config->spreadsheet_id ?? ExcelConfig::extractOneDriveFileId($config->excel_url);
                $sheetName = $config->sheet_name ?? 'Sheet1';

                $this->microsoftGraph->writeCell($fileId, $sheetName, "{$statusColumn}{$rowNumber}", $status);
                $this->microsoftGraph->writeCell($fileId, $sheetName, "{$timeColumn}{$rowNumber}", $time);

                return true;
            }
        } catch (\Exception $e) {
            Log::error('CloudExcel writeStatus failed', [
                'config_id' => $config->id,
                'error' => $e->getMessage(),
            ]);
        }

        return false;
    }

    /**
     * List available sheets/tabs for a given URL.
     */
    public function listSheets(string $url): array
    {
        $platform = ExcelConfig::detectPlatform($url);

        if ($platform === 'google_sheets') {
            $spreadsheetId = ExcelConfig::extractGoogleSheetsId($url);
            if (! $spreadsheetId) {
                return [];
            }

            return $this->googleSheets->getSheetNames($spreadsheetId);
        }

        if ($platform === 'excel_online' && $this->microsoftGraph->isConfigured()) {
            $fileId = ExcelConfig::extractOneDriveFileId($url);

            return $fileId ? $this->microsoftGraph->listSheets($fileId) : [];
        }

        return [];
    }
}
