<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Auto-trim: delete read notifications older than the latest 50
        Notification::where('user_id', $user->id)
            ->whereNotNull('read_at')
            ->where('id', '<', Notification::where('user_id', $user->id)->whereNotNull('read_at')->latest()->skip(50)->value('id') ?? PHP_INT_MAX)
            ->delete();

        // Cap total notifications at 100 — delete oldest if exceeded
        $totalCount = Notification::where('user_id', $user->id)->count();
        if ($totalCount > 100) {
            $oldestToKeep = Notification::where('user_id', $user->id)->latest()->skip(100)->value('id');
            if ($oldestToKeep) {
                Notification::where('user_id', $user->id)->where('id', '<', $oldestToKeep)->delete();
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
        Notification::where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'Semua notifikasi dihapus']);
    }
}
