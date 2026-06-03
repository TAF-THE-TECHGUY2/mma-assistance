<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutpatientDetail extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'case_id',
        'file_date',
        'file_number',
        'consult_date',
        'followup_date',
        'ongoing_treatment',
        'date_to_admin',
        'mr_requested',
        'mr_received',
        'admin_closure_date',
        'submission_date',
        'date_pastel',
        'case_status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'file_date' => 'date',
            'consult_date' => 'date',
            'followup_date' => 'date',
            'date_to_admin' => 'date',
            'admin_closure_date' => 'date',
            'submission_date' => 'date',
            'date_pastel' => 'date',
            'ongoing_treatment' => 'boolean',
            'mr_requested' => 'boolean',
            'mr_received' => 'boolean',
        ];
    }

    /**
     * The case this detail belongs to.
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(MedicalCase::class, 'case_id');
    }
}
