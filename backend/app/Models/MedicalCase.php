<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class MedicalCase extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'cases';

    /**
     * Canonical case types.
     */
    public const TYPE_INPATIENT = 'inpatient';
    public const TYPE_OUTPATIENT = 'outpatient';
    public const TYPE_LABORATORY = 'laboratory';

    /**
     * Canonical case statuses.
     */
    public const STATUS_BOOKED = 'booked';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_ADMIN_REVIEW = 'admin_review';
    public const STATUS_BILLING = 'billing';
    public const STATUS_CLOSED = 'closed';

    /**
     * Canonical workflow stages.
     */
    public const STAGE_OPERATIONS = 'operations';
    public const STAGE_ADMIN_REVIEW = 'admin_review';
    public const STAGE_BILLING = 'billing';
    public const STAGE_CLOSED = 'closed';

    /**
     * Canonical priorities.
     */
    public const PRIORITY_LOW = 'low';
    public const PRIORITY_MEDIUM = 'medium';
    public const PRIORITY_HIGH = 'high';
    public const PRIORITY_URGENT = 'urgent';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'case_number',
        'patient_id',
        'case_type',
        'case_status',
        'workflow_stage',
        'priority',
        'assigned_department',
        'created_by',
        'date_opened',
        'due_date',
    ];

    /**
     * The model's default attribute values.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'case_status' => self::STATUS_BOOKED,
        'workflow_stage' => self::STAGE_OPERATIONS,
        'priority' => self::PRIORITY_MEDIUM,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_opened' => 'date',
            'due_date' => 'date',
        ];
    }

    /**
     * The patient this case belongs to.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    /**
     * The user that created this case.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Inpatient detail (one-to-one).
     */
    public function inpatientDetail(): HasOne
    {
        return $this->hasOne(InpatientDetail::class, 'case_id');
    }

    /**
     * Outpatient detail (one-to-one).
     */
    public function outpatientDetail(): HasOne
    {
        return $this->hasOne(OutpatientDetail::class, 'case_id');
    }

    /**
     * Laboratory detail (one-to-one).
     */
    public function laboratoryDetail(): HasOne
    {
        return $this->hasOne(LaboratoryDetail::class, 'case_id');
    }

    /**
     * Documents attached to this case.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'case_id');
    }

    /**
     * Billings for this case.
     */
    public function billings(): HasMany
    {
        return $this->hasMany(Billing::class, 'case_id');
    }

    /**
     * Admin reviews for this case.
     */
    public function adminReviews(): HasMany
    {
        return $this->hasMany(AdminReview::class, 'case_id');
    }

    /**
     * Notifications associated with this case.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'case_id');
    }

    /**
     * Audit-log entries recorded against this case.
     */
    public function auditLogs(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }
}
