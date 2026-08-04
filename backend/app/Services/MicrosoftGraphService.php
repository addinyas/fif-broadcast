<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MicrosoftGraphService
{
    private const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

    public function __construct(
        private readonly string $tenantId,
        private readonly string $clientId,
        private readonly string $clientSecret,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            tenantId: config('services.microsoft.tenant_id', ''),
            clientId: config('services.microsoft.client_id', ''),
            clientSecret: config('services.microsoft.client_secret', ''),
        );
    }

    public function isConfigured(): bool
    {
        return filled($this->tenantId) && filled($this->clientId) && filled($this->clientSecret);
    }

    public function getAccessToken(): ?string
    {
        if (! $this->isConfigured()) {
            return null;
        }

        try {
            $response = Http::asForm()->post("https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/token", [
                'grant_type' => 'client_credentials',
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'scope' => 'https://graph.microsoft.com/.default',
            ]);

            if ($response->successful()) {
                return $response->json('access_token');
            }

            Log::error('Microsoft Graph token error', $response->json());

            return null;
        } catch (\Exception $e) {
            Log::error('Microsoft Graph token exception', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Read all rows from an Excel file on OneDrive/SharePoint.
     *
     * @param  string  $fileId  The OneDrive item ID or SharePoint drive item ID
     * @param  string  $sheetName  The sheet/tab name (default: "Sheet1")
     * @return array<int, array<string, mixed>> Array of rows (each row is array of cell values)
     */
    public function readExcelFile(string $fileId, string $sheetName = 'Sheet1'): array
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return [];
        }

        try {
            $response = Http::withToken($token)
                ->get(self::GRAPH_BASE."/me/drive/items/{$fileId}/workbook/worksheets/{$sheetName}/usedRange/values");

            if ($response->successful()) {
                $values = $response->json('values', []);

                return $values;
            }

            Log::error('Microsoft Graph read error', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return [];
        } catch (\Exception $e) {
            Log::error('Microsoft Graph read exception', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Read all sheets/tabs in an Excel file.
     *
     * @return array<int, array{id: string, name: string}>
     */
    public function listSheets(string $fileId): array
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return [];
        }

        try {
            $response = Http::withToken($token)
                ->get(self::GRAPH_BASE."/me/drive/items/{$fileId}/workbook/worksheets");

            if ($response->successful()) {
                return collect($response->json('value', []))->map(fn ($sheet) => [
                    'id' => $sheet['id'] ?? '',
                    'name' => $sheet['name'] ?? '',
                ])->toArray();
            }

            return [];
        } catch (\Exception $e) {
            Log::error('Microsoft Graph listSheets exception', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Write a single cell value in an Excel file.
     */
    public function writeCell(string $fileId, string $sheetName, string $cell, mixed $value): bool
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return false;
        }

        try {
            $response = Http::withToken($token)
                ->patch(self::GRAPH_BASE."/me/drive/items/{$fileId}/workbook/worksheets/{$sheetName}/range(address='{$cell}')")
                ->withBody([
                    'values' => [[$value]],
                ], 'application/json');

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Microsoft Graph writeCell exception', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Write a row of values starting at a given cell.
     */
    public function writeRow(string $fileId, string $sheetName, string $startCell, array $values): bool
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return false;
        }

        try {
            $response = Http::withToken($token)
                ->patch(self::GRAPH_BASE."/me/drive/items/{$fileId}/workbook/worksheets/{$sheetName}/range(address='{$startCell}')")
                ->withBody([
                    'values' => [$values],
                ], 'application/json');

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Microsoft Graph writeRow exception', ['error' => $e->getMessage()]);

            return false;
        }
    }
}
