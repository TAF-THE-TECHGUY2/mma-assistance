<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCaseRequest extends FormRequest
{
    /**
     * Authorization is handled by the route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Resolve the case id from the route for unique-ignore rules.
     */
    protected function caseId(): mixed
    {
        $case = $this->route('case');

        if (is_object($case)) {
            return $case->getKey();
        }

        return $case;
    }

    /**
     * Validation rules for updating a medical case. Fields use 'sometimes'
     * to support partial updates.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $id = $this->caseId();

        return [
            'case_number'        => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('cases', 'case_number')->ignore($id),
            ],
            'patient_id'         => ['sometimes', 'required', 'integer', Rule::exists('patients', 'id')],
            'case_type'          => ['sometimes', 'required', 'string', 'in:inpatient,outpatient,laboratory'],
            'case_status'        => ['sometimes', 'required', 'string', 'in:booked,in_progress,admin_review,billing,closed'],
            'workflow_stage'     => ['sometimes', 'required', 'string', 'in:operations,admin_review,billing,closed'],
            'priority'           => ['sometimes', 'required', 'string', 'in:low,medium,high,urgent'],
            'assigned_department' => ['sometimes', 'nullable', 'string', 'max:255'],
            'date_opened'        => ['sometimes', 'required', 'date'],
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
