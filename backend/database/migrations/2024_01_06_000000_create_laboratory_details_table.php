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
        Schema::create('laboratory_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->unique()->constrained('cases')->cascadeOnDelete();
            $table->date('appointment_date')->nullable();
            $table->string('treating_doctor')->nullable();
            $table->string('area')->nullable();
            $table->date('date_registered')->nullable();
            $table->enum('invoice_status', ['pending', 'invoiced', 'paid'])->default('pending');
            $table->string('lab_type')->nullable();
            $table->string('case_status')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('laboratory_details');
    }
};
