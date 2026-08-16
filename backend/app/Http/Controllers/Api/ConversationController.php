<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\WhatsappConnection;
use App\Services\GoogleDriveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

class ConversationController extends Controller
{
    private function authorizeConversation(Request $request, Conversation $conversation): bool
    {
        return $request->user()->role !== 'marketing' || $conversation->user_id === $request->user()->id;
    }

    private function contactPhone(string $remoteJid): ?string
    {
        $bare = explode('@', $remoteJid)[0];
        if (str_starts_with($bare, '62')) {
            return '0'.substr($bare, 2);
        }

        return $bare ?: null;
    }

    public function index(Request $request): JsonResponse
    {
        $query = Conversation::query()->withCount([
            'messages as inbound_count' => fn ($q) => $q->where('direction', 'inbound'),
            'messages as unread_count' => fn ($q) => $q->where('direction', 'inbound')->where('is_read', false),
        ]);

        if ($request->user()->role === 'marketing') {
            $query->where('user_id', $request->user()->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->input('user_id'));
        }

        $conversations = $query
            ->orderByDesc('last_message_at')
            ->limit(200)
            ->get(['id', 'user_id', 'remote_jid', 'contact_name', 'contact_phone', 'last_message', 'last_message_at']);

        return response()->json(['data' => $conversations]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $conversation = Conversation::find($id);
        if (! $conversation || ! $this->authorizeConversation($request, $conversation)) {
            return response()->json(['message' => 'Percakapan tidak ditemukan'], 404);
        }

        $messages = $conversation->messages()
            ->latest('created_at')
            ->limit(200)
            ->get()
            ->reverse()
            ->values();

        $conversation->update(['is_read' => true, 'last_read_at' => now()]);
        ConversationMessage::where('conversation_id', $id)
            ->where('direction', 'inbound')
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'data' => $conversation->only(['id', 'user_id', 'remote_jid', 'contact_name', 'contact_phone', 'drive_url']),
            'messages' => $messages,
        ]);
    }

    public function saveToDrive(Request $request, int $id, GoogleDriveService $drive): JsonResponse
    {
        $conversation = Conversation::find($id);
        if (! $conversation || ! $this->authorizeConversation($request, $conversation)) {
            return response()->json(['message' => 'Percakapan tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'image' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $fileName = 'chat-'.now()->format('Ymd-His').'-'.$conversation->id.'.png';

        try {
            $url = $drive->uploadScreenshot($validator->validated()['image'], $fileName);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $conversation->update(['drive_url' => $url]);

        return response()->json(['data' => ['drive_url' => $url]]);
    }

    public function reply(Request $request, int $id): JsonResponse
    {
        $conversation = Conversation::find($id);
        if (! $conversation || ! $this->authorizeConversation($request, $conversation)) {
            return response()->json(['message' => 'Percakapan tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'body' => 'required|string|max:4000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $message = ConversationMessage::create([
            'conversation_id' => $conversation->id,
            'direction' => 'outbound',
            'body' => $validator->validated()['body'],
            'is_read' => true,
            'status' => 'pending',
        ]);

        return response()->json(['data' => $message], 201);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $query = Conversation::query()->withCount([
            'messages as unread_count' => fn ($q) => $q->where('direction', 'inbound')->where('is_read', false),
        ]);

        if ($request->user()->role === 'marketing') {
            $query->where('user_id', $request->user()->id);
        }

        $total = 0;
        foreach ($query->get() as $c) {
            $total += (int) $c->unread_count;
        }

        return response()->json(['data' => ['unread' => $total]]);
    }

    public function backfill(Request $request): JsonResponse
    {
        $user = $request->user();
        $connected = WhatsappConnection::where('user_id', $user->id)
            ->where('status', 'connected')
            ->exists();

        if (! $connected) {
            return response()->json(['message' => 'WhatsApp belum terhubung'], 422);
        }

        $base = rtrim(config('services.waha.url'), '/');
        $session = "user_{$user->id}";
        $waha = Http::timeout(60)->withHeaders(['X-Api-Key' => config('services.waha.api_key')]);

        try {
            $chats = $waha->get("$base/api/$session/chats", [
                'limit' => 20,
                'sortBy' => 'messageTimestamp',
                'sortOrder' => 'desc',
            ])->json();
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal terhubung ke WAHA'], 502);
        }

        if (! is_array($chats)) {
            return response()->json(['message' => 'Tidak ada riwayat chat'], 200);
        }

        $chatSaved = 0;
        $msgSaved = 0;

        foreach ($chats as $chat) {
            $jid = $chat['id'] ?? null;
            if (! $jid || str_ends_with($jid, '@g.us') || str_ends_with($jid, '@broadcast') || str_ends_with($jid, '@newsletter')) {
                continue;
            }

            try {
                $messages = $waha->get("$base/api/$session/chats/".urlencode($jid).'/messages', [
                    'limit' => 50,
                ])->json();
            } catch (\Exception $e) {
                continue;
            }

            if (! is_array($messages)) {
                continue;
            }

            $conversation = Conversation::firstOrCreate(
                ['user_id' => $user->id, 'remote_jid' => $jid],
                ['contact_name' => $chat['name'] ?? null, 'contact_phone' => $this->contactPhone($jid), 'is_read' => true]
            );
            $chatSaved++;

            $lastAt = $conversation->last_message_at;
            foreach ($messages as $msg) {
                $wid = $msg['id'] ?? null;
                if ($wid && ConversationMessage::where('wa_message_id', $wid)->exists()) {
                    continue;
                }

                $body = $msg['body'] ?? $msg['text'] ?? $msg['caption'] ?? null;
                if (! $body) {
                    continue;
                }

                $at = isset($msg['timestamp']) ? date('Y-m-d H:i:s', (int) $msg['timestamp']) : now();
                ConversationMessage::create([
                    'conversation_id' => $conversation->id,
                    'direction' => ($msg['fromMe'] ?? false) ? 'outbound' : 'inbound',
                    'body' => $body,
                    'wa_message_id' => $wid,
                    'is_read' => true,
                    'status' => 'sent',
                    'created_at' => $at,
                ]);
                $msgSaved++;

                if (! $lastAt || $at > $lastAt) {
                    $lastAt = $at;
                    $conversation->update(['last_message' => $body, 'last_message_at' => $at, 'is_read' => true]);
                }
            }
        }

        return response()->json(['data' => ['chats' => $chatSaved, 'messages' => $msgSaved]]);
    }
}
