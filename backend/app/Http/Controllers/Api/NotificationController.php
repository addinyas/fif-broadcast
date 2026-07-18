<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerShare;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Collect share_groups that have active (pending or approved) shares
        $activeShareGroups = CustomerShare::whereIn('status', ['pending', 'approved'])
            ->selectRaw('requested_by || \'_\' || from_marketing_id as share_group')
            ->pluck('share_group')
            ->toArray();
        $activeGroupSet = array_flip($activeShareGroups);

        // Auto-trim: delete read notifications older than the latest 50, skip active rolling + recent (<1 week)
        $cutoffId = Notification::where('user_id', $user->id)
            ->whereNotNull('read_at')
            ->latest()->skip(50)->value('id') ?? PHP_INT_MAX;

        Notification::where('user_id', $user->id)
            ->whereNotNull('read_at')
            ->where('id', '<', $cutoffId)
            ->where('created_at', '<', Carbon::now()->subWeek())
            ->where(function ($q) use ($activeGroupSet) {
                if (empty($activeGroupSet)) {
                    return;
                }
                $q->where('type', '!=', 'rolling')
                    ->orWhere(function ($q2) use ($activeGroupSet) {
                        $q2->where('type', 'rolling')
                            ->where(function ($q3) use ($activeGroupSet) {
                                $q3->whereNull('data->share_group')
                                    ->orWhereRaw("json_extract(data, '$.share_group') NOT IN ('".implode("','", array_keys($activeGroupSet))."')");
                            });
                    });
            })
            ->delete();

        // Cap total notifications at 100 — delete oldest if exceeded, skip active rolling + recent (<1 week)
        $totalCount = Notification::where('user_id', $user->id)->count();
        if ($totalCount > 100) {
            $oldestToKeep = Notification::where('user_id', $user->id)->latest()->skip(100)->value('id');
            if ($oldestToKeep) {
                Notification::where('user_id', $user->id)
                    ->where('id', '<', $oldestToKeep)
                    ->where('created_at', '<', Carbon::now()->subWeek())
                    ->where(function ($q) use ($activeGroupSet) {
                        if (empty($activeGroupSet)) {
                            return;
                        }
                        $q->where('type', '!=', 'rolling')
                            ->orWhere(function ($q2) use ($activeGroupSet) {
                                $q2->where('type', 'rolling')
                                    ->where(function ($q3) use ($activeGroupSet) {
                                        $q3->whereNull('data->share_group')
                                            ->orWhereRaw("json_extract(data, '$.share_group') NOT IN ('".implode("','", array_keys($activeGroupSet))."')");
                                    });
                            });
                    })
                    ->delete();
            }
        }

        $notifications = Notification::where('user_id', $user->id)
            ->latest()
            ->limit(50)
            ->get();

        $unreadCount = Notification::where('user_id', $user->id)
            ->unread()
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $notification = Notification::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json(['message' => 'Ditandai sudah dibaca']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Semua notifikasi ditandai sudah dibaca']);
    }

    public function deleteAll(Request $request): JsonResponse
    {
        $user = $request->user();

        // Collect active rolling share_groups (pending or approved)
        $activeShareGroups = CustomerShare::whereIn('status', ['pending', 'approved'])
            ->selectRaw('requested_by || \'_\' || from_marketing_id as share_group')
            ->pluck('share_group')
            ->toArray();
        $activeGroupSet = array_flip($activeShareGroups);

        // Only delete notifications older than 1 week, skip active rolling
        Notification::where('user_id', $user->id)
            ->where('created_at', '<', Carbon::now()->subWeek())
            ->where(function ($q) use ($activeGroupSet) {
                if (empty($activeGroupSet)) {
                    return;
                }
                $q->where('type', '!=', 'rolling')
                    ->orWhere(function ($q2) use ($activeGroupSet) {
                        $q2->where('type', 'rolling')
                            ->where(function ($q3) use ($activeGroupSet) {
                                $q3->whereNull('data->share_group')
                                    ->orWhereRaw("json_extract(data, '$.share_group') NOT IN ('".implode("','", array_keys($activeGroupSet))."')");
                            });
                    });
            })
            ->delete();

        return response()->json(['message' => 'Notifikasi lama dihapus']);
    }
}
