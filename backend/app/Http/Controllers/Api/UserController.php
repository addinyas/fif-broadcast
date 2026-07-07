<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BroadcastHistory;
use App\Models\Customer;
use App\Models\Template;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::select('id', 'name', 'email', 'role', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $users]);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->role === 'superadmin') {
            return response()->json(['message' => 'Tidak bisa menghapus superadmin'], 403);
        }

        DB::transaction(function () use ($user) {
            // Hapus personal access tokens (Sanctum) milik user
            $user->tokens()->delete();

            // Hapus broadcast histories milik user ini
            BroadcastHistory::where('marketing_id', $user->id)->delete();

            // Unassign customers yang ditugaskan ke user ini
            Customer::where('marketing_id', $user->id)
                ->update(['marketing_id' => null, 'assignment_status' => 'unassigned']);

            // Hapus template buatan user ini
            Template::where('created_by', $user->id)->delete();

            // Hapus broadcast histories dari customer yang diupload user ini
            // (include soft-deleted customers karena model pakai SoftDeletes)
            $uploadedIds = DB::table('customers')->where('uploaded_by', $user->id)->pluck('id');
            BroadcastHistory::whereIn('customer_id', $uploadedIds)->delete();

            // Hapus customer yang diupload user ini (hard delete, karena model pakai SoftDeletes)
            DB::table('customers')->where('uploaded_by', $user->id)->delete();

            // Hapus user
            $user->delete();
        });

        return response()->json(['message' => 'User dan seluruh data terkait berhasil dihapus']);
    }

    public function updateRole(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'role' => 'required|in:UH,marketing',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::findOrFail($id);

        if ($user->role === 'superadmin') {
            return response()->json(['message' => 'Cannot change role of a superadmin'], 403);
        }

        $user->update(['role' => $request->role]);

        return response()->json(['message' => 'Role updated successfully', 'user' => $user]);
    }
}
