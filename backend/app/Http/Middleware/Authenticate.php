<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * API murni (tanpa route 'login') — hindari RouteNotFoundException
     * yang muncul saat redirectTo() memanggil route('login') yang tak ada.
     */
    protected function redirectTo(Request $request): ?string
    {
        return $request->expectsJson() ? null : '/';
    }
}
