<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    /**
     * Authorization is handled by the route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for creating a document.
     *
     * Canonical enum:
     *   DocumentStatus : pending | approved | rejected
     *
     * A document must belong to at least one of patient or case.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name'              => ['required', 'string', 'max:255'],
            'patient_id'        => ['nullable', 'required_without:case_id', 'integer', Rule::exists('patients', 'id')],
            'case_id'           => ['nullable', 'required_without:patient_id', 'integer', Rule::exists('cases', 'id')],
            'upload_date'       => ['required', 'date'],
            'document_type'     => ['nullable', 'string', 'max:255'],

            // Accept either an uploaded file or a pre-resolved URL string.
            'file_url'          => ['required_without:file', 'nullable', 'string', 'max:2048'],
            'file'              => ['required_without:file_url', 'nullable', 'file', 'max:20480'],

            'document_status'   => ['nullable', 'string', 'in:pending,approved,rejected'],
            'document_category' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'document_status.in'        => 'The document status must be one of: pending, approved, rejected.',
            'patient_id.required_without' => 'A document must be linked to a patient or a case.',
            'case_id.required_without'    => 'A document must be linked to a patient or a case.',
            'patient_id.exists'         => 'The selected patient does not exist.',
            'case_id.exists'            => 'The selected case does not exist.',
            'file_url.required_without' => 'A file or file URL is required.',
            'file.required_without'     => 'A file or file URL is required.',
        ];
    }
}
