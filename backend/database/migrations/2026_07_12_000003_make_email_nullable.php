<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'email')) {
            return;
        }

        $columnType = DB::getSchemaBuilder()->getColumnType('users', 'email');

        if ($columnType !== 'text') {
            if (DB::getDriverName() === 'sqlite') {
                DB::statement('DROP INDEX IF EXISTS users_email_unique');
                DB::statement('ALTER TABLE users ADD COLUMN email_tmp TEXT NULL');
                DB::statement('UPDATE users SET email_tmp = email');
                DB::statement('ALTER TABLE users DROP COLUMN email');
                DB::statement('ALTER TABLE users RENAME COLUMN email_tmp TO email');
                DB::statement('CREATE UNIQUE INDEX users_email_unique ON users (email)');
            } else {
                DB::statement('ALTER TABLE users ALTER COLUMN email TYPE TEXT');
                DB::statement('ALTER TABLE users ALTER COLUMN email DROP NOT NULL');
                DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique');
                DB::statement('CREATE UNIQUE INDEX users_email_unique ON users (email) WHERE email IS NOT NULL');
            }
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS users_email_unique');
            DB::statement("UPDATE users SET email = '' WHERE email IS NULL");
            DB::statement("ALTER TABLE users ADD COLUMN email_tmp VARCHAR NOT NULL DEFAULT ''");
            DB::statement('UPDATE users SET email_tmp = email');
            DB::statement('ALTER TABLE users DROP COLUMN email');
            DB::statement('ALTER TABLE users RENAME COLUMN email_tmp TO email');
            DB::statement('CREATE UNIQUE INDEX users_email_unique ON users (email)');
        } else {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique');
            DB::statement("UPDATE users SET email = '' WHERE email IS NULL");
            DB::statement('ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255)');
            DB::statement('ALTER TABLE users ALTER COLUMN email SET NOT NULL');
            DB::statement("ALTER TABLE users ALTER COLUMN email SET DEFAULT ''");
            DB::statement('CREATE UNIQUE INDEX users_email_unique ON users (email)');
        }
    }
};
