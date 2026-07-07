<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@crm.test',
            'password' => Hash::make('password'),
            'role' => 'superadmin',
        ]);

        User::create([
            'name' => 'Admin User',
            'email' => 'admin@crm.test',
            'password' => Hash::make('password'),
            'role' => 'UH',
        ]);

        User::create([
            'name' => 'Marketing User',
            'email' => 'marketing@crm.test',
            'password' => Hash::make('password'),
            'role' => 'marketing',
        ]);

        User::create([
            'name' => 'Marketing User 2',
            'email' => 'marketing2@crm.test',
            'password' => Hash::make('password'),
            'role' => 'marketing',
        ]);
    }
}
