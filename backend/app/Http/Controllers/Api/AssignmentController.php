<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Notification;
use App\Models\User;
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

        $user = $request->user();

        // Kios scope: UH/marketing can only assign customers from their kios to marketing from same kios
        if ($user->role !== 'superadmin' && $user->kios_id) {
            $marketing = User::find($request->marketing_id);
            if (! $marketing || $marketing->kios_id !== $user->kios_id) {
                return response()->json(['message' => 'Marketing tidak berada di kios yang sama'], 422);
            }

            $customerKiosMismatch = Customer::whereIn('id', $request->customer_ids)
                ->where('kios_id', '!=', $user->kios_id)
                ->exists();
            if ($customerKiosMismatch) {
                return response()->json(['message' => 'Ada customer yang tidak berada di kios Anda'], 422);
            }
        }

        $results = [];
        foreach ($request->customer_ids as $customerId) {
            try {
                $results[] = $this->customerService->assignToMarketing($customerId, $request->marketing_id);
            } catch (\Exception $e) {
                $results[] = ['customer_id' => $customerId, 'error' => $e->getMessage()];
            }
        }

        $successCount = count(array_filter($results, fn ($r) => ! isset($r['error'])));
        if ($successCount > 0) {
            $assigner = $request->user();
            $marketing = User::find($request->marketing_id);

            Notification::create([
                'user_id' => $request->marketing_id,
                'type' => 'assignment',
                'title' => 'Data baru diassign',
                'message' => "{$assigner->name} mengirim {$successCount} data kepada Anda.",
                'data' => [
                    'assigner_name' => $assigner->name,
                    'count' => $successCount,
                    'customer_ids' => array_map(fn ($r) => $r['customer_id'] ?? null, array_filter($results, fn ($r) => ! isset($r['error']))),
                ],
            ]);

            Notification::create([
                'user_id' => $assigner->id,
                'type' => 'assignment',
                'title' => 'Berhasil assign data',
                'message' => "{$successCount} data berhasil dikirim ke {$marketing->name}.",
                'data' => [
                    'marketing_name' => $marketing->name,
                    'count' => $successCount,
                ],
            ]);
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

        $user = $request->user();

        // Kios scope: non-superadmin can only unassign customers from their kios
        if ($user->role !== 'superadmin' && $user->kios_id) {
            $customerKiosMismatch = Customer::whereIn('id', $request->customer_ids)
                ->where('kios_id', '!=', $user->kios_id)
                ->exists();
            if ($customerKiosMismatch) {
                return response()->json(['message' => 'Ada customer yang tidak berada di kios Anda'], 422);
            }
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

    public function distribution(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json($this->customerService->getDistributionReport($user->role, $user->kios_id));
    }

    public function marketingUsers(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role === 'superadmin') {
            $kiosId = $request->input('kios_id');
        } else {
            $kiosId = $user->kios_id;
        }

        return response()->json($this->authService->getMarketingUsers($kiosId));
    }

    public function assignByUnit(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'marketing_id' => 'required|exists:users,id',
            'nmc_count' => 'required|integer|min:0',
            'refi_count' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $kiosId = $user->role !== 'superadmin' ? $user->kios_id : null;

        // Kios scope: non-superadmin can only assign to marketing from same kios
        if ($kiosId) {
            $marketing = User::find($request->marketing_id);
            if (! $marketing || $marketing->kios_id !== $kiosId) {
                return response()->json(['message' => 'Marketing tidak berada di kios yang sama'], 422);
            }
        }

        $assigned = [];

        foreach (['NMC' => ['nmc_count', '4020%'], 'REFI' => ['refi_count', '4029%']] as $unit => [$countField, $prefix]) {
            $count = (int) $request->$countField;
            if ($count <= 0) {
                continue;
            }

            $query = Customer::where('assignment_status', 'unassigned')
                ->where('no_contract', 'LIKE', $prefix);

            if ($kiosId) {
                $query->where('kios_id', $kiosId);
            }

            Customer::applyOrphanFilter($query, $kiosId);

            $ids = $query->inRandomOrder()
                ->limit($count)
                ->pluck('id')
                ->toArray();

            foreach ($ids as $customerId) {
                try {
                    $this->customerService->assignToMarketing($customerId, $request->marketing_id);
                    $assigned[] = ['customer_id' => $customerId, 'buss_unit' => $unit];
                } catch (\Exception $e) {
                    $assigned[] = ['customer_id' => $customerId, 'error' => $e->getMessage()];
                }
            }
        }

        $successCount = count(array_filter($assigned, fn ($a) => ! isset($a['error'])));
        if ($successCount > 0) {
            $assigner = $request->user();
            $marketing = User::find($request->marketing_id);

            Notification::create([
                'user_id' => $request->marketing_id,
                'type' => 'assignment',
                'title' => 'Data baru diassign',
                'message' => "{$assigner->name} mengirim {$successCount} data kepada Anda.",
                'data' => [
                    'assigner_name' => $assigner->name,
                    'count' => $successCount,
                    'customer_ids' => array_map(fn ($a) => $a['customer_id'] ?? null, array_filter($assigned, fn ($a) => ! isset($a['error']))),
                ],
            ]);

            Notification::create([
                'user_id' => $assigner->id,
                'type' => 'assignment',
                'title' => 'Berhasil assign data',
                'message' => "{$successCount} data berhasil dikirim ke {$marketing->name}.",
                'data' => [
                    'marketing_name' => $marketing->name,
                    'count' => $successCount,
                ],
            ]);
        }

        return response()->json(['assigned' => $assigned, 'total' => count($assigned)]);
    }

    public function autoCalculate(Request $request): JsonResponse
    {
        $user = $request->user();
        $kiosId = $user->role !== 'superadmin' ? $user->kios_id : null;

        $nmcQuery = Customer::where('assignment_status', 'unassigned')
            ->where('no_contract', 'LIKE', '4020%');
        $refiQuery = Customer::where('assignment_status', 'unassigned')
            ->where('no_contract', 'LIKE', '4029%');

        if ($kiosId) {
            $nmcQuery->where('kios_id', $kiosId);
            $refiQuery->where('kios_id', $kiosId);
        }

        Customer::applyOrphanFilter($nmcQuery, $kiosId);
        Customer::applyOrphanFilter($refiQuery, $kiosId);

        $totalNmc = $nmcQuery->count();
        $totalRefi = $refiQuery->count();

        $marketingQuery = User::where('role', 'marketing')
            ->whereDoesntHave('assignedCustomers');

        if ($kiosId) {
            $marketingQuery->where('kios_id', $kiosId);
        }

        $unassignedMarketingCount = $marketingQuery->count();

        $nmcPerMarketing = $unassignedMarketingCount > 0
            ? (int) ceil($totalNmc / $unassignedMarketingCount)
            : 0;
        $refiPerMarketing = $unassignedMarketingCount > 0
            ? (int) ceil($totalRefi / $unassignedMarketingCount)
            : 0;

        return response()->json([
            'total_nmc' => $totalNmc,
            'total_refi' => $totalRefi,
            'unassigned_marketing_count' => $unassignedMarketingCount,
            'nmc_per_marketing' => $nmcPerMarketing,
            'refi_per_marketing' => $refiPerMarketing,
        ]);
    }
}
