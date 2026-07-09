<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);

        $users = [
            ['name' => 'Super Admin', 'email' => 'superadmin@crm.test', 'role' => 'superadmin'],
            ['name' => 'Admin User', 'email' => 'admin@crm.test', 'role' => 'UH'],
            ['name' => 'Marketing User', 'email' => 'marketing@crm.test', 'role' => 'marketing'],
            ['name' => 'Marketing User 2', 'email' => 'marketing2@crm.test', 'role' => 'marketing'],
        ];

        foreach ($users as $user) {
            User::firstOrCreate(
                ['email' => $user['email']],
                [...$user, 'password' => Hash::make('password')]
            );
        }
    }
}
