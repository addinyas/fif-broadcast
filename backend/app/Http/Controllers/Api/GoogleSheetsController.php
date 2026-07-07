<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GoogleSheetsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GoogleSheetsController extends Controller
{
    public function __construct(
        protected GoogleSheetsService $googleSheetsService
    ) {}

    public function getTenors(Request $request): JsonResponse
    {
        $validator = Validator::make($request->query(), [
            'spreadsheet_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $tenors = $this->googleSheetsService->getTenorOptions($request->query('spreadsheet_id'));

            return response()->json(['data' => $tenors]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
