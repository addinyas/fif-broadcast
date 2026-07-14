<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService
    ) {}

    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'nullable|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'gender' => 'required|in:L,P',
            'npo_mce_id' => 'required|string|max:100|unique:users',
            'kios_id' => 'required|string|exists:kios,kios_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $result = $this->authService->register($request->all());

            return response()->json($result, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'npo_mce_id' => 'required_without:email|string',
            'email' => 'required_without:npo_mce_id|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $identifier = $request->input('npo_mce_id') ?? $request->input('email');

        try {
            $result = $this->authService->login(['npo_mce_id' => $identifier, 'password' => $request->password]);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 401);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(array_merge(
            $user->only([
                'id', 'name', 'display_name', 'phone_number', 'email', 'avatar_url', 'role',
                'gender', 'npo_mce_id', 'kios_name', 'kios_id',
            ]),
            ['broadcast_sender_name' => $user->display_name ?? $user->name ?? '']
        ));
    }

    public function updateFcmToken(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $request->user()->update(['fcm_token' => $request->token]);

        return response()->json(['message' => 'FCM token updated']);
    }
}
