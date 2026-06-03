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
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('surname');
            $table->date('date_of_birth');
            $table->string('gender');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('id_number')->unique();
            $table->string('mma_file_number')->unique();
            $table->string('area');
            $table->string('treating_doctor');
            $table->date('date_registered');
            $table->text('address')->nullable();
            $table->string('emergency_contact')->nullable();
            $table->string('medical_aid_number')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
