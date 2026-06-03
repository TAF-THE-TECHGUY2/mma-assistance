<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    /**
     * GET /api/documents
     * List documents with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Document::query()->with(['patient', 'uploader']);

        if ($patientId = $request->query('patient_id')) {
            $query->where('patient_id', $patientId);
        }

        if ($caseId = $request->query('case_id')) {
            $query->where('case_id', $caseId);
        }

        if ($status = $request->query('document_status')) {
            $query->where('document_status', $status);
        }

        if ($category = $request->query('document_category')) {
            $query->where('document_category', $category);
        }

        if ($type = $request->query('document_type')) {
            $query->where('document_type', $type);
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $query->orderByDesc('upload_date')->orderByDesc('created_at');

        $perPage = (int) $request->query('per_page', 25);
        $documents = $query->paginate($perPage);

        return response()->json([
            'data' => $documents->items(),
            'meta' => [
                'current_page' => $documents->currentPage(),
                'last_page' => $documents->lastPage(),
                'per_page' => $documents->perPage(),
                'total' => $documents->total(),
            ],
        ]);
    }

    /**
     * POST /api/documents
     * Store document metadata. Accepts an uploaded file or a pre-supplied URL.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'patient_id' => ['nullable', 'integer', 'exists:patients,id'],
            'case_id' => ['nullable', 'integer', 'exists:cases,id'],
            'upload_date' => ['nullable', 'date'],
            'document_type' => ['nullable', 'string', 'max:255'],
            'document_category' => ['nullable', 'string', 'max:255'],
            'document_status' => ['nullable', 'in:pending,approved,rejected'],
            'file_url' => ['nullable', 'string', 'max:2048'],
            'file' => ['nullable', 'file', 'max:20480'],
        ]);

        $fileUrl = $data['file_url'] ?? null;

        if ($request->hasFile('file')) {
            $path = $request->file('file')->store('documents', 'public');
            $fileUrl = Storage::disk('public')->url($path);
        }

        $document = Document::create([
            'name' => $data['name'],
            'patient_id' => $data['patient_id'] ?? null,
            'case_id' => $data['case_id'] ?? null,
            'upload_date' => $data['upload_date'] ?? now()->toDateString(),
            'document_type' => $data['document_type'] ?? null,
            'document_category' => $data['document_category'] ?? null,
            'document_status' => $data['document_status'] ?? 'pending',
            'file_url' => $fileUrl ?? '',
            'uploaded_by' => Auth::id(),
        ]);

        AuditService::log(
            'document.created',
            $document,
            ['after' => $document->toArray()],
            "Document {$document->name} uploaded."
        );

        return response()->json(['data' => $document], 201);
    }

    /**
     * GET /api/documents/{id}
     */
    public function show(int $id): JsonResponse
    {
        $document = Document::with(['patient', 'uploader'])->findOrFail($id);

        return response()->json(['data' => $document]);
    }

    /**
     * DELETE /api/documents/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $document = Document::findOrFail($id);
        $name = $document->name;

        $document->delete();

        AuditService::log(
            'document.deleted',
            null,
            ['id' => $id, 'name' => $name],
            "Document {$name} deleted."
        );

        return response()->json(['message' => 'Document deleted.']);
    }
}
