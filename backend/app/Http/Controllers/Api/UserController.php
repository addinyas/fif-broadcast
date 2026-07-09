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
            ->with('whatsappConnection:user_id,status')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'created_at' => $user->created_at,
                'whatsapp_connection' => $user->whatsappConnection?->status ?? 'disconnected',
            ]);

        return response()->json(['data' => $users]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->role === 'superadmin') {
            return response()->json(['message' => 'Tidak bisa menghapus superadmin'], 403);
        }

        if ($request->user()->role === 'UH' && $user->role === 'UH') {
            return response()->json(['message' => 'UH tidak bisa menghapus sesama UH'], 403);
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
            $uploadedIds = DB::table('customers')->where('uploaded_by', $user->id)->pluck('id');
            if ($uploadedIds->isNotEmpty()) {
                BroadcastHistory::whereIn('customer_id', $uploadedIds)->delete();
            }

            // Hapus customer yang diupload user ini
            Customer::where('uploaded_by', $user->id)->delete();

            // Hapus referensi manual_sent_by di customer
            Customer::where('manual_sent_by', $user->id)->update(['manual_sent_by' => null]);

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

        if ($request->user()->role === 'UH' && $user->role === 'UH') {
            return response()->json(['message' => 'UH tidak bisa mengubah role sesama UH'], 403);
        }

        $user->update(['role' => $request->role]);

        return response()->json(['message' => 'Role updated successfully', 'user' => $user]);
    }
}
