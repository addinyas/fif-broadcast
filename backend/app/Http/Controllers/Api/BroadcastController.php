<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\BroadcastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BroadcastController extends Controller
{
    public function __construct(
        protected BroadcastService $broadcastService
    ) {}

    public function prepare(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|exists:customers,id',
            'template_body' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            if ($user->role !== 'superadmin') {
                $customer = Customer::find($request->customer_id);
                if (! $customer) {
                    return response()->json(['message' => 'Customer tidak ditemukan'], 404);
                }
                if ($user->kios_id && $customer->kios_id !== $user->kios_id) {
                    return response()->json(['message' => 'Customer tidak ditemukan'], 404);
                }
                if ($user->role === 'marketing' && $customer->marketing_id !== $user->id) {
                    return response()->json(['message' => 'Customer tidak ditemukan'], 404);
                }
            }

            $result = $this->broadcastService->prepare(
                $request->customer_id,
                $request->user()->id,
                $request->template_body,
                $request->form_values ?? []
            );

            return response()->json($result, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function history(Request $request): JsonResponse
    {
        $filters = $request->only(['status', 'per_page']);
        $user = $request->user();

        $kiosId = null;
        $marketingId = null;

        if ($user->role === 'marketing') {
            $marketingId = $user->id;
            $kiosId = $user->kios_id;
        } elseif ($user->role === 'UH') {
            $kiosId = $user->kios_id;
            if ($request->query('marketing_id') && $request->query('marketing_id') !== 'all') {
                $marketingId = (int) $request->query('marketing_id');
            }
        } else {
            if ($request->query('kios_id')) {
                $kiosId = $request->query('kios_id');
            }
            if ($request->query('marketing_id')) {
                $marketingId = (int) $request->query('marketing_id');
            }
        }

        return response()->json(
            $this->broadcastService->getHistory($marketingId, $filters, $kiosId)
        );
    }

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        $kiosId = null;
        $marketingId = null;

        if ($user->role === 'marketing') {
            $marketingId = $user->id;
            $kiosId = $user->kios_id;
        } elseif ($user->role === 'UH') {
            $kiosId = $user->kios_id;
            if ($request->query('marketing_id') && $request->query('marketing_id') !== 'all') {
                $marketingId = (int) $request->query('marketing_id');
            }
        } else {
            if ($request->query('kios_id')) {
                $kiosId = $request->query('kios_id');
            }
            if ($request->query('marketing_id')) {
                $marketingId = (int) $request->query('marketing_id');
            }
        }

        return response()->json(
            $this->broadcastService->getStats($marketingId, $kiosId)
        );
    }

    public function marketingSummary(Request $request): JsonResponse
    {
        $user = $request->user();
        $marketingId = $user->role === 'marketing' ? $user->id : null;
        $kiosId = $user->role !== 'superadmin' ? $user->kios_id : null;

        return response()->json(
            $this->broadcastService->marketingSummary($marketingId, $kiosId)
        );
    }

    public function dailyStats(Request $request): JsonResponse
    {
        $user = $request->user();
        $kiosId = $user->role !== 'superadmin' ? $user->kios_id : ($request->query('kios_id') ?: null);
        $marketingId = $user->role === 'marketing' ? $user->id : null;

        return response()->json(
            $this->broadcastService->getDailyStats($kiosId, $marketingId)
        );
    }

    public function progress(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(
            $this->broadcastService->getProgress($user)
        );
    }

    public function cancel(Request $request): JsonResponse
    {
        $user = $request->user();

        try {
            $result = $this->broadcastService->cancelPending($user);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function workerStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(
            $this->broadcastService->getWorkerStatus($user)
        );
    }

    public function cancelItem(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'id' => 'required|exists:broadcast_histories,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $ok = $this->broadcastService->cancelItem((int) $request->id, $user);

        if (! $ok) {
            return response()->json(['message' => 'Item tidak ditemukan atau sudah diproses'], 404);
        }

        return response()->json(['message' => 'Berhasil dibatalkan']);
    }
}
