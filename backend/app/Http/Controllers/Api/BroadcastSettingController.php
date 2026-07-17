<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BroadcastSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BroadcastSettingController extends Controller
{
    private const SETTING_DEFINITIONS = [
        'messages_per_session' => ['label' => 'Pesan per Sesi', 'type' => 'number', 'min' => 1, 'max' => 200],
        'min_delay_sec' => ['label' => 'Delay Minimum (detik)', 'type' => 'number', 'min' => 1, 'max' => 300],
        'max_delay_sec' => ['label' => 'Delay Maksimum (detik)', 'type' => 'number', 'min' => 1, 'max' => 300],
        'rest_every_x_messages' => ['label' => 'Istirahat Setiap X Pesan', 'type' => 'number', 'min' => 1, 'max' => 100],
        'rest_duration_min_sec' => ['label' => 'Durasi Istirahat Minimum (detik)', 'type' => 'number', 'min' => 5, 'max' => 600],
        'rest_duration_max_sec' => ['label' => 'Durasi Istirahat Maksimum (detik)', 'type' => 'number', 'min' => 5, 'max' => 600],
        'session_break_min_sec' => ['label' => 'Jeda Antar Sesi Minimum (detik)', 'type' => 'number', 'min' => 60, 'max' => 7200],
        'session_break_max_sec' => ['label' => 'Jeda Antar Sesi Maksimum (detik)', 'type' => 'number', 'min' => 60, 'max' => 7200],
        'max_retry' => ['label' => 'Retry Maksimal', 'type' => 'number', 'min' => 0, 'max' => 10],
        'random_template' => ['label' => 'Random Template', 'type' => 'boolean'],
        'random_delay' => ['label' => 'Random Delay', 'type' => 'boolean'],
        'concurrency' => ['label' => 'Concurrency (paralel user)', 'type' => 'number', 'min' => 1, 'max' => 10],
        'queue_enabled' => ['label' => 'Queue Aktif', 'type' => 'boolean'],
    ];

    public function index(): JsonResponse
    {
        $settings = BroadcastSetting::getAllAsMap();
        $result = [];

        foreach (self::SETTING_DEFINITIONS as $key => $def) {
            $result[$key] = [
                'label' => $def['label'],
                'type' => $def['type'],
                'value' => $settings[$key] ?? null,
                'min' => $def['min'] ?? null,
                'max' => $def['max'] ?? null,
            ];
        }

        return response()->json(['data' => $result]);
    }

    public function update(Request $request): JsonResponse
    {
        $rules = [];
        $labels = [];

        foreach (self::SETTING_DEFINITIONS as $key => $def) {
            $labels[$key] = $def['label'];
            if ($def['type'] === 'boolean') {
                $rules[$key] = 'sometimes|boolean';
            } else {
                $rule = 'sometimes|integer';
                if (isset($def['min'])) {
                    $rule .= "|min:{$def['min']}";
                }
                if (isset($def['max'])) {
                    $rule .= "|max:{$def['max']}";
                }
                $rules[$key] = $rule;
            }
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        BroadcastSetting::setMany($validator->validated());

        return response()->json(['message' => 'Pengaturan broadcast berhasil diupdate']);
    }

    public function definitions(): JsonResponse
    {
        return response()->json(['data' => self::SETTING_DEFINITIONS]);
    }
}
