<?php

namespace App\Http\Middleware;

use App\Models\RolePermission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckFeature
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if ($user->role === 'superadmin') {
            return $next($request);
        }

        $perm = RolePermission::where('role', $user->role)
            ->where('feature', $feature)
            ->first();

        if (! $perm || ! $perm->enabled) {
            return response()->json([
                'message' => "Feature '{$feature}' is not enabled for your role.",
            ], 403);
        }

        return $next($request);
    }
}
