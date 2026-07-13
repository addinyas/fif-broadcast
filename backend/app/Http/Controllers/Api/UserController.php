<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BroadcastHistory;
use App\Models\Customer;
use App\Models\CustomerShare;
use App\Models\Kios;
use App\Models\Template;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $lastBroadcast = BroadcastHistory::select('marketing_id', DB::raw('MAX(sent_at) as last_broadcast_at'))
            ->where('status', 'sent')
            ->groupBy('marketing_id');

        $users = User::select('id', 'name', 'email', 'role', 'kios_id', 'kios_name', 'npo_mce_id', 'created_at')
            ->when(
                $request->user()->role !== 'superadmin',
                function ($q) use ($request) {
                    $q->where('role', '!=', 'superadmin')
                        ->where('kios_id', $request->user()->kios_id);
                }
            )
            ->when(
                $request->user()->role === 'superadmin' && $request->has('kios_id'),
                fn ($q) => $q->where('kios_id', $request->input('kios_id'))
            )
            ->with('whatsappConnection:user_id,status,updated_at')
            ->leftJoinSub($lastBroadcast, 'lb', fn ($j) => $j->on('users.id', '=', 'lb.marketing_id'))
            ->addSelect('lb.last_broadcast_at')
            ->orderBy('kios_id', 'asc')
            ->orderBy('role', 'asc')
            ->orderBy('name', 'asc')
            ->get()
            ->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'kios_id' => $user->kios_id,
                'kios_name' => $user->kios_name,
                'npo_mce_id' => $user->npo_mce_id,
                'created_at' => $user->created_at,
                'whatsapp_connection' => $user->whatsappConnection?->status ?? 'disconnected',
                'last_connected_at' => $user->whatsappConnection?->updated_at,
                'last_broadcast_at' => $user->last_broadcast_at,
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

        if ($request->user()->role === 'UH' && $user->kios_id !== $request->user()->kios_id) {
            return response()->json(['message' => 'Tidak bisa menghapus user dari kios lain'], 403);
        }

        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            BroadcastHistory::where('marketing_id', $user->id)->delete();
            Customer::where('marketing_id', $user->id)
                ->update(['marketing_id' => null, 'assignment_status' => 'unassigned']);
            Template::where('created_by', $user->id)->delete();

            $uploadedIds = DB::table('customers')->where('uploaded_by', $user->id)->pluck('id');
            if ($uploadedIds->isNotEmpty()) {
                BroadcastHistory::whereIn('customer_id', $uploadedIds)->delete();
            }

            CustomerShare::where(function ($q) use ($user) {
                $q->where('from_marketing_id', $user->id)
                  ->orWhere('to_marketing_id', $user->id)
                  ->orWhere('requested_by', $user->id)
                  ->orWhere('approved_by', $user->id);
            })->delete();

            Customer::where('uploaded_by', $user->id)->forceDelete();
            Customer::where('manual_sent_by', $user->id)->update(['manual_sent_by' => null]);
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

        if ($request->user()->role === 'UH' && $user->kios_id !== $request->user()->kios_id) {
            return response()->json(['message' => 'Tidak bisa mengubah role user dari kios lain'], 403);
        }

        $user->update(['role' => $request->role]);

        return response()->json(['message' => 'Role updated successfully', 'user' => $user]);
    }

    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::findOrFail($id);
        $user->update(['password' => $request->password]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Password berhasil direset. User harus login ulang.']);
    }

    public function updateKios(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'kios_id' => 'required|string|exists:kios,kios_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::findOrFail($id);

        if ($user->role === 'superadmin') {
            return response()->json(['message' => 'Tidak bisa mengubah kios superadmin'], 403);
        }

        $kios = Kios::where('kios_id', $request->kios_id)->first();

        $user->update([
            'kios_id' => $kios->kios_id,
            'kios_name' => $kios->kios_name,
        ]);

        return response()->json(['message' => 'Kios berhasil diupdate', 'user' => $user]);
    }
}
