<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The file number and treating doctor now live on the case (per visit), so a
 * recurring patient is registered once as an identity record. Make those
 * patient columns optional.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('mma_file_number')->nullable()->change();
            $table->string('treating_doctor')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('mma_file_number')->nullable(false)->change();
            $table->string('treating_doctor')->nullable(false)->change();
        });
    }
};
