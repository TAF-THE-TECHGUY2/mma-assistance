<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The hospital where an inpatient is admitted, captured on the new case.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inpatient_details', function (Blueprint $table) {
            $table->string('hospital')->nullable()->after('file_number');
        });
    }

    public function down(): void
    {
        Schema::table('inpatient_details', function (Blueprint $table) {
            $table->dropColumn('hospital');
        });
    }
};
