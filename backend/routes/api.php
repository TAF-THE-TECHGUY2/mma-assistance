<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\CaseController;
use App\Http\Controllers\Api\InpatientDetailController;
use App\Http\Controllers\Api\OutpatientDetailController;
use App\Http\Controllers\Api\LaboratoryDetailController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\AdminReviewController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\RegisterController;

/*
|--------------------------------------------------------------------------
| API Routes — Meridian Medical Assistance (MMA)
|--------------------------------------------------------------------------
| All routes are prefixed with /api (configured in bootstrap/app.php).
| Responses are JSON. Authentication uses Laravel Sanctum bearer tokens.
|
| Role hierarchy / permissions:
|   booking    -> create patients, create cases
|   operations -> update operational fields, manage cases, move workflow stage
|   billing    -> update billing fields
|   admin      -> review cases, approve, return to operations, close cases
|   owner      -> full access (superset of all)
|
| The 'role:...' middleware accepts a comma separated list; 'owner' is
| accepted on every protected mutation as it is a superset of all roles.
*/

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login'])->name('login');

/*
|--------------------------------------------------------------------------
| Protected routes (auth:sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    /*
    |----------------------------------------------------------------------
    | Auth / session
    |----------------------------------------------------------------------
    */
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/me', [AuthController::class, 'me'])->name('me');
    Route::put('/me', [AuthController::class, 'updateMe'])->name('me.update');

    /*
    |----------------------------------------------------------------------
    | Patients
    |----------------------------------------------------------------------
    | Read: any authenticated user.
    | Create: booking (or owner).
    | Update: operations (or owner).
    | Delete: admin (or owner).
    */
    Route::get('/patients', [PatientController::class, 'index'])->name('patients.index');
    Route::get('/patients/{patient}', [PatientController::class, 'show'])->name('patients.show');
    Route::get('/patients/{patient}/cases', [PatientController::class, 'cases'])->name('patients.cases');
    Route::get('/patients/{patient}/documents', [PatientController::class, 'documents'])->name('patients.documents');

    Route::post('/patients', [PatientController::class, 'store'])
        ->middleware('role:booking,owner')
        ->name('patients.store');

    Route::put('/patients/{patient}', [PatientController::class, 'update'])
        ->middleware('role:operations,admin,owner')
        ->name('patients.update');

    Route::delete('/patients/{patient}', [PatientController::class, 'destroy'])
        ->middleware('role:admin,owner')
        ->name('patients.destroy');

    /*
    |----------------------------------------------------------------------
    | Cases
    |----------------------------------------------------------------------
    | Read: any authenticated user.
    | Create: booking (or owner).
    | Update / delete: operations / admin (or owner).
    */
    Route::get('/cases', [CaseController::class, 'index'])->name('cases.index');
    Route::get('/upcoming-cases', [CaseController::class, 'upcoming'])->name('cases.upcoming');
    Route::get('/cases/{case}', [CaseController::class, 'show'])->name('cases.show');

    Route::post('/cases', [CaseController::class, 'store'])
        ->middleware('role:booking,owner')
        ->name('cases.store');

    Route::put('/cases/{case}', [CaseController::class, 'update'])
        ->middleware('role:operations,admin,owner')
        ->name('cases.update');

    Route::delete('/cases/{case}', [CaseController::class, 'destroy'])
        ->middleware('role:admin,owner')
        ->name('cases.destroy');

    /*
    |----------------------------------------------------------------------
    | Case workflow transitions
    |----------------------------------------------------------------------
    | Each transition updates case_status + workflow_stage and writes an
    | audit_log + notification (handled inside the controller).
    */
    Route::post('/cases/{case}/send-to-operations', [CaseController::class, 'sendToOperations'])
        ->middleware('role:operations,admin,owner')
        ->name('cases.send-to-operations');

    Route::post('/cases/{case}/send-to-admin-review', [CaseController::class, 'sendToAdminReview'])
        ->middleware('role:operations,admin,owner')
        ->name('cases.send-to-admin-review');

    Route::post('/cases/{case}/send-to-billing', [CaseController::class, 'sendToBilling'])
        ->middleware('role:operations,admin,billing,owner')
        ->name('cases.send-to-billing');

    Route::post('/cases/{case}/close', [CaseController::class, 'close'])
        ->middleware('role:admin,owner')
        ->name('cases.close');

    Route::post('/cases/{case}/cancel', [CaseController::class, 'cancel'])
        ->middleware('role:booking,operations,admin,owner')
        ->name('cases.cancel');

    /*
    |----------------------------------------------------------------------
    | Case type detail records
    |----------------------------------------------------------------------
    | Read: any authenticated user.
    | Update: operations (or owner).
    */
    Route::get('/cases/{case}/inpatient', [InpatientDetailController::class, 'show'])->name('cases.inpatient.show');
    Route::put('/cases/{case}/inpatient', [InpatientDetailController::class, 'update'])
        ->middleware('role:operations,admin,owner')
        ->name('cases.inpatient.update');

    Route::get('/cases/{case}/outpatient', [OutpatientDetailController::class, 'show'])->name('cases.outpatient.show');
    Route::put('/cases/{case}/outpatient', [OutpatientDetailController::class, 'update'])
        ->middleware('role:operations,admin,owner')
        ->name('cases.outpatient.update');

    Route::get('/cases/{case}/laboratory', [LaboratoryDetailController::class, 'show'])->name('cases.laboratory.show');
    Route::put('/cases/{case}/laboratory', [LaboratoryDetailController::class, 'update'])
        ->middleware('role:operations,admin,owner')
        ->name('cases.laboratory.update');

    /*
    |----------------------------------------------------------------------
    | Documents
    |----------------------------------------------------------------------
    | Read: any authenticated user.
    | Create: booking / operations / admin (or owner).
    | Delete: admin (or owner).
    */
    Route::get('/documents', [DocumentController::class, 'index'])->name('documents.index');
    Route::get('/documents/{document}', [DocumentController::class, 'show'])->name('documents.show');

    Route::post('/documents', [DocumentController::class, 'store'])
        ->middleware('role:booking,operations,admin,owner')
        ->name('documents.store');

    Route::delete('/documents/{document}', [DocumentController::class, 'destroy'])
        ->middleware('role:operations,admin,owner')
        ->name('documents.destroy');

    /*
    |----------------------------------------------------------------------
    | Billing
    |----------------------------------------------------------------------
    | Read: any authenticated user (pending + submitted + history).
    | Update: billing (or owner).
    */
    Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
    Route::put('/billing/{case}', [BillingController::class, 'update'])
        ->middleware('role:billing,owner')
        ->name('billing.update');

    /*
    |----------------------------------------------------------------------
    | Admin review
    |----------------------------------------------------------------------
    | Read: any authenticated user.
    | Action (approve|return|close): admin (or owner).
    */
    Route::get('/admin-review', [AdminReviewController::class, 'index'])->name('admin-review.index');
    Route::post('/admin-review/{case}', [AdminReviewController::class, 'action'])
        ->middleware('role:admin,owner')
        ->name('admin-review.action');

    /*
    |----------------------------------------------------------------------
    | Dashboard & reports
    |----------------------------------------------------------------------
    */
    Route::get('/dashboard/stats', [DashboardController::class, 'stats'])->name('dashboard.stats');
    Route::get('/reports/{report}', [ReportController::class, 'show'])->name('reports.show');

    // Branded register exports (.xlsx): inpatient | outpatient | laboratory
    Route::get('/registers/{type}/export', [RegisterController::class, 'export'])->name('registers.export');

    /*
    |----------------------------------------------------------------------
    | Notifications
    |----------------------------------------------------------------------
    */
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::put('/notifications/{id}', [NotificationController::class, 'markRead'])->whereNumber('id')->name('notifications.read');

    /*
    |----------------------------------------------------------------------
    | Settings (notification recipient emails + event toggles)
    |----------------------------------------------------------------------
    | Read: any authenticated user. Update: admin / owner only.
    */
    Route::get('/settings', [SettingsController::class, 'show'])->name('settings.show');
    Route::put('/settings', [SettingsController::class, 'update'])
        ->middleware('role:admin,owner')
        ->name('settings.update');

    /*
    |----------------------------------------------------------------------
    | Audit logs (read-only, admin/owner)
    |----------------------------------------------------------------------
    */
    Route::get('/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('role:admin,owner')
        ->name('audit-logs.index');

    /*
    |----------------------------------------------------------------------
    | Users (admin / owner only)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:admin,owner')->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show');
        Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    });
});
