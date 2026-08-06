<?php

namespace App\Services;

use App\Models\NumberWarmupProfile;

class WarmupService
{
    /**
     * Stage => [durasi dalam hari (null = permanen), batas outbound harian].
     * Heuristik dari docs/nomor-warming-anti-ban.md; angka bisa di-tuning.
     * ponytail: tidak pakai repository terpisah — satu-satunya konsumen service ini.
     */
    private const STAGES = [
        'passive' => ['days' => 3, 'daily_limit' => 0],
        'active' => ['days' => 14, 'daily_limit' => 50],
        'mature' => ['days' => null, 'daily_limit' => 150],
    ];

    /** Tanam nomor baru: mulai dari passive, broadcast terkunci sampai warm-up selesai. */
    public function plant(int $userId): NumberWarmupProfile
    {
        return NumberWarmupProfile::updateOrCreate(
            ['user_id' => $userId],
            [
                'stage' => 'passive',
                'started_at' => now(),
                'stage_started_at' => now(),
                'daily_outbound_limit' => self::STAGES['passive']['daily_limit'],
                'messages_sent_today' => 0,
                'counter_date' => now()->toDateString(),
                'last_send_at' => null,
                'consecutive_active_days' => 0,
                'health' => ['reply_rate' => 0, 'report_count' => 0, 'block_count' => 0],
                'flags' => ['allow_broadcast' => true, 'auto_pause' => false],
            ]
        );
    }

    /** Stage saat ini berdasarkan umur nomor (kalender, bukan hari aktif). */
    public function stageForElapsed(int $elapsedDays): string
    {
        $passive = self::STAGES['passive']['days'];
        $active = self::STAGES['active']['days'];

        if ($elapsedDays < $passive) {
            return 'passive';
        }
        if ($elapsedDays < $passive + $active) {
            return 'active';
        }

        return 'mature';
    }

    /** Sinkronkan stage tersimpan dengan umur nomor; mengembalikan stage efektif. */
    public function refreshStage(NumberWarmupProfile $profile): string
    {
        $elapsed = $profile->started_at ? (int) $profile->started_at->startOfDay()->diffInDays(now()->startOfDay()) : 0;
        $target = $this->stageForElapsed($elapsed);

        if ($target !== $profile->stage) {
            $profile->update([
                'stage' => $target,
                'stage_started_at' => now(),
                'daily_outbound_limit' => self::STAGES[$target]['daily_limit'],
            ]);
        }

        return $target;
    }

    /** Gate kirim: dipakai worker sebelum mengirim pesan outbound. */
    public function canSend(NumberWarmupProfile $profile): array
    {
        $stage = $this->refreshStage($profile);
        $this->resetDailyIfNeeded($profile);
        $profile->refresh();

        if (! ($profile->flags['allow_broadcast'] ?? true)) {
            return ['allowed' => false, 'reason' => 'Broadcast dimatikan manual (kill switch).'];
        }
        if ($profile->flags['auto_pause'] ?? false) {
            return ['allowed' => false, 'reason' => 'Nomor di-pause otomatis karena kesehatan menurun.'];
        }
        if ($stage === 'passive') {
            return ['allowed' => false, 'reason' => 'Stage passive: hanya balas pesan masuk, belum boleh kirim.'];
        }
        if ($profile->messages_sent_today >= $profile->daily_outbound_limit) {
            return ['allowed' => false, 'reason' => "Batas harian warm-up tercapai ({$profile->daily_outbound_limit} pesan)."];
        }

        return ['allowed' => true, 'reason' => ''];
    }

    /** Tandai satu pesan outbound terkirim (dipanggil worker setelah sukses). */
    public function recordSend(NumberWarmupProfile $profile): void
    {
        $this->resetDailyIfNeeded($profile);
        $lastDay = $profile->last_send_at ? $profile->last_send_at->startOfDay() : null;

        $profile->increment('messages_sent_today');
        if ($profile->stage !== 'passive'
            && ($lastDay === null || $lastDay->lt(now()->startOfDay()))) {
            $profile->increment('consecutive_active_days');
        }
        $profile->update(['last_send_at' => now()]);
    }

    /** Ringkasan progress untuk UI. */
    public function getProgress(NumberWarmupProfile $profile): array
    {
        $stage = $this->refreshStage($profile);
        $this->resetDailyIfNeeded($profile);
        $profile->refresh();

        $stageInfo = self::STAGES[$stage];
        $stageElapsed = $profile->stage_started_at ? (int) $profile->stage_started_at->startOfDay()->diffInDays(now()->startOfDay()) : 0;

        return [
            'stage' => $stage,
            'stage_days_total' => $stageInfo['days'],
            'stage_days_elapsed' => $stageElapsed,
            'stage_percent' => $stageInfo['days'] ? min(100, (int) round($stageElapsed / $stageInfo['days'] * 100)) : 100,
            'days_total' => $profile->started_at ? (int) $profile->started_at->startOfDay()->diffInDays(now()->startOfDay()) : 0,
            'daily_limit' => $profile->daily_outbound_limit,
            'messages_sent_today' => $profile->messages_sent_today,
            'remaining_today' => max(0, $profile->daily_outbound_limit - $profile->messages_sent_today),
            'last_send_at' => $profile->last_send_at?->toIso8601String(),
            'allow_broadcast' => (bool) ($profile->flags['allow_broadcast'] ?? true),
            'auto_pause' => (bool) ($profile->flags['auto_pause'] ?? false),
            'health' => $profile->health,
        ];
    }

    /** Reset kuota harian saat ganti tanggal (tanpa perlu scheduler). */
    private function resetDailyIfNeeded(NumberWarmupProfile $profile): void
    {
        if ($profile->counter_date?->toDateString() !== now()->toDateString()) {
            $profile->update([
                'messages_sent_today' => 0,
                'counter_date' => now()->toDateString(),
            ]);
        }
    }
}
