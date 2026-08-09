<?php

namespace App\Console\Commands;

use App\Services\BroadcastService;
use Illuminate\Console\Command;

class RunScheduledBroadcasts extends Command
{
    protected $signature = 'broadcast:run-scheduled';

    protected $description = 'Enqueue pending broadcast_histories for due broadcast schedules';

    public function handle(BroadcastService $broadcastService): int
    {
        $results = $broadcastService->runScheduledBroadcasts();

        if (empty($results)) {
            $this->info('Tidak ada jadwal broadcast yang jatuh tempo.');

            return self::SUCCESS;
        }

        foreach ($results as $r) {
            $this->info("Schedule #{$r['schedule_id']} (user {$r['user_id']}): {$r['enqueued']} pesan di-antri");
        }

        return self::SUCCESS;
    }
}
