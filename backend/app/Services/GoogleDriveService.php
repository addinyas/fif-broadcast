<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class GoogleDriveService extends GoogleSheetsService
{
    protected function getDriveAccessToken(): string
    {
        return $this->getAccessToken('https://www.googleapis.com/auth/drive.file');
    }

    public function hasCredentials(): bool
    {
        return Storage::disk('local')->exists('google/credentials.json');
    }

    public function uploadScreenshot(string $pngBase64, string $fileName, ?string $folderId = null): string
    {
        if (! $this->hasCredentials()) {
            throw new Exception('Kredensial Google tidak tersedia (storage/app/google/credentials.json)');
        }

        $pngData = base64_decode(str_replace('data:image/png;base64,', '', $pngBase64));
        if ($pngData === false || $pngData === '') {
            throw new Exception('Data screenshot tidak valid');
        }

        $token = $this->getDriveAccessToken();

        $metadata = ['name' => $fileName, 'mimeType' => 'image/png'];
        if ($folderId) {
            $metadata['parents'] = [$folderId];
        }

        $metadataJson = json_encode($metadata);

        $boundary = 'FIF_BOUNDARY_'.uniqid();
        $body = "--{$boundary}\r\n"
            ."Content-Type: application/json; charset=UTF-8\r\n\r\n"
            .$metadataJson."\r\n"
            ."--{$boundary}\r\n"
            ."Content-Type: image/png\r\n\r\n"
            .$pngData."\r\n"
            ."--{$boundary}--";

        $response = Http::withToken($token)
            ->withHeaders(['Content-Type' => "multipart/related; boundary={$boundary}"])
            ->send('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', [
                'body' => $body,
            ]);

        if (! $response->successful()) {
            throw new Exception('Gagal upload ke Google Drive: '.$response->body());
        }

        $fileId = $response->json('id');

        return "https://drive.google.com/file/d/{$fileId}/view";
    }
}
