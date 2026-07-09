<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
        $marketingId = in_array($request->user()->role, ['superadmin', 'UH'], true)
            ? null
            : $request->user()->id;

        return response()->json(
            $this->broadcastService->getHistory($marketingId, $filters)
        );
    }

    public function stats(Request $request): JsonResponse
    {
        $marketingId = in_array($request->user()->role, ['superadmin', 'UH'], true)
            ? null
            : $request->user()->id;

        return response()->json(
            $this->broadcastService->getStats($marketingId)
        );
    }

    public function marketingSummary(Request $request): JsonResponse
    {
        $marketingId = in_array($request->user()->role, ['superadmin', 'UH'], true)
            ? null
            : $request->user()->id;

        return response()->json(
            $this->broadcastService->marketingSummary($marketingId)
        );
    }
}
