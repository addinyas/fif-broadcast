<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    public function __construct(
        protected PermissionService $permissionService
    ) {}

    public function index(): JsonResponse
    {
        return response()->json($this->permissionService->getAll());
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'permissions' => 'required|array',
            'permissions.*.id' => 'required|exists:role_permissions,id',
            'permissions.*.enabled' => 'required|boolean',
        ]);

        $this->permissionService->updateBulk($request->permissions);

        return response()->json(['message' => 'Permissions updated']);
    }
}
