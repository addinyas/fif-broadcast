<?php

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$user = User::where('email', 'admin@fif.co.id')->first();
if ($user) {
    echo 'ID: '.$user->id.' Name: '.$user->name.' Role: '.$user->role."\n";
} else {
    echo "Not found\n";
}
