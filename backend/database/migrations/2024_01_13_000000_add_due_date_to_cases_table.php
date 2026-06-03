<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a "due_date" to cases — the date a case received from a client is due to
 * be completed. Drives the Upcoming Cases view and overdue alerts so nothing is
 * missed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->date('due_date')->nullable()->after('date_opened')->index();
        });
    }

    public function down(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->dropColumn('due_date');
        });
    }
};
