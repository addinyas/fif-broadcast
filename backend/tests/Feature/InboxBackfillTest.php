<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\User;
use App\Models\WhatsappConnection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InboxBackfillTest extends TestCase
{
    use RefreshDatabase;

    private function fakeWaha(): void
    {
        Http::fake([
            '*/api/user_1/chats?*' => Http::response([
                ['id' => '6281234567890@s.whatsapp.net', 'name' => 'Budi'],
                ['id' => '6289876543210@c.us', 'name' => 'Ani'],
                ['id' => 'group-id@g.us', 'name' => 'Grup Jualan'],
            ]),
            '*/api/user_1/chats/6281234567890%40s.whatsapp.net/messages?*' => Http::response([
                ['id' => 'm1', 'timestamp' => 1710000000, 'fromMe' => false, 'body' => 'Halo'],
                ['id' => 'm2', 'timestamp' => 1710000100, 'fromMe' => true, 'body' => 'Hai juga'],
            ]),
            '*/api/user_1/chats/6289876543210%40c.us/messages?*' => Http::response([
                ['id' => 'm3', 'timestamp' => 1710000200, 'fromMe' => false, 'body' => 'Pesan Ani'],
            ]),
        ]);
    }

    private function connect(User $user): void
    {
        try {
            Schema::table('whatsapp_connections', fn ($table) => $table->dropForeign(['user_id']));
        } catch (\Throwable) {
            // FK may already be absent (pre-existing sqlite rename quirk)
        }
        WhatsappConnection::create(['user_id' => $user->id, 'status' => 'connected']);
    }

    public function test_backfill_imports_chats_and_messages(): void
    {
        $this->fakeWaha();
        $user = User::factory()->create(['role' => 'marketing']);
        $this->connect($user);
        Sanctum::actingAs($user);

        $res = $this->postJson('/api/inbox/backfill');

        $res->assertOk();
        $res->assertJson(['data' => ['chats' => 2, 'messages' => 3]]);
        $this->assertSame(2, Conversation::count());
        $this->assertSame(3, ConversationMessage::count());

        $budy = Conversation::where('remote_jid', '6281234567890@s.whatsapp.net')->first();
        $this->assertSame('Budi', $budy->contact_name);
        $this->assertSame('081234567890', $budy->contact_phone);
        $this->assertTrue((bool) $budy->is_read);
        $this->assertSame('Hai juga', $budy->last_message);

        $out = $budy->messages()->where('wa_message_id', 'm2')->first();
        $this->assertSame('outbound', $out->direction);
        $in = $budy->messages()->where('wa_message_id', 'm1')->first();
        $this->assertSame('inbound', $in->direction);
        $this->assertTrue((bool) $in->is_read);
    }

    public function test_backfill_is_idempotent(): void
    {
        $this->fakeWaha();
        $user = User::factory()->create(['role' => 'marketing']);
        $this->connect($user);
        Sanctum::actingAs($user);

        $this->postJson('/api/inbox/backfill')->assertOk();
        $res = $this->postJson('/api/inbox/backfill');

        $res->assertJson(['data' => ['chats' => 2, 'messages' => 0]]);
        $this->assertSame(2, Conversation::count());
        $this->assertSame(3, ConversationMessage::count());
    }

    public function test_backfill_rejects_disconnected_user(): void
    {
        $user = User::factory()->create(['role' => 'marketing']);
        Sanctum::actingAs($user);

        $this->postJson('/api/inbox/backfill')->assertStatus(422);
    }
}
