<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_sent_marks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->unique(['customer_id', 'user_id']);
            $table->index('user_id');
        });

        // Migrate existing data from customers.manual_sent_by + manual_sent_at
        $existing = DB::table('customers')
            ->whereNotNull('manual_sent_by')
            ->whereNotNull('manual_sent_at')
            ->select('id', 'manual_sent_by', 'manual_sent_at')
            ->get();

        foreach ($existing as $row) {
            DB::table('customer_sent_marks')->insert([
                'customer_id' => $row->id,
                'user_id' => $row->manual_sent_by,
                'sent_at' => $row->manual_sent_at,
                'created_at' => $row->manual_sent_at,
                'updated_at' => $row->manual_sent_at,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_sent_marks');
    }
};
