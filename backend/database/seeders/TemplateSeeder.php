<?php

namespace Database\Seeders;

use App\Models\Template;
use App\Models\User;
use Illuminate\Database\Seeder;

class TemplateSeeder extends Seeder
{
    public function run(): void
    {
        $superadmin = User::where('role', 'superadmin')->first();
        if (! $superadmin) {
            return;
        }

        Template::firstOrCreate(
            ['title' => 'Default Broadcast'],
            [
                'message_body' => "Halo #nama,\n\nSaya #namapanggilanakun dari FIF. Saat ini sisa angsuran Anda adalah Rp #sisa_angsuran.\n\nMohon segera lakukan pembayaran untuk menghindari denda.\n\nTerima kasih.",
                'is_default' => true,
                'created_by' => $superadmin->id,
            ]
        );
    }
}
