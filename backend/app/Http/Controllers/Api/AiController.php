<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AiController extends Controller
{
    public function test(AiService $ai): JsonResponse
    {
        return response()->json(['data' => $ai->testConnection()]);
    }

    public function classify(Request $request, AiService $ai): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'text' => 'required|string|max:4000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            return response()->json(['data' => $ai->classify($validator->validated()['text'])]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }

    public function suggestReply(Request $request, AiService $ai): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'text' => 'required|string|max:4000',
            'context' => 'nullable|string|max:4000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            return response()->json([
                'data' => $ai->suggestReply(
                    $validator->validated()['text'],
                    $validator->validated()['context'] ?? null
                ),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }
}
