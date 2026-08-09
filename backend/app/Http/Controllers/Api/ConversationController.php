<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Services\GoogleDriveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ConversationController extends Controller
{
    private function authorizeConversation(Request $request, Conversation $conversation): bool
    {
        return $request->user()->role !== 'marketing' || $conversation->user_id === $request->user()->id;
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
}
