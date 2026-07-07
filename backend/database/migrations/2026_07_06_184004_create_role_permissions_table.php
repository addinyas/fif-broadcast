<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role');
            $table->string('feature');
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->unique(['role', 'feature']);
        });

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
                DB::table('role_permissions')->insert([
                    'role' => $role,
                    'feature' => $feature,
                    'enabled' => $defaultEnabled,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }
};
