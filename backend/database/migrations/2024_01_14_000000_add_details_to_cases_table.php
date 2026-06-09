<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-visit fields captured on the case (not the patient), so a recurring
 * patient can be registered once and each monthly case carries its own file
 * number, treating doctor and notes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->string('file_number')->nullable()->after('case_number');
            $table->string('treating_doctor')->nullable()->after('assigned_department');
            $table->text('notes')->nullable()->after('due_date');
        });
    }

    public function down(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->dropColumn(['file_number', 'treating_doctor', 'notes']);
        });
    }
};
