<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Kios;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class KiosController extends Controller
{
    public function index(): JsonResponse
    {
        $kios = Kios::orderBy('kios_id')->get();

        return response()->json(['data' => $kios]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'kios_id' => 'required|string|max:100|unique:kios,kios_id|regex:/^[A-Z0-9_\-]+$/i',
            'kios_name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();
        $validated['kios_id'] = strtoupper(trim($validated['kios_id']));
        $validated['kios_name'] = trim($validated['kios_name']);

        $kios = Kios::create($validated);

        return response()->json(['message' => 'Kios ditambahkan', 'kios' => $kios], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $kios = Kios::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'kios_id' => 'required|string|max:100|unique:kios,kios_id,'.$id.'|regex:/^[A-Z0-9_\-]+$/i',
            'kios_name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();
        $validated['kios_id'] = strtoupper(trim($validated['kios_id']));
        $validated['kios_name'] = trim($validated['kios_name']);

        $kios->update($validated);

        return response()->json(['message' => 'Kios diupdate', 'kios' => $kios]);
    }

    public function destroy(int $id): JsonResponse
    {
        $kios = Kios::findOrFail($id);

        $userCount = User::where('kios_id', $kios->kios_id)->count();
        if ($userCount > 0) {
            return response()->json(['message' => "Tidak bisa menghapus kios — masih ada {$userCount} user di kios ini"], 422);
        }

        $customerCount = Customer::where('kios_id', $kios->kios_id)->count();
        if ($customerCount > 0) {
            return response()->json(['message' => "Tidak bisa menghapus kios — masih ada {$customerCount} customer di kios ini"], 422);
        }

        $kios->delete();

        return response()->json(['message' => 'Kios dihapus']);
    }
}
