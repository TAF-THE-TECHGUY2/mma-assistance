<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePatientRequest extends FormRequest
{
    /**
     * Authorization is handled by the route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Resolve the patient id from the route for unique-ignore rules.
     */
    protected function patientId(): mixed
    {
        $patient = $this->route('patient');

        // Route model binding may give a model instance or a raw id.
        if (is_object($patient)) {
            return $patient->getKey();
        }

        return $patient;
    }

    /**
     * Validation rules for updating a patient. All fields use 'sometimes'
     * so partial (PATCH-style) updates are supported via PUT.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $id = $this->patientId();

        return [
            'first_name'        => ['sometimes', 'required', 'string', 'max:255'],
            'surname'           => ['sometimes', 'required', 'string', 'max:255'],
            'date_of_birth'     => ['sometimes', 'required', 'date', 'before_or_equal:today'],
            'gender'            => ['sometimes', 'required', 'string', 'max:50'],
            'phone'             => ['sometimes', 'required', 'string', 'max:50'],
            'email'             => ['sometimes', 'nullable', 'email:rfc', 'max:255'],

            'id_number'         => [
                'sometimes',
                'required',
                'string',
                'regex:/^[0-9]{13}$/',
                Rule::unique('patients', 'id_number')->ignore($id),
            ],

            'mma_file_number'   => [
                'sometimes',
                'required',
                'string',
                'max:50',
                'regex:/^[A-Za-z0-9\-\/]+$/',
                Rule::unique('patients', 'mma_file_number')->ignore($id),
            ],

            'area'              => ['sometimes', 'required', 'string', 'max:255'],
            'treating_doctor'   => ['sometimes', 'required', 'string', 'max:255'],
            'date_registered'   => ['sometimes', 'required', 'date'],
            'address'           => ['sometimes', 'nullable', 'string'],
            'emergency_contact' => ['sometimes', 'nullable', 'string', 'max:255'],
            'medical_aid_number' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'id_number.regex'        => 'The ID number must be exactly 13 digits.',
            'id_number.unique'       => 'A patient with this ID number already exists.',
            'mma_file_number.regex'  => 'The MMA file number format is invalid.',
            'mma_file_number.unique' => 'This MMA file number is already in use.',
            'email.email'            => 'Please provide a valid email address.',
        ];
    }
}
