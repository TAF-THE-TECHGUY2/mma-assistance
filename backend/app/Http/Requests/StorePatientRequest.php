<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePatientRequest extends FormRequest
{
    /**
     * Authorization is handled by the 'role:booking,owner' route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for creating a patient.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'first_name'        => ['required', 'string', 'max:255'],
            'surname'           => ['required', 'string', 'max:255'],
            'date_of_birth'     => ['required', 'date', 'before_or_equal:today'],
            'gender'            => ['required', 'string', 'max:50'],
            'phone'             => ['required', 'string', 'max:50'],
            'email'             => ['nullable', 'email:rfc', 'max:255'],

            // South African ID number: 13 digits, must be unique.
            'id_number'         => [
                'required',
                'string',
                'regex:/^[0-9]{13}$/',
                Rule::unique('patients', 'id_number'),
            ],

            // MMA file number: optional now (the per-visit file number lives on
            // the case). Still unique when supplied.
            'mma_file_number'   => [
                'nullable',
                'string',
                'max:50',
                'regex:/^[A-Za-z0-9\-\/]+$/',
                Rule::unique('patients', 'mma_file_number'),
            ],

            'area'              => ['nullable', 'string', 'max:255'],
            'treating_doctor'   => ['nullable', 'string', 'max:255'],
            'date_registered'   => ['required', 'date'],
            'address'           => ['nullable', 'string'],
            'emergency_contact' => ['nullable', 'string', 'max:255'],
            'medical_aid_number' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Human friendly validation messages.
     *
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
