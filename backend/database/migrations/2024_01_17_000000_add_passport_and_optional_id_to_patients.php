<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ID number is optional now (patients sometimes only have a passport, captured
 * during/after treatment). Add a separate passport number; keep DOB required.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('id_number')->nullable()->change();
            $table->string('passport_number')->nullable()->unique()->after('id_number');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn('passport_number');
            $table->string('id_number')->nullable(false)->change();
        });
    }
};
