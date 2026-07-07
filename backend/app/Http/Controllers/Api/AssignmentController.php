<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use App\Services\CustomerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AssignmentController extends Controller
{
    public function __construct(
        protected CustomerService $customerService,
        protected AuthService $authService
    ) {}

    public function assign(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'customer_ids' => 'required|array',
            'customer_ids.*' => 'exists:customers,id',
            'marketing_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $results = [];
        foreach ($request->customer_ids as $customerId) {
            try {
                $results[] = $this->customerService->assignToMarketing($customerId, $request->marketing_id);
            } catch (\Exception $e) {
                $results[] = ['customer_id' => $customerId, 'error' => $e->getMessage()];
            }
        }

        return response()->json(['data' => $results]);
    }

    public function unassign(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'customer_ids' => 'required|array',
            'customer_ids.*' => 'exists:customers,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $results = [];
        foreach ($request->customer_ids as $customerId) {
            try {
                $results[] = $this->customerService->unassign($customerId);
            } catch (\Exception $e) {
                $results[] = ['customer_id' => $customerId, 'error' => $e->getMessage()];
            }
        }

        return response()->json(['data' => $results]);
    }

    public function distribution(): JsonResponse
    {
        return response()->json($this->customerService->getDistributionReport());
    }

    public function marketingUsers(): JsonResponse
    {
        return response()->json($this->authService->getMarketingUsers());
    }
}
