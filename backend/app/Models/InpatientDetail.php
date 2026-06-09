<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InpatientDetail extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'case_id',
        'file_number',
        'admission_date',
        'discharge_date',
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
            'admission_date' => 'date:Y-m-d',
            'discharge_date' => 'date:Y-m-d',
            'date_to_admin' => 'date:Y-m-d',
            'admin_closure_date' => 'date:Y-m-d',
            'submission_date' => 'date:Y-m-d',
            'date_pastel' => 'date:Y-m-d',
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
