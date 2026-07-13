<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerShare;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CustomerShareController extends Controller
{
    public function info(Request $request, int $marketingId): JsonResponse
    {
        $user = $request->user();
        $query = Customer::where('marketing_id', $marketingId)
            ->where('assignment_status', 'assigned');

        // Kios scope: non-superadmin can only see marketing from same kios
        if ($user->role !== 'superadmin' && $user->kios_id) {
            $marketing = User::find($marketingId);
            if (! $marketing || $marketing->kios_id !== $user->kios_id) {
                return response()->json(['message' => 'Marketing tidak ditemukan'], 404);
            }
        }

        $total = (clone $query)->count();
        $broadcastCount = (clone $query)->whereNotNull('manual_sent_at')->count();
        $pendingCount = $total - $broadcastCount;

        return response()->json([
            'total' => $total,
            'broadcast_count' => $broadcastCount,
            'pending_count' => $pendingCount,
        ]);
    }

    public function requestShare(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'from_marketing_id' => 'required|exists:users,id',
            'count' => 'required|integer|min:1',
            'share_type' => 'required|in:all,pending_only,broadcast_only,split',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $fromMarketingId = (int) $request->from_marketing_id;
        $count = (int) $request->count;
        $shareType = $request->share_type;

        if ($fromMarketingId === $user->id) {
            return response()->json(['message' => 'Tidak bisa meminjam data dari diri sendiri'], 422);
        }

        $total = Customer::where('marketing_id', $fromMarketingId)
            ->where('assignment_status', 'assigned')
            ->count();
        $broadcastCount = Customer::where('marketing_id', $fromMarketingId)
            ->where('assignment_status', 'assigned')
            ->whereNotNull('manual_sent_at')
            ->count();
        $pendingCount = $total - $broadcastCount;

        // Validate availability
        if ($shareType === 'pending_only' && $count > $pendingCount) {
            return response()->json(['message' => "Data tidak cukup. Tersedia: {$pendingCount} (belum broadcast)"], 422);
        }
        if ($shareType === 'broadcast_only' && $count > $broadcastCount) {
            return response()->json(['message' => "Data tidak cukup. Tersedia: {$broadcastCount} (sudah broadcast)"], 422);
        }
        if ($shareType === 'split') {
            $pendingNeed = (int) ceil($count / 2);
            $broadcastNeed = (int) floor($count / 2);
            if ($pendingNeed > $pendingCount) {
                return response()->json(['message' => "Data tidak cukup untuk mode split. Belum broadcast: {$pendingCount}, butuh: {$pendingNeed}"], 422);
            }
            if ($broadcastNeed > $broadcastCount) {
                return response()->json(['message' => "Data tidak cukup untuk mode split. Sudah broadcast: {$broadcastCount}, butuh: {$broadcastNeed}"], 422);
            }
        }
        if ($shareType === 'all' && $count > $total) {
            return response()->json(['message' => "Data tidak cukup. Tersedia: {$total}"], 422);
        }

        // Pick customers
        $customerQuery = Customer::where('marketing_id', $fromMarketingId)
            ->where('assignment_status', 'assigned');

        match ($shareType) {
            'pending_only' => $customerQuery->whereNull('manual_sent_at'),
            'broadcast_only' => $customerQuery->whereNotNull('manual_sent_at'),
            default => null,
        };

        $customerIds = $customerQuery->inRandomOrder()->limit($count)->pluck('id')->toArray();

        if (count($customerIds) < $count) {
            return response()->json(['message' => 'Data tidak cukup'], 422);
        }

        // Create share records
        $shares = [];
        foreach ($customerIds as $customerId) {
            $shares[] = CustomerShare::create([
                'customer_id' => $customerId,
                'from_marketing_id' => $fromMarketingId,
                'to_marketing_id' => $user->id,
                'status' => 'pending',
                'share_type' => $shareType,
                'shared_count' => $count,
                'requested_by' => $user->id,
            ]);
        }

        $fromMarketing = User::find($fromMarketingId);
        $this->notifyUhsForShare(
            'Rolling Data',
            "{$user->name} meminta {$count} data dari {$fromMarketing->name}",
            ['requested_by' => $user->id, 'from_marketing_id' => $fromMarketingId]
        );

        Notification::create([
            'user_id' => $fromMarketingId,
            'type' => 'rolling',
            'title' => 'Data Anda Akan Dipinjam',
            'message' => "{$user->name} meminta {$count} data dari Anda. Menunggu approval UH.",
            'data' => ['requested_by' => $user->id, 'count' => $count],
        ]);

        Notification::create([
            'user_id' => $user->id,
            'type' => 'rolling',
            'title' => 'Request Rolling Data Dikirim',
            'message' => "Anda meminta {$count} data dari {$fromMarketing->name}. Menunggu approval UH.",
            'data' => ['from_marketing_id' => $fromMarketingId, 'count' => $count],
        ]);

        return response()->json([
            'message' => 'Request berhasil dikirim. Menunggu approval UH.',
            'total' => count($shares),
        ], 201);
    }

    private function notifyUhsForShare(string $title, string $message, array $data = []): void
    {
        $uhQuery = User::where('role', 'UH');

        // Scope to UH of the relevant kios if available
        if (! empty($data['requested_by'])) {
            $requester = User::find($data['requested_by']);
            if ($requester && $requester->kios_id) {
                $uhQuery->where('kios_id', $requester->kios_id);
            }
        } elseif (! empty($data['from_marketing_id'])) {
            $fromMarketing = User::find($data['from_marketing_id']);
            if ($fromMarketing && $fromMarketing->kios_id) {
                $uhQuery->where('kios_id', $fromMarketing->kios_id);
            }
        }

        $uhUsers = $uhQuery->pluck('id');
        foreach ($uhUsers as $uhId) {
            Notification::create([
                'user_id' => $uhId,
                'type' => 'rolling',
                'title' => $title,
                'message' => $message,
                'data' => $data,
            ]);
        }
    }

    public function pendingRequests(): JsonResponse
    {
        $requests = CustomerShare::with(['customer', 'fromMarketing', 'requestedBy'])
            ->where('status', 'pending')
            ->latest()
            ->get()
            ->groupBy(fn ($s) => $s->requested_by.'_'.$s->from_marketing_id.'_'.$s->created_at->timestamp)
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'id' => $first->id,
                    'from_marketing' => $first->fromMarketing,
                    'requested_by' => $first->requestedBy,
                    'count' => $group->count(),
                    'share_type' => $first->share_type,
                    'created_at' => $first->created_at,
                    'share_ids' => $group->pluck('id')->toArray(),
                ];
            })
            ->values();

        return response()->json($requests);
    }

    public function approveShare(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $firstShare = CustomerShare::where('id', $id)->where('status', 'pending')->first();
        if (! $firstShare) {
            return response()->json(['message' => 'Request tidak ditemukan atau sudah diproses'], 404);
        }

        CustomerShare::where('requested_by', $firstShare->requested_by)
            ->where('from_marketing_id', $firstShare->from_marketing_id)
            ->where('status', 'pending')
            ->update([
                'status' => 'approved',
                'approved_by' => $user->id,
            ]);

        $shareCount = CustomerShare::where('requested_by', $firstShare->requested_by)
            ->where('from_marketing_id', $firstShare->from_marketing_id)
            ->where('status', 'approved')
            ->count();

        Notification::create([
            'user_id' => $firstShare->requested_by,
            'type' => 'rolling',
            'title' => 'Rolling Data Disetujui',
            'message' => "Request {$shareCount} data dari {$firstShare->fromMarketing->name} telah disetujui UH",
            'data' => ['approved_by' => $user->id, 'from_marketing_id' => $firstShare->from_marketing_id],
        ]);

        Notification::create([
            'user_id' => $firstShare->from_marketing_id,
            'type' => 'rolling',
            'title' => 'Data Anda Dipinjam',
            'message' => "{$shareCount} data Anda telah disetujui UH untuk {$firstShare->requestedBy->name}",
            'data' => ['approved_by' => $user->id, 'requested_by' => $firstShare->requested_by],
        ]);

        $this->notifyUhsForShare(
            'Rolling Data Disetujui',
            "{$user->name} menyetujui {$shareCount} data dari {$firstShare->fromMarketing->name} untuk {$firstShare->requestedBy->name}",
            ['approved_by' => $user->id, 'from_marketing_id' => $firstShare->from_marketing_id, 'requested_by' => $firstShare->requested_by]
        );

        return response()->json(['message' => 'Berhasil di-approve']);
    }

    public function revokeShare(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $firstShare = CustomerShare::where('id', $id)->first();
        if (! $firstShare) {
            return response()->json(['message' => 'Request tidak ditemukan'], 404);
        }

        CustomerShare::where('requested_by', $firstShare->requested_by)
            ->where('from_marketing_id', $firstShare->from_marketing_id)
            ->whereIn('status', ['pending', 'approved'])
            ->update(['status' => 'revoked']);

        Notification::create([
            'user_id' => $firstShare->requested_by,
            'type' => 'rolling',
            'title' => 'Rolling Data Ditolak',
            'message' => "Request data dari {$firstShare->fromMarketing->name} ditolak oleh UH",
            'data' => ['from_marketing_id' => $firstShare->from_marketing_id],
        ]);

        Notification::create([
            'user_id' => $firstShare->from_marketing_id,
            'type' => 'rolling',
            'title' => 'Data Anda Tidak Jadi Dipinjam',
            'message' => "Request data dari {$firstShare->requestedBy->name} ditolak oleh UH",
            'data' => ['requested_by' => $firstShare->requested_by],
        ]);

        $this->notifyUhsForShare(
            'Rolling Data Ditolak',
            "{$user->name} menolak request data dari {$firstShare->requestedBy->name} ke {$firstShare->fromMarketing->name}",
            ['requested_by' => $firstShare->requested_by, 'from_marketing_id' => $firstShare->from_marketing_id]
        );

        return response()->json(['message' => 'Berhasil direvoke']);
    }

    public function mySharedCustomers(Request $request): JsonResponse
    {
        $user = $request->user();

        $sharedCustomerIds = CustomerShare::where('to_marketing_id', $user->id)
            ->where('status', 'approved')
            ->pluck('customer_id')
            ->toArray();

        $customers = Customer::with(['marketing', 'broadcast_histories' => function ($q) {
            $q->latest('sent_at')->limit(1);
        }])
            ->whereIn('id', $sharedCustomerIds)
            ->get();

        return response()->json($customers);
    }
}
