<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'first_name',
        'surname',
        'date_of_birth',
        'gender',
        'phone',
        'email',
        'id_number',
        'passport_number',
        'mma_file_number',
        'area',
        'treating_doctor',
        'date_registered',
        'address',
        'emergency_contact',
        'medical_aid_number',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date:Y-m-d',
            'date_registered' => 'date:Y-m-d',
        ];
    }

    /**
     * Cases belonging to this patient.
     */
    public function cases(): HasMany
    {
        return $this->hasMany(MedicalCase::class, 'patient_id');
    }

    /**
     * Documents belonging to this patient.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'patient_id');
    }
}
