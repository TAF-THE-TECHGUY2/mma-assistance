<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inpatient_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->unique()->constrained('cases')->cascadeOnDelete();
            $table->string('file_number')->nullable();
            $table->date('admission_date')->nullable();
            $table->date('discharge_date')->nullable();
            $table->date('date_to_admin')->nullable();
            $table->boolean('mr_requested')->default(false);
            $table->boolean('mr_received')->default(false);
            $table->date('admin_closure_date')->nullable();
            $table->date('submission_date')->nullable();
            $table->date('date_pastel')->nullable();
            $table->string('case_status')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inpatient_details');
    }
};
