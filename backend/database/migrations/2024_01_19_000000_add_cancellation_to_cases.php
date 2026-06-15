<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cancelled / no-show support. case_status moves from a fixed enum to a string
 * so we can add a "cancelled" state (validation still constrains the values).
 * cancellation_reason records why (no-show, patient/client cancelled, other).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->string('case_status')->default('booked')->change();
            $table->string('cancellation_reason')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->dropColumn('cancellation_reason');
            $table->enum('case_status', ['booked', 'in_progress', 'admin_review', 'billing', 'closed'])
                ->default('booked')
                ->change();
        });
    }
};
