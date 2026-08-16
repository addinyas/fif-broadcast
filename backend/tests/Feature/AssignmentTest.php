<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // ponytail: sqlite migrations leave broken FK -> users_backup; drop them like InboxBackfillTest.
        // customer_shares must be cleaned first: DROP TABLE customers re-parses tables referencing it.
        Schema::table('customer_shares', function ($table) {
            foreach (['from_marketing_id', 'to_marketing_id', 'requested_by', 'approved_by'] as $col) {
                $table->dropForeign([$col]);
            }
        });
        Schema::table('notifications', function ($table) {
            $table->dropForeign(['user_id']);
        });
        Schema::table('customers', function ($table) {
            foreach (['uploaded_by', 'marketing_id', 'manual_sent_by'] as $col) {
                $table->dropForeign([$col]);
            }
        });
    }

    private function uh(string $kios = '40272'): User
    {
        RolePermission::create(['role' => 'UH', 'feature' => 'customer_management', 'enabled' => true]);
        return User::factory()->create(['role' => 'UH', 'kios_id' => $kios]);
    }

    private function marketing(string $kios = '40272'): User
    {
        return User::factory()->create(['role' => 'marketing', 'kios_id' => $kios]);
    }

    private function customer(User $uploader, string $noContract, string $status = 'unassigned', ?int $marketingId = null): Customer
    {
        return Customer::create([
            'name' => 'Konsumen Test',
            'phone_number' => '081234567890',
            'uploaded_by' => $uploader->id,
            'kios_id' => $uploader->kios_id,
            'uh_id' => $uploader->id,
            'no_contract' => $noContract,
            'marketing_id' => $marketingId,
            'assignment_status' => $status,
            'dynamic_data' => [],
        ]);
    }

    public function test_cannot_assign_customer_twice(): void
    {
        $uh = $this->uh();
        $m1 = $this->marketing();
        $m2 = $this->marketing();
        $customer = $this->customer($uh, '4020100001');
        Sanctum::actingAs($uh);

        $this->postJson('/api/assignments/assign', [
            'customer_ids' => [$customer->id],
            'marketing_id' => $m1->id,
        ])->assertOk();

        $second = $this->postJson('/api/assignments/assign', [
            'customer_ids' => [$customer->id],
            'marketing_id' => $m2->id,
        ])->assertOk();

        $this->assertTrue(collect($second->json('data'))
            ->contains(fn ($r) => isset($r['error']) && str_contains($r['error'], 'sudah diassign')));

        $customer->refresh();
        $this->assertSame($m1->id, $customer->marketing_id);
        $this->assertSame('assigned', $customer->assignment_status);
    }

    public function test_auto_calculate_splits_pool_across_all_marketing(): void
    {
        $uh = $this->uh();
        $m1 = $this->marketing();
        $m2 = $this->marketing();

        // Kedua marketing sudah punya data -> sebelumnya auto-calc jadi 0 dan assign terkunci
        $this->customer($uh, '4020100001', 'assigned', $m1->id);
        $this->customer($uh, '4029100001', 'assigned', $m2->id);

        // 2 NMC + 2 REFI unassigned
        $this->customer($uh, '4020100002');
        $this->customer($uh, '4020100003');
        $this->customer($uh, '4029100002');
        $this->customer($uh, '4029100003');

        Sanctum::actingAs($uh);

        $this->getJson('/api/assignments/auto-calculate')
            ->assertOk()
            ->assertJson([
                'total_nmc' => 2,
                'total_refi' => 2,
                'marketing_count' => 2,
                'nmc_per_marketing' => 1,
                'refi_per_marketing' => 1,
            ]);
    }
}
