<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // SQLite doesn't support ALTER COLUMN, so rebuild the table
            DB::statement('PRAGMA foreign_keys = OFF');

            $users = DB::table('users')->get();

            Schema::dropIfExists('users_backup');
            Schema::rename('users', 'users_backup');

            DB::statement('DROP INDEX IF EXISTS users_email_unique');

            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->nullable()->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->string('google_id')->nullable();
                $table->string('avatar')->nullable();
                $table->string('role')->default('marketing');
                $table->string('gender')->nullable();
                $table->string('npo_mce_id')->nullable();
                $table->string('kios_name')->nullable();
                $table->string('kios_id')->nullable();
                $table->string('fcm_token')->nullable();
                $table->rememberToken();
                $table->timestamps();

                $table->index('npo_mce_id');
                $table->index('kios_id');
            });

            foreach ($users as $user) {
                DB::table('users')->insert((array) $user);
            }

            Schema::dropIfExists('users_backup');
            DB::statement('PRAGMA foreign_keys = ON');
        }
        // PostgreSQL: already handled by 2026_07_12_000003
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');

            $users = DB::table('users')->get();

            Schema::dropIfExists('users_backup');
            Schema::rename('users', 'users_backup');

            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->string('google_id')->nullable();
                $table->string('avatar')->nullable();
                $table->string('role')->default('marketing');
                $table->string('gender')->nullable();
                $table->string('npo_mce_id')->nullable();
                $table->string('kios_name')->nullable();
                $table->string('kios_id')->nullable();
                $table->string('fcm_token')->nullable();
                $table->rememberToken();
                $table->timestamps();

                $table->index('npo_mce_id');
                $table->index('kios_id');
            });

            foreach ($users as $user) {
                DB::table('users')->insert((array) $user);
            }

            Schema::dropIfExists('users_backup');
            DB::statement('PRAGMA foreign_keys = ON');
        }
        // PostgreSQL: already handled by 2026_07_12_000003
    }
};
