<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCaseRequest extends FormRequest
{
    /**
     * Authorization is handled by the 'role:booking,owner' route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for creating a medical case.
     *
     * Canonical enums:
     *   CaseType      : inpatient | outpatient | laboratory
     *   CaseStatus    : booked | in_progress | admin_review | billing | closed
     *   WorkflowStage : operations | admin_review | billing | closed
     *   Priority      : low | medium | high | urgent
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'case_number'        => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('cases', 'case_number'),
            ],
            'patient_id'         => ['required', 'integer', Rule::exists('patients', 'id')],
            'case_type'          => ['required', 'string', 'in:inpatient,outpatient,laboratory'],
            'case_status'        => ['nullable', 'string', 'in:booked,in_progress,admin_review,billing,closed'],
            'workflow_stage'     => ['nullable', 'string', 'in:operations,admin_review,billing,closed'],
            'priority'           => ['nullable', 'string', 'in:low,medium,high,urgent'],
            'assigned_department' => ['nullable', 'string', 'max:255'],
            'date_opened'        => ['required', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'case_type.in'      => 'The case type must be one of: inpatient, outpatient, laboratory.',
            'case_status.in'    => 'The case status must be one of: booked, in_progress, admin_review, billing, closed.',
            'workflow_stage.in' => 'The workflow stage must be one of: operations, admin_review, billing, closed.',
            'priority.in'       => 'The priority must be one of: low, medium, high, urgent.',
            'patient_id.exists' => 'The selected patient does not exist.',
            'case_number.unique' => 'This case number is already in use.',
        ];
    }
}
