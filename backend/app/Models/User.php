<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    /**
     * Canonical roles.
     */
    public const ROLE_BOOKING = 'booking';
    public const ROLE_OPERATIONS = 'operations';
    public const ROLE_BILLING = 'billing';
    public const ROLE_ADMIN = 'admin';
    public const ROLE_OWNER = 'owner';

    public const ROLES = [
        self::ROLE_BOOKING,
        self::ROLE_OPERATIONS,
        self::ROLE_BILLING,
        self::ROLE_ADMIN,
        self::ROLE_OWNER,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'preferences',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'preferences' => 'array',
        ];
    }

    /**
     * Cases created by this user.
     */
    public function cases(): HasMany
    {
        return $this->hasMany(MedicalCase::class, 'created_by');
    }

    /**
     * Documents uploaded by this user.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'uploaded_by');
    }

    /**
     * Admin reviews performed by this user.
     */
    public function adminReviews(): HasMany
    {
        return $this->hasMany(AdminReview::class, 'reviewed_by');
    }

    /**
     * Audit logs attributed to this user.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'user_id');
    }

    /**
     * Notifications targeted at this user.
     */
    public function userNotifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_id');
    }

    /**
     * Determine if the user has the given role.
     */
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /**
     * Determine if the user has any of the given roles.
     *
     * @param  array<int, string>  $roles
     */
    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function isOwner(): bool
    {
        return $this->hasRole(self::ROLE_OWNER);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(self::ROLE_ADMIN);
    }

    public function isBilling(): bool
    {
        return $this->hasRole(self::ROLE_BILLING);
    }

    public function isOperations(): bool
    {
        return $this->hasRole(self::ROLE_OPERATIONS);
    }

    public function isBooking(): bool
    {
        return $this->hasRole(self::ROLE_BOOKING);
    }

    /**
     * Owner is a superset of all roles and can manage everything.
     * Otherwise the user must hold the exact role required for the area.
     */
    public function canManage(string $role): bool
    {
        if ($this->isOwner()) {
            return true;
        }

        return $this->hasRole($role);
    }

    /**
     * Booking and owner may create patients/cases.
     */
    public function canCreatePatients(): bool
    {
        return $this->hasAnyRole([self::ROLE_BOOKING, self::ROLE_OWNER]);
    }

    /**
     * Operations and owner may manage cases/workflow.
     */
    public function canManageCases(): bool
    {
        return $this->hasAnyRole([self::ROLE_OPERATIONS, self::ROLE_OWNER]);
    }

    /**
     * Billing and owner may update billing fields.
     */
    public function canManageBilling(): bool
    {
        return $this->hasAnyRole([self::ROLE_BILLING, self::ROLE_OWNER]);
    }

    /**
     * Admin and owner may review/approve/close cases.
     */
    public function canReview(): bool
    {
        return $this->hasAnyRole([self::ROLE_ADMIN, self::ROLE_OWNER]);
    }
}
