<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            KiosSeeder::class,
            TemplateSeeder::class,
        ]);

        $users = [
            ['name' => 'Super Admin', 'display_name' => 'Admin FIF', 'email' => 'superadmin@crm.test', 'npo_mce_id' => 'NPOSUPERADMIN', 'role' => 'superadmin'],
            ['name' => 'Admin User', 'display_name' => null, 'email' => 'admin@crm.test', 'npo_mce_id' => 'NPO002', 'kios_id' => '40200', 'kios_name' => 'CRE', 'role' => 'UH'],
            ['name' => 'Marketing User', 'display_name' => null, 'email' => 'marketing@crm.test', 'npo_mce_id' => 'NPO003', 'kios_id' => '40200', 'kios_name' => 'CRE', 'role' => 'marketing'],
            ['name' => 'Marketing User 2', 'display_name' => null, 'email' => 'marketing2@crm.test', 'npo_mce_id' => 'NPO004', 'kios_id' => '40207', 'kios_name' => 'POS WATES', 'role' => 'marketing'],
        ];

        foreach ($users as $user) {
            User::firstOrCreate(
                ['email' => $user['email']],
                [...$user, 'password' => Hash::make('08996789')]
            );
        }
    }
}
