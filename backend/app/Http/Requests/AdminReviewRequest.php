<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminReviewRequest extends FormRequest
{
    /**
     * Authorization is handled by the 'role:admin,owner' route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for an admin review action.
     *
     * Supported actions:
     *   approve -> move the case forward (to billing)
     *   return  -> return the case to operations
     *   close   -> close the case
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'action'             => ['required', 'string', 'in:approve,return,close'],
            'review_notes'       => ['nullable', 'string'],
            'admin_closure_date' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'action.required' => 'An action is required.',
            'action.in'       => 'The action must be one of: approve, return, close.',
        ];
    }
}
