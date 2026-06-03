<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Models\Patient;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    /**
     * GET /api/patients
     * List patients with optional search and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Patient::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('surname', 'like', "%{$search}%")
                    ->orWhere('id_number', 'like', "%{$search}%")
                    ->orWhere('mma_file_number', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($area = $request->query('area')) {
            $query->where('area', $area);
        }

        $sort = $request->query('sort', 'created_at');
        $direction = $request->query('direction', 'desc');
        $allowedSorts = ['first_name', 'surname', 'date_registered', 'created_at', 'mma_file_number'];
        if (in_array($sort, $allowedSorts, true)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->query('per_page', 25);
        $patients = $query->paginate($perPage);

        return response()->json([
            'data' => $patients->items(),
            'meta' => [
                'current_page' => $patients->currentPage(),
                'last_page' => $patients->lastPage(),
                'per_page' => $patients->perPage(),
                'total' => $patients->total(),
            ],
        ]);
    }

    /**
     * POST /api/patients
     * Create a new patient.
     */
    public function store(StorePatientRequest $request): JsonResponse
    {
        $data = $request->validated();

        $patient = Patient::create($data);

        AuditService::log(
            'patient.created',
            $patient,
            ['after' => $patient->toArray()],
            "Patient {$patient->first_name} {$patient->surname} created."
        );

        return response()->json(['data' => $patient], 201);
    }

    /**
     * GET /api/patients/{id}
     */
    public function show(int $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);

        return response()->json(['data' => $patient]);
    }

    /**
     * PUT /api/patients/{id}
     */
    public function update(UpdatePatientRequest $request, int $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);

        $data = $request->validated();

        $before = $patient->toArray();
        $patient->update($data);

        AuditService::log(
            'patient.updated',
            $patient,
            ['before' => $before, 'after' => $patient->fresh()->toArray()],
            "Patient {$patient->first_name} {$patient->surname} updated."
        );

        return response()->json(['data' => $patient]);
    }

    /**
     * DELETE /api/patients/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);
        $label = "{$patient->first_name} {$patient->surname}";

        $patient->delete();

        AuditService::log(
            'patient.deleted',
            null,
            ['id' => $id],
            "Patient {$label} deleted."
        );

        return response()->json(['message' => 'Patient deleted.']);
    }

    /**
     * GET /api/patients/{id}/cases
     */
    public function cases(int $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);

        $cases = $patient->cases()
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $cases,
            'meta' => ['total' => $cases->count()],
        ]);
    }

    /**
     * GET /api/patients/{id}/documents
     */
    public function documents(int $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);

        $documents = $patient->documents()
            ->orderByDesc('upload_date')
            ->get();

        return response()->json([
            'data' => $documents,
            'meta' => ['total' => $documents->count()],
        ]);
    }
}
