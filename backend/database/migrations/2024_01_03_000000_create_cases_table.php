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
        Schema::create('cases', function (Blueprint $table) {
            $table->id();
            $table->string('case_number')->unique();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->enum('case_type', ['inpatient', 'outpatient', 'laboratory']);
            $table->enum('case_status', ['booked', 'in_progress', 'admin_review', 'billing', 'closed'])
                ->default('booked');
            $table->enum('workflow_stage', ['operations', 'admin_review', 'billing', 'closed'])
                ->default('operations');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])
                ->default('medium');
            $table->string('assigned_department')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('date_opened');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cases');
    }
};
