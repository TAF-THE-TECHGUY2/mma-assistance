<?php

namespace App\Policies;

use App\Models\MedicalCase;
use App\Models\User;

class CasePolicy
{
    /**
     * Owner has full access to everything (superset of all roles).
     * Returning true short-circuits all other ability checks.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->role === 'owner') {
            return true;
        }

        return null;
    }

    /**
     * Anyone authenticated may list cases.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['booking', 'operations', 'billing', 'admin'], true);
    }

    /**
     * Anyone authenticated may view a single case.
     */
    public function view(User $user, MedicalCase $case): bool
    {
        return in_array($user->role, ['booking', 'operations', 'billing', 'admin'], true);
    }

    /**
     * Booking creates cases; operations may also create.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['booking', 'operations'], true);
    }

    /**
     * Operations manages/updates operational fields on cases.
     */
    public function update(User $user, MedicalCase $case): bool
    {
        return $user->role === 'operations';
    }

    /**
     * Only admin (and owner via before()) may delete a case.
     */
    public function delete(User $user, MedicalCase $case): bool
    {
        return $user->role === 'admin';
    }

    /**
     * Operations may move a case through workflow stages.
     */
    public function moveWorkflow(User $user, MedicalCase $case): bool
    {
        return $user->role === 'operations';
    }

    /**
     * Billing role may update billing fields.
     */
    public function manageBilling(User $user, MedicalCase $case): bool
    {
        return $user->role === 'billing';
    }

    /**
     * Admin reviews, approves, returns to operations, and closes cases.
     */
    public function review(User $user, MedicalCase $case): bool
    {
        return $user->role === 'admin';
    }

    /**
     * Admin closes cases.
     */
    public function close(User $user, MedicalCase $case): bool
    {
        return $user->role === 'admin';
    }
}
