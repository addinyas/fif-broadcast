<?php

namespace App\Services;

use App\Models\BroadcastSetting;
use Exception;
use Illuminate\Support\Facades\Http;

class AiService
{
    private const DEFAULT_URL = 'http://localhost:11434';

    private const DEFAULT_MODEL = 'qwen2.5:1.5b';

    private function settings(): array
    {
        $map = BroadcastSetting::getAllAsMap();

        return [
            'url' => trim($map['ai_ollama_url'] ?? '') ?: self::DEFAULT_URL,
            'model' => trim($map['ai_ollama_model'] ?? '') ?: self::DEFAULT_MODEL,
            'auto_reply' => ($map['ai_auto_reply_enabled'] ?? '0') === '1',
            'classify' => ($map['ai_classify_enabled'] ?? '0') === '1',
        ];
    }

    public function isConfigured(): bool
    {
        return BroadcastSetting::getValue('ai_ollama_url', '') !== null
            || BroadcastSetting::getValue('ai_ollama_model', '') !== null;
    }

    private function chat(string $system, string $prompt, int $maxTokens = 128): string
    {
        $settings = $this->settings();

        $response = Http::timeout(30)->post(rtrim($settings['url'], '/').'/api/chat', [
            'model' => $settings['model'],
            'stream' => false,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $prompt],
            ],
            'options' => ['temperature' => 0.2, 'num_predict' => $maxTokens],
        ]);

        if (! $response->successful()) {
            throw new Exception('Ollama error '.$response->status().': '.$response->body());
        }

        return trim($response->json('message.content', ''));
    }

    public function testConnection(): array
    {
        $settings = $this->settings();

        try {
            $response = Http::timeout(10)->get(rtrim($settings['url'], '/').'/api/tags');

            return [
                'ok' => $response->successful(),
                'url' => $settings['url'],
                'model' => $settings['model'],
                'models' => $response->successful()
                    ? collect($response->json('models', []))->pluck('name')->values()->all()
                    : [],
            ];
        } catch (Exception $e) {
            return ['ok' => false, 'url' => $settings['url'], 'model' => $settings['model'], 'error' => $e->getMessage()];
        }
    }

    public function classify(string $text): array
    {
        $raw = $this->chat(
            'Kamu adalah asisten penjualan motor kredit (FIF Finance). Klasifikasikan niat pembeli menjadi skor prospect 25, 50, 75, atau 100. Balas HANYA dengan angka, tanpa teks lain.',
            "Pesan customer:\n\"{$text}\""
        );

        preg_match('/\b(25|50|75|100)\b/', $raw, $match);

        return [
            'score' => $match ? (int) $match[1] : null,
            'raw' => $raw,
        ];
    }

    public function suggestReply(string $text, ?string $context = null): string
    {
        $ctx = $context ? "Konteks pelanggan: {$context}\n\n" : '';

        return $this->chat(
            'Kamu adalah marketing finance FIF untuk penjualan motor kredit. Balas pesan customer dalam Bahasa Indonesia yang santun, singkat, persuasif, dan natural layaknya manusia. Jangan pakai emoji berlebihan. Maksimal 3 kalimat.',
            "{$ctx}Pesan customer:\n\"{$text}\"",
            200
        );
    }
}
