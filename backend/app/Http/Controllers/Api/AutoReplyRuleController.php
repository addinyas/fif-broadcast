<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\AutoReplyRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AutoReplyRuleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AutoReplyRule::query()->orderBy('sort_order')->orderBy('id');

        if ($request->user()->role === 'marketing') {
            $query->where(function ($q) use ($request) {
                $q->whereNull('user_id')->orWhere('user_id', $request->user()->id);
            });
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'trigger' => 'required|string|max:100',
            'match_type' => 'sometimes|in:contains,exact,starts_with',
            'reply_body' => 'required|string|max:4000',
            'enabled' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $data = $validator->validated();
        $data['user_id'] = $user->role === 'marketing' ? $user->id : null;
        $data['enabled'] = $request->boolean('enabled', true);

        $rule = AutoReplyRule::create($data);
        AuditLog::record($request->user()->id, 'rule_create', 'auto_reply_rule', $rule->id, $rule->only(['trigger', 'match_type']), $request->ip());

        return response()->json(['data' => $rule], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $rule = AutoReplyRule::find($id);
        if (! $rule) {
            return response()->json(['message' => 'Aturan tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'trigger' => 'sometimes|string|max:100',
            'match_type' => 'sometimes|in:contains,exact,starts_with',
            'reply_body' => 'sometimes|string|max:4000',
            'enabled' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if (array_key_exists('enabled', $data)) {
            $data['enabled'] = $request->boolean('enabled');
        }
        $rule->update($data);
        AuditLog::record($request->user()->id, 'rule_update', 'auto_reply_rule', $rule->id, $rule->only(['trigger', 'match_type', 'enabled']), $request->ip());

        return response()->json(['data' => $rule]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $rule = AutoReplyRule::find($id);
        if (! $rule) {
            return response()->json(['message' => 'Aturan tidak ditemukan'], 404);
        }

        $rule->delete();
        AuditLog::record($request->user()->id, 'rule_delete', 'auto_reply_rule', $id, null, $request->ip());

        return response()->json(['message' => 'Aturan dihapus']);
    }
}
