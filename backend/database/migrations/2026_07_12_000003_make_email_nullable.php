<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'email') && ! DB::getSchemaBuilder()->getColumnType('users', 'email') === 'TEXT') {
            DB::statement('DROP INDEX IF EXISTS users_email_unique');
            DB::statement('ALTER TABLE users ADD COLUMN email_tmp TEXT NULL');
            DB::statement('UPDATE users SET email_tmp = email');
            DB::statement('ALTER TABLE users DROP COLUMN email');
            DB::statement('ALTER TABLE users RENAME COLUMN email_tmp TO email');
            DB::statement('CREATE UNIQUE INDEX users_email_unique ON users (email)');
        }
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS users_email_unique');
        DB::statement("UPDATE users SET email = '' WHERE email IS NULL");
        DB::statement("ALTER TABLE users ADD COLUMN email_tmp VARCHAR NOT NULL DEFAULT ''");
        DB::statement('UPDATE users SET email_tmp = email');
        DB::statement('ALTER TABLE users DROP COLUMN email');
        DB::statement('ALTER TABLE users RENAME COLUMN email_tmp TO email');
        DB::statement('CREATE UNIQUE INDEX users_email_unique ON users (email)');
    }
};
