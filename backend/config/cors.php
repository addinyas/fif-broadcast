<?php

$webOrigin = env('FRONTEND_URL', env('APP_URL', 'http://localhost'));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    // Capacitor Android/iOS webview origins (APK) — required for the mobile app to reach the API.
    // https://localhost (Android), capacitor://localhost (iOS), http://localhost (dev).
    'allowed_origins' => [
        $webOrigin,
        'https://localhost',
        'capacitor://localhost',
        'http://localhost',
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
