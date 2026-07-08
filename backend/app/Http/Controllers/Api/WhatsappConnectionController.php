<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsappConnection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsappConnectionController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $conn = WhatsappConnection::where('user_id', $request->user()->id)->first();

        if (! $conn) {
            return response()->json(['status' => 'disconnected', 'qr_code' => null]);
        }

        return response()->json([
            'status' => $conn->status,
            'qr_code' => $conn->qr_code,
        ]);
    }

    public function disconnect(Request $request): JsonResponse
    {
        $conn = WhatsappConnection::where('user_id', $request->user()->id)->first();

        if ($conn) {
            $conn->update(['status' => 'logged_out', 'qr_code' => null]);
        }

        return response()->json(['message' => 'WhatsApp disconnected']);
    }
}
