<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE broadcast_histories RENAME TO broadcast_histories_old');

        DB::statement("
            CREATE TABLE broadcast_histories (
                id integer primary key autoincrement not null,
                customer_id integer not null,
                marketing_id integer not null,
                exact_message text not null,
                status varchar check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')) not null default 'pending',
                error_log text,
                sent_at datetime,
                created_at datetime,
                updated_at datetime,
                retry_count integer not null default '0',
                foreign key (customer_id) references customers(id),
                foreign key (marketing_id) references users(id)
            )
        ");

        DB::statement('
            INSERT INTO broadcast_histories (id, customer_id, marketing_id, exact_message, status, error_log, sent_at, created_at, updated_at, retry_count)
            SELECT id, customer_id, marketing_id, exact_message, status, error_log, sent_at, created_at, updated_at, retry_count
            FROM broadcast_histories_old
        ');

        DB::statement('DROP TABLE broadcast_histories_old');

        DB::statement('CREATE INDEX IF NOT EXISTS idx_bh_status_marketing ON broadcast_histories(status, marketing_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_bh_status ON broadcast_histories(status)');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE broadcast_histories RENAME TO broadcast_histories_old');

        DB::statement("
            CREATE TABLE broadcast_histories (
                id integer primary key autoincrement not null,
                customer_id integer not null,
                marketing_id integer not null,
                exact_message text not null,
                status varchar check (status in ('pending', 'processing', 'sent', 'failed')) not null default 'pending',
                error_log text,
                sent_at datetime,
                created_at datetime,
                updated_at datetime,
                retry_count integer not null default '0',
                foreign key (customer_id) references customers(id),
                foreign key (marketing_id) references users(id)
            )
        ");

        DB::statement("
            INSERT INTO broadcast_histories (id, customer_id, marketing_id, exact_message, status, error_log, sent_at, created_at, updated_at, retry_count)
            SELECT id, customer_id, marketing_id, exact_message, CASE WHEN status = 'cancelled' THEN 'pending' ELSE status END, error_log, sent_at, created_at, updated_at, retry_count
            FROM broadcast_histories_old
        ");

        DB::statement('DROP TABLE broadcast_histories_old');

        DB::statement('CREATE INDEX IF NOT EXISTS idx_bh_status_marketing ON broadcast_histories(status, marketing_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_bh_status ON broadcast_histories(status)');
    }
};
