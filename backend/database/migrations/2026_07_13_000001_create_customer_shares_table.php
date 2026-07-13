<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_marketing_id')->constrained('users');
            $table->foreignId('to_marketing_id')->constrained('users');
            $table->enum('status', ['pending', 'approved', 'revoked'])->default('pending');
            $table->string('share_type'); // all, pending_only, broadcast_only, split
            $table->unsignedInteger('shared_count');
            $table->foreignId('requested_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['to_marketing_id', 'status']);
            $table->index(['from_marketing_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_shares');
    }
};
