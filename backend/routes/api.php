<?php

use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BroadcastController;
use App\Http\Controllers\Api\BroadcastSettingController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\CustomerShareController;
use App\Http\Controllers\Api\GoogleSheetsController;
use App\Http\Controllers\Api\KiosController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\TemplateController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WhatsappConnectionController;
use Illuminate\Support\Facades\Route;

Route::get('kios', [KiosController::class, 'index']);
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/fcm-token', [AuthController::class, 'updateFcmToken']);

    Route::prefix('profile')->group(function () {
        Route::get('/', [ProfileController::class, 'show']);
        Route::put('/', [ProfileController::class, 'update']);
        Route::put('/password', [ProfileController::class, 'changePassword']);
        Route::post('/avatar', [ProfileController::class, 'uploadAvatar']);
        Route::delete('/avatar', [ProfileController::class, 'deleteAvatar']);
        Route::post('/clear-cache', [ProfileController::class, 'clearCache']);
    });

    // registered before any customers/{id} routes to prevent collision
    Route::get('customers/search-calculator', [CustomerController::class, 'searchCalculator']);

    // registered BEFORE any customers/{id} to prevent route collision
    Route::middleware('role:superadmin,UH,marketing')->group(function () {
        Route::middleware('feature:prospect_list')->group(function () {
            Route::get('customers/assigned-to-me', [CustomerController::class, 'assignedToMe']);
            Route::post('customers/mark-sent/{id}', [CustomerController::class, 'markSent']);
            Route::get('customers/sent-ids', [CustomerController::class, 'sentIds']);
            Route::delete('customers/sent-marks', [CustomerController::class, 'clearSentMarks']);
        });
    });

    Route::middleware('role:superadmin,UH')->group(function () {
        Route::middleware('feature:customer_management')->group(function () {
            Route::apiResource('customers', CustomerController::class)->only(['store', 'update', 'destroy']);
            Route::post('customers/import', [CustomerController::class, 'import']);
            Route::post('customers/import-file', [CustomerController::class, 'importFile']);
            Route::post('customers/import-spreadsheet', [CustomerController::class, 'importSpreadsheet']);
            Route::get('customers/template-download', [CustomerController::class, 'templateDownload']);
            Route::post('customers/delete-all', [CustomerController::class, 'deleteAll']);
            Route::post('customers/delete-my-data', [CustomerController::class, 'deleteMyData']);
            Route::get('customers/all-ids', [CustomerController::class, 'allIds']);
            Route::post('customers/batch-delete', [CustomerController::class, 'batchDelete']);
            Route::post('assignments/assign', [AssignmentController::class, 'assign']);
            Route::post('assignments/assign-by-unit', [AssignmentController::class, 'assignByUnit']);
            Route::post('assignments/unassign', [AssignmentController::class, 'unassign']);
            Route::get('assignments/distribution', [AssignmentController::class, 'distribution']);
            Route::get('assignments/auto-calculate', [AssignmentController::class, 'autoCalculate']);
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
            Route::get('admin/marketing-users', [AssignmentController::class, 'marketingUsers']);
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
            Route::get('broadcast/progress', [BroadcastController::class, 'progress']);
            Route::post('broadcast/cancel', [BroadcastController::class, 'cancel']);
            Route::get('broadcast/worker-status', [BroadcastController::class, 'workerStatus']);
            Route::post('broadcast/cancel-item', [BroadcastController::class, 'cancelItem']);
        });
    });

    Route::middleware('role:superadmin,UH,marketing')->group(function () {
        Route::middleware('feature:data_rolling')->group(function () {
            Route::get('customer-shares/info/{marketingId}', [CustomerShareController::class, 'info']);
            Route::post('customer-shares/request', [CustomerShareController::class, 'requestShare']);
            Route::get('customer-shares/my-shared', [CustomerShareController::class, 'mySharedCustomers']);
        });
    });

    Route::middleware('role:superadmin,UH')->group(function () {
        Route::middleware('feature:data_rolling')->group(function () {
            Route::get('customer-shares/pending', [CustomerShareController::class, 'pendingRequests']);
            Route::post('customer-shares/{id}/approve', [CustomerShareController::class, 'approveShare']);
            Route::post('customer-shares/{id}/revoke', [CustomerShareController::class, 'revokeShare']);
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
        Route::middleware('feature:qr_scanner')->group(function () {
            Route::prefix('whatsapp')->group(function () {
                Route::get('status', [WhatsappConnectionController::class, 'status']);
                Route::post('disconnect', [WhatsappConnectionController::class, 'disconnect']);
            });
        });
    });

    Route::middleware('role:superadmin,UH')->group(function () {
        Route::middleware('feature:user_management')->group(function () {
            Route::get('admin/users', [UserController::class, 'index']);
            Route::patch('admin/users/{id}/role', [UserController::class, 'updateRole']);
            Route::delete('admin/users/{id}', [UserController::class, 'destroy']);
        });
    });

    Route::middleware('role:superadmin')->group(function () {
        Route::put('admin/permissions', [PermissionController::class, 'update']);
        Route::get('admin/whatsapp-status', [UserController::class, 'whatsappStatus']);
        Route::get('admin/broadcast-settings', [BroadcastSettingController::class, 'index']);
        Route::put('admin/broadcast-settings', [BroadcastSettingController::class, 'update']);
        Route::get('admin/broadcast-settings/definitions', [BroadcastSettingController::class, 'definitions']);
        Route::post('admin/kios', [KiosController::class, 'store']);
        Route::put('admin/kios/{id}', [KiosController::class, 'update']);
        Route::delete('admin/kios/{id}', [KiosController::class, 'destroy']);
        Route::put('admin/users/{id}/reset-password', [UserController::class, 'resetPassword']);
        Route::put('admin/users/{id}/kios', [UserController::class, 'updateKios']);
    });

    Route::get('notifications', [NotificationController::class, 'index']);
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('notifications', [NotificationController::class, 'deleteAll']);
});

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
