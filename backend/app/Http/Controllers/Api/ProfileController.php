<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->only([
            'id', 'name', 'email', 'avatar', 'avatar_url', 'role',
            'gender', 'npo_mce_id', 'kios_name', 'kios_id',
        ])]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'gender' => 'sometimes|nullable|in:L,P',
            'npo_mce_id' => [
                'sometimes', 'nullable', 'string', 'max:100', 'min:1',
                Rule::unique('users', 'npo_mce_id')->ignore($user->id),
            ],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only(['name', 'gender', 'npo_mce_id']);
        $data = array_filter($data, fn ($v) => $v !== null && $v !== '');

        if (! empty($data)) {
            $user->update($data);
        }

        return response()->json([
            'message' => 'Profile updated successfully',
            'data' => $user->fresh()->only([
                'id', 'name', 'email', 'avatar', 'avatar_url', 'role',
                'gender', 'npo_mce_id', 'kios_name', 'kios_id',
            ]),
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');

        $user->update(['avatar' => $path]);

        return response()->json([
            'message' => 'Avatar uploaded successfully',
            'avatar_url' => url('storage/'.$path),
        ]);
    }

    public function deleteAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
            $user->update(['avatar' => null]);
        }

        return response()->json(['message' => 'Avatar removed successfully']);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Password lama salah'], 422);
        }

        $user->update(['password' => $request->password]);

        return response()->json(['message' => 'Password berhasil diubah']);
    }

    public function clearCache(Request $request): JsonResponse
    {
        $messages = [];
        $errors = [];

        if (function_exists('exec')) {
            $artisan = base_path('artisan');

            $commands = [
                'cache:clear',
                'config:clear',
                'view:clear',
                'route:clear',
            ];

            foreach ($commands as $cmd) {
                exec("php \"{$artisan}\" {$cmd} 2>&1", $output, $exitCode);
                if ($exitCode === 0) {
                    $messages[] = "{$cmd} berhasil";
                } else {
                    $errors[] = "{$cmd} gagal: ".implode(', ', $output);
                }
            }
        }

        $paths = [
            storage_path('framework/cache/data'),
            storage_path('framework/views'),
        ];

        foreach ($paths as $path) {
            if (is_dir($path)) {
                $this->rmdirRecursive($path);
                $messages[] = basename(dirname($path)).'/'.basename($path).' dibersihkan';
            }
        }

        $logFile = storage_path('logs/laravel.log');
        if (file_exists($logFile)) {
            file_put_contents($logFile, '');
            $messages[] = 'Log file dibersihkan';
        }

        $deletedTokens = DB::table('personal_access_tokens')
            ->where('expires_at', '<', now())
            ->delete();
        if ($deletedTokens > 0) {
            $messages[] = "{$deletedTokens} token expired dihapus";
        }

        $cutoffSession = now()->subDay()->timestamp;
        $deletedSessions = DB::table('sessions')
            ->where('last_activity', '<', $cutoffSession)
            ->delete();
        if ($deletedSessions > 0) {
            $messages[] = "{$deletedSessions} session expired dibersihkan";
        }

        $deletedJobs = DB::table('jobs')
            ->whereNull('reserved_at')
            ->delete();
        if ($deletedJobs > 0) {
            $messages[] = "{$deletedJobs} queue job dibersihkan";
        }

        $cutoffFailed = now()->subDays(30);
        $deletedFailed = DB::table('failed_jobs')
            ->where('failed_at', '<', $cutoffFailed)
            ->delete();
        if ($deletedFailed > 0) {
            $messages[] = "{$deletedFailed} failed job lama dihapus";
        }

        $deletedCache = DB::table('cache')
            ->where('expiration', '<', now()->timestamp)
            ->delete();
        if ($deletedCache > 0) {
            $messages[] = "{$deletedCache} cache entry expired dibersihkan";
        }

        return response()->json([
            'message' => 'Cache berhasil dibersihkan',
            'details' => $messages,
            'errors' => $errors,
        ]);
    }

    private function rmdirRecursive(string $dir): void
    {
        $items = array_diff(scandir($dir), ['.', '..']);
        foreach ($items as $item) {
            $path = $dir.DIRECTORY_SEPARATOR.$item;
            is_dir($path) ? $this->rmdirRecursive($path) : unlink($path);
        }
        rmdir($dir);
    }
}
