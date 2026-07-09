<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $features = [
            'dashboard', 'customer_management', 'template_management',
            'user_management', 'prospect_list', 'broadcast',
            'broadcast_history', 'qr_scanner', 'broadcast_stats',
        ];

        $roles = ['UH', 'marketing'];

        foreach ($roles as $role) {
            foreach ($features as $feature) {
                $defaultEnabled = match ($feature) {
                    'user_management' => false,
                    default => true,
                };
                DB::table('role_permissions')->insertOrIgnore([
                    'role' => $role,
                    'feature' => $feature,
                    'enabled' => $defaultEnabled,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
