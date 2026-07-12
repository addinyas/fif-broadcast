<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kios;
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
            'kios_id' => 'required|string|max:100|unique:kios,kios_id',
            'kios_name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $kios = Kios::create($validator->validated());

        return response()->json(['message' => 'Kios ditambahkan', 'kios' => $kios], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $kios = Kios::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'kios_id' => 'required|string|max:100|unique:kios,kios_id,'.$id,
            'kios_name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $kios->update($validator->validated());

        return response()->json(['message' => 'Kios diupdate', 'kios' => $kios]);
    }

    public function destroy(int $id): JsonResponse
    {
        $kios = Kios::findOrFail($id);
        $kios->delete();

        return response()->json(['message' => 'Kios dihapus']);
    }
}
