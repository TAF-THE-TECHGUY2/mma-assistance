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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('patient_id')->nullable()->constrained('patients')->cascadeOnDelete();
            $table->foreignId('case_id')->nullable()->constrained('cases')->cascadeOnDelete();
            $table->date('upload_date');
            $table->string('document_type')->nullable();
            $table->string('file_url');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('document_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('document_category')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
