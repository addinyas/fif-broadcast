<?php

use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BroadcastController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\GoogleSheetsController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\TemplateController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WhatsappConnectionController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/google/redirect', [AuthController::class, 'googleRedirect']);
Route::post('/auth/google/callback', [AuthController::class, 'googleCallback']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // registered BEFORE any customers/{id} to prevent route collision
    Route::middleware('role:superadmin,UH,marketing')->group(function () {
        Route::middleware('feature:prospect_list')->group(function () {
            Route::get('customers/assigned-to-me', [CustomerController::class, 'assignedToMe']);
        });
    });

    Route::middleware('role:superadmin,UH')->group(function () {
        Route::middleware('feature:customer_management')->group(function () {
            Route::apiResource('customers', CustomerController::class)->except(['show']);
            Route::get('customers/{id}', [CustomerController::class, 'show']);
            Route::post('customers/import', [CustomerController::class, 'import']);
            Route::post('customers/import-file', [CustomerController::class, 'importFile']);
            Route::post('customers/import-spreadsheet', [CustomerController::class, 'importSpreadsheet']);
            Route::delete('customers', [CustomerController::class, 'deleteAll']);
            Route::get('customers/all-ids', [CustomerController::class, 'allIds']);
            Route::post('customers/batch-delete', [CustomerController::class, 'batchDelete']);
            Route::post('assignments/assign', [AssignmentController::class, 'assign']);
            Route::post('assignments/assign-by-unit', [AssignmentController::class, 'assignByUnit']);
            Route::post('assignments/unassign', [AssignmentController::class, 'unassign']);
            Route::get('assignments/distribution', [AssignmentController::class, 'distribution']);
            Route::get('admin/marketing-users', [AssignmentController::class, 'marketingUsers']);
        });

        Route::middleware('feature:template_management')->group(function () {
        });
    });

    Route::middleware('role:superadmin,UH,marketing')->group(function () {
        Route::middleware('feature:broadcast_history')->group(function () {
            Route::get('broadcast/history', [BroadcastController::class, 'history']);
        });
        Route::middleware('feature:broadcast_stats')->group(function () {
            Route::get('broadcast/stats', [BroadcastController::class, 'stats']);
        });
        Route::middleware('feature:customer_management')->group(function () {
            Route::get('customers', [CustomerController::class, 'index']);
            Route::get('customers/{id}', [CustomerController::class, 'show']);
            Route::patch('customers/{id}/cori', [CustomerController::class, 'updateCori']);
            Route::post('customers/marketing-add', [CustomerController::class, 'marketingAdd']);
            Route::get('customers/by-no-contract/{noContract}', [CustomerController::class, 'byNoContract']);
            Route::delete('customers/{id}/manual-entry', [CustomerController::class, 'destroyManual']);
        });
    });

    Route::middleware('role:superadmin,UH,marketing')->group(function () {
        Route::middleware('feature:dashboard')->group(function () {
            Route::get('broadcast/marketing-summary', [BroadcastController::class, 'marketingSummary']);
        });
    });

    Route::middleware('role:superadmin,UH,marketing')->group(function () {
        Route::middleware('feature:broadcast')->group(function () {
            Route::post('broadcast/prepare', [BroadcastController::class, 'prepare']);
        });
    });

    Route::middleware('role:superadmin,UH,marketing')->group(function () {
        Route::middleware('feature:template_management')->group(function () {
            Route::get('templates', [TemplateController::class, 'index']);
            Route::get('templates/{template}', [TemplateController::class, 'show']);
            Route::post('templates', [TemplateController::class, 'store']);
            Route::put('templates/{template}', [TemplateController::class, 'update']);
            Route::delete('templates/{template}', [TemplateController::class, 'destroy']);
        });
    });

    Route::get('google-sheets/tenors', [GoogleSheetsController::class, 'getTenors']);

    Route::get('admin/permissions', [PermissionController::class, 'index']);

    Route::middleware('role:superadmin,UH,marketing')->group(function () {
        Route::prefix('whatsapp')->group(function () {
            Route::get('status', [WhatsappConnectionController::class, 'status']);
            Route::post('disconnect', [WhatsappConnectionController::class, 'disconnect']);
        });
    });

    Route::middleware('role:superadmin')->group(function () {
        Route::get('admin/users', [UserController::class, 'index']);
        Route::patch('admin/users/{id}/role', [UserController::class, 'updateRole']);
        Route::delete('admin/users/{id}', [UserController::class, 'destroy']);
        Route::put('admin/permissions', [PermissionController::class, 'update']);
    });
});
