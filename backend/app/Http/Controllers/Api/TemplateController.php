<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TemplateController extends Controller
{
    public function __construct(
        protected TemplateService $templateService
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->templateService->getAll($request->user()));
    }

    public function show(int $id): JsonResponse
    {
        try {
            return response()->json($this->templateService->findById($id));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Template not found'], 404);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'message_body' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->all();
        $data['created_by'] = $request->user()->id;

        $template = $this->templateService->create($data);

        return response()->json($template, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'message_body' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $template = $this->templateService->update($id, $request->all());

            return response()->json($template);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Template not found'], 404);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $this->templateService->delete($id);

            return response()->json(['message' => 'Template deleted']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Template not found'], 404);
        }
    }
}
