<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBillingRequest extends FormRequest
{
    /**
     * Authorization is handled by the 'role:billing,owner' route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for updating a billing record.
     *
     * Canonical enum:
     *   BillingStatus : pending | submitted | completed
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'billing_status'  => ['sometimes', 'required', 'string', 'in:pending,submitted,completed'],
            'submission_date' => ['nullable', 'date'],
            'date_pastel'     => ['nullable', 'date'],
            'notes'           => ['nullable', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'billing_status.in' => 'The billing status must be one of: pending, submitted, completed.',
        ];
    }
}
