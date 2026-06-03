<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaboratoryDetail extends Model
{
    use HasFactory;

    /**
     * Canonical invoice statuses.
     */
    public const INVOICE_PENDING = 'pending';
    public const INVOICE_INVOICED = 'invoiced';
    public const INVOICE_PAID = 'paid';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'case_id',
        'appointment_date',
        'treating_doctor',
        'area',
        'date_registered',
        'invoice_status',
        'lab_type',
        'case_status',
    ];

    /**
     * The model's default attribute values.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'invoice_status' => self::INVOICE_PENDING,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'appointment_date' => 'date',
            'date_registered' => 'date',
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
