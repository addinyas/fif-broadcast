<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class GoogleSheetsService
{
    protected ?string $accessToken = null;

    protected function hasCredentials(): bool
    {
        return Storage::disk('local')->exists('google/credentials.json');
    }

    protected function getAccessToken(): string
    {
        $credentials = json_decode(Storage::disk('local')->get('google/credentials.json'), true);

        $jwt = $this->createJwtAssertion($credentials);

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        if (! $response->successful()) {
            throw new Exception('Failed to get Google access token: '.$response->body());
        }

        return $response->json()['access_token'];
    }

    protected function createJwtAssertion(array $credentials): string
    {
        $header = self::base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $now = time();
        $payload = self::base64UrlEncode(json_encode([
            'iss' => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/spreadsheets.readonly',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now,
        ]));

        $privateKey = openssl_get_privatekey($credentials['private_key']);
        if (! $privateKey) {
            throw new Exception('Invalid private key in credentials');
        }

        openssl_sign("$header.$payload", $signature, $privateKey, 'sha256WithRSAEncryption');
        openssl_free_key($privateKey);

        return "$header.$payload.".self::base64UrlEncode($signature);
    }

    protected static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    protected function fetchViaApi(string $spreadsheetId, string $range = 'Sheet1!A1:Z'): array
    {
        if (! $this->accessToken) {
            $this->accessToken = $this->getAccessToken();
        }

        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$spreadsheetId}/values/{$range}";
        $response = Http::withToken($this->accessToken)->get($url);

        if (! $response->successful()) {
            throw new Exception('Failed to fetch Google Sheet: '.$response->body());
        }

        return $response->json()['values'] ?? [];
    }

    protected function fetchViaCsv(string $spreadsheetId): array
    {
        $url = "https://docs.google.com/spreadsheets/d/{$spreadsheetId}/export?format=csv";
        $response = Http::get($url);

        if (! $response->successful()) {
            throw new Exception(
                'Gagal mengakses spreadsheet. Pastikan sheet di-share publik (Anyone with link can view). URL harus format: https://docs.google.com/spreadsheets/d/{ID}/edit'
            );
        }

        $lines = explode("\n", trim($response->body()));
        if (empty($lines)) {
            return [];
        }

        return array_map(fn ($line) => str_getcsv($line), $lines);
    }

    /**
     * Get sheet data via Google Sheets API (if credentials exist) or CSV export fallback.
     */
    public function getSheetData(string $spreadsheetId, string $range = 'Sheet1!A1:Z'): array
    {
        if ($this->hasCredentials()) {
            try {
                return $this->fetchViaApi($spreadsheetId, $range);
            } catch (Exception $e) {
                // Fall through to CSV export
            }
        }

        return $this->fetchViaCsv($spreadsheetId);
    }

    /**
     * Parse a Google Spreadsheet URL and return the spreadsheet ID.
     */
    public static function parseSpreadsheetUrl(string $url): string
    {
        preg_match('/\/d\/([a-zA-Z0-9-_]+)/', $url, $matches);
        if (empty($matches[1])) {
            throw new Exception('URL Google Spreadsheet tidak valid. Format yang benar: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit');
        }

        return $matches[1];
    }

    public function getTenorOptions(string $spreadsheetId, string $range = 'Sheet1!A1:B100'): array
    {
        $data = $this->getSheetData($spreadsheetId, $range);
        $options = [];

        foreach ($data as $index => $row) {
            if ($index === 0) {
                continue;
            }
            if (! empty($row[0]) && ! empty($row[1])) {
                $options[] = [
                    'label' => $row[0],
                    'value' => $row[1],
                ];
            }
        }

        return $options;
    }
}
