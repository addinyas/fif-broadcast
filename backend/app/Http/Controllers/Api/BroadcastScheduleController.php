<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BroadcastSchedule;
use App\Models\BroadcastSetting;
use App\Models\Template;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BroadcastScheduleController extends Controller
{
    private const NOTIF_SETTINGS = [
        'notif_disconnect_enabled' => ['label' => 'Notif saat WA terputus', 'type' => 'boolean'],
        'notif_disconnect_level' => ['label' => 'Level notif disconnect', 'type' => 'string'],
    ];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = BroadcastSchedule::query();

        if ($user->role === 'marketing') {
            $query->where('user_id', $user->id);
        }

        $schedules = $query->with('user:id,name,kios_name')->orderBy('schedule_time')->get();

        return response()->json(['data' => $schedules]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'schedule_time' => 'required|date_format:H:i',
            'days_active' => 'required|array|min:1',
            'days_active.*' => 'in:Mon,Tue,Wed,Thu,Fri,Sat,Sun',
            'template_ids' => 'required|array|size:3',
            'template_ids.*' => 'integer|distinct',
            'active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();
        $templateIds = $this->resolveTemplateIds($request->user(), $validated['template_ids']);

        $user = $request->user();
        if ($user->role === 'marketing') {
            $userId = $user->id;
        } else {
            $userId = $request->input('user_id', $user->id);
        }

        $schedule = BroadcastSchedule::create([
            'user_id' => $userId,
            'schedule_time' => $validated['schedule_time'].':00',
            'days_active' => $validated['days_active'],
            'template_ids' => $templateIds,
            'active' => $request->boolean('active', true),
        ]);

        AuditLog::record($request->user()->id, 'schedule_create', 'broadcast_schedule', $schedule->id, $schedule->only(['schedule_time', 'days_active', 'template_ids']), $request->ip());

        return response()->json(['data' => $schedule], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $schedule = BroadcastSchedule::find($id);
        if (! $schedule) {
            return response()->json(['message' => 'Jadwal tidak ditemukan'], 404);
        }

        $user = $request->user();
        if ($user->role === 'marketing' && $schedule->user_id !== $user->id) {
            return response()->json(['message' => 'Jadwal tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'schedule_time' => 'sometimes|date_format:H:i',
            'days_active' => 'sometimes|array|min:1',
            'days_active.*' => 'in:Mon,Tue,Wed,Thu,Fri,Sat,Sun',
            'template_ids' => 'sometimes|array|size:3',
            'template_ids.*' => 'integer|distinct',
            'active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if (isset($data['schedule_time'])) {
            $data['schedule_time'] .= ':00';
        }
        if (isset($data['template_ids'])) {
            $data['template_ids'] = $this->resolveTemplateIds($request->user(), $data['template_ids']);
        }

        $schedule->update($data);
        AuditLog::record($request->user()->id, 'schedule_update', 'broadcast_schedule', $schedule->id, $schedule->only(['schedule_time', 'days_active', 'active']), $request->ip());

        return response()->json(['data' => $schedule]);
    }

    private function resolveTemplateIds($user, array $ids): array
    {
        $query = Template::whereIn('id', $ids);
        if ($user->role === 'marketing') {
            $query->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)->orWhere('is_default', true);
            });
        }

        $found = $query->pluck('id')->all();
        if (count($found) !== 3) {
            abort(422, 'Pilih 3 template yang valid (template default atau milik Anda).');
        }

        return $found;
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $schedule = BroadcastSchedule::find($id);
        if (! $schedule) {
            return response()->json(['message' => 'Jadwal tidak ditemukan'], 404);
        }

        $user = $request->user();
        if ($user->role === 'marketing' && $schedule->user_id !== $user->id) {
            return response()->json(['message' => 'Jadwal tidak ditemukan'], 404);
        }

        $schedule->delete();
        AuditLog::record($request->user()->id, 'schedule_delete', 'broadcast_schedule', $id, null, $request->ip());

        return response()->json(['message' => 'Jadwal dihapus']);
    }

    public function notifSettings(): JsonResponse
    {
        $settings = BroadcastSetting::getAllAsMap();
        $result = [];

        foreach (self::NOTIF_SETTINGS as $key => $def) {
            $result[$key] = [
                'label' => $def['label'],
                'type' => $def['type'],
                'value' => $settings[$key] ?? null,
            ];
        }

        return response()->json(['data' => $result]);
    }

    public function updateNotifSettings(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'notif_disconnect_enabled' => 'sometimes|boolean',
            'notif_disconnect_level' => 'sometimes|in:total,all',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if (array_key_exists('notif_disconnect_enabled', $data)) {
            $data['notif_disconnect_enabled'] = $data['notif_disconnect_enabled'] ? '1' : '0';
        }
        BroadcastSetting::setMany($data);
        AuditLog::record($request->user()->id, 'setting_update', 'notif_setting', null, $data, $request->ip());

        return response()->json(['message' => 'Pengaturan notifikasi diupdate']);
    }
}
