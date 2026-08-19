<?php

namespace Tests\Feature;

use App\Models\NumberWarmupProfile;
use App\Models\User;
use App\Services\WarmupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WarmupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_plant_creates_passive_profile_with_zero_limit(): void
    {
        $user = User::factory()->create();

        $profile = app(WarmupService::class)->plant($user->id);

        $this->assertSame('passive', $profile->stage);
        $this->assertSame(0, $profile->daily_outbound_limit);
        $this->assertNotNull($profile->started_at);
        $this->assertSame(0, $profile->messages_sent_today);
    }

    public function test_stage_transitions_by_calendar_age(): void
    {
        $service = app(WarmupService::class);

        $this->assertSame('passive', $service->stageForElapsed(0));
        $this->assertSame('passive', $service->stageForElapsed(2));
        $this->assertSame('active', $service->stageForElapsed(3));
        $this->assertSame('active', $service->stageForElapsed(16));
        $this->assertSame('mature', $service->stageForElapsed(17));
        $this->assertSame('mature', $service->stageForElapsed(60));
    }

    public function test_passive_profile_cannot_send(): void
    {
        $service = app(WarmupService::class);
        $user = User::factory()->create();
        $profile = $service->plant($user->id);

        $result = $service->canSend($profile);

        $this->assertFalse($result['allowed']);
        $this->assertStringContainsString('passive', $result['reason']);
    }

    public function test_active_profile_respects_daily_limit_and_rolls_over(): void
    {
        $service = app(WarmupService::class);
        $user = User::factory()->create();
        $profile = $service->plant($user->id);
        $profile->update(['started_at' => now()->subDays(4)]);

        $this->assertSame('active', $service->refreshStage($profile));
        $this->assertSame(50, $profile->daily_outbound_limit);

        for ($i = 0; $i < 50; $i++) {
            $this->assertTrue($service->canSend($profile)['allowed']);
            $service->recordSend($profile);
        }

        $blocked = $service->canSend($profile);
        $this->assertFalse($blocked['allowed']);
        $this->assertStringContainsString('Batas harian', $blocked['reason']);

        // Ganti tanggal → kuota harian reset otomatis tanpa scheduler
        $profile->update(['counter_date' => now()->subDay()->toDateString()]);

        $this->assertTrue($service->canSend($profile)['allowed']);
        $this->assertSame(0, $profile->fresh()->messages_sent_today);
    }

    public function test_mature_profile_has_full_limit(): void
    {
        $service = app(WarmupService::class);
        $user = User::factory()->create();
        $profile = $service->plant($user->id);
        $profile->update(['started_at' => now()->subDays(30)]);

        $this->assertSame('mature', $service->refreshStage($profile));
        $this->assertSame(100, $profile->daily_outbound_limit);
        $this->assertTrue($service->canSend($profile)['allowed']);
    }

    public function test_auto_pause_flag_blocks_sending(): void
    {
        $service = app(WarmupService::class);
        $user = User::factory()->create();
        $profile = $service->plant($user->id);
        $profile->update(['started_at' => now()->subDays(30)]);
        $profile->update(['flags' => array_merge($profile->flags, ['auto_pause' => true])]);

        $result = $service->canSend($profile->fresh());

        $this->assertFalse($result['allowed']);
        $this->assertStringContainsString('pause', $result['reason']);
    }

    public function test_progress_reports_stage_and_remaining(): void
    {
        $service = app(WarmupService::class);
        $user = User::factory()->create();
        $profile = $service->plant($user->id);
        $profile->update(['started_at' => now()->subDays(10)]);

        $progress = $service->getProgress($profile->fresh());

        $this->assertSame('active', $progress['stage']);
        $this->assertSame(14, $progress['stage_days_total']);
        $this->assertSame(50, $progress['daily_limit']);
        $this->assertSame(50, $progress['remaining_today']);
        $this->assertArrayHasKey('stage_percent', $progress);
    }

    public function test_plant_is_idempotent_for_same_user(): void
    {
        $service = app(WarmupService::class);
        $user = User::factory()->create();
        $first = $service->plant($user->id);
        $second = $service->plant($user->id);

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, NumberWarmupProfile::where('user_id', $user->id)->count());
    }
}
