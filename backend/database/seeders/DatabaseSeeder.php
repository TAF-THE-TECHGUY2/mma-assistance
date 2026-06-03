<?php

namespace Database\Seeders;

use App\Models\AdminReview;
use App\Models\AuditLog;
use App\Models\Billing;
use App\Models\Document;
use App\Models\InpatientDetail;
use App\Models\LaboratoryDetail;
use App\Models\MedicalCase;
use App\Models\Notification;
use App\Models\OutpatientDetail;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with realistic demo data.
     */
    public function run(): void
    {
        $users     = $this->seedUsers();
        $patients  = $this->seedPatients();
        $cases     = $this->seedCases($patients, $users);

        $this->seedCaseDetails($cases);
        $this->seedDocuments($cases, $patients, $users);
        $this->seedBillings($cases);
        $this->seedAdminReviews($cases, $users);
        $this->seedNotifications($cases, $users);
        $this->seedAuditLogs($cases, $users);
    }

    /**
     * One user per canonical Role.
     *
     * @return array<string, \App\Models\User>
     */
    private function seedUsers(): array
    {
        $definitions = [
            ['name' => 'Bridget Booking',    'email' => 'booking@mma.test',    'role' => 'booking'],
            ['name' => 'Oliver Operations',  'email' => 'operations@mma.test', 'role' => 'operations'],
            ['name' => 'Bianca Billing',     'email' => 'billing@mma.test',    'role' => 'billing'],
            ['name' => 'Adam Admin',         'email' => 'admin@mma.test',      'role' => 'admin'],
            ['name' => 'Olivia Owner',       'email' => 'owner@mma.test',      'role' => 'owner'],
        ];

        $users = [];

        foreach ($definitions as $def) {
            $users[$def['role']] = User::updateOrCreate(
                ['email' => $def['email']],
                [
                    'name'              => $def['name'],
                    'password'          => Hash::make('password'),
                    'role'              => $def['role'],
                    'email_verified_at' => now(),
                ]
            );
        }

        return $users;
    }

    /**
     * ~8 patients.
     *
     * @return array<int, \App\Models\Patient>
     */
    private function seedPatients(): array
    {
        $rows = [
            ['first_name' => 'Thabo',   'surname' => 'Mokoena',   'gender' => 'male',   'dob' => '1985-03-12', 'area' => 'Soweto',      'doctor' => 'Dr. Ndlovu'],
            ['first_name' => 'Naledi',  'surname' => 'Khumalo',   'gender' => 'female', 'dob' => '1992-07-25', 'area' => 'Sandton',     'doctor' => 'Dr. Patel'],
            ['first_name' => 'Sipho',   'surname' => 'Dlamini',   'gender' => 'male',   'dob' => '1978-11-02', 'area' => 'Midrand',     'doctor' => 'Dr. Ndlovu'],
            ['first_name' => 'Lerato',  'surname' => 'Mthembu',   'gender' => 'female', 'dob' => '2001-01-18', 'area' => 'Pretoria',    'doctor' => 'Dr. Smith'],
            ['first_name' => 'Johan',   'surname' => 'van der Merwe', 'gender' => 'male', 'dob' => '1965-09-30', 'area' => 'Centurion', 'doctor' => 'Dr. Patel'],
            ['first_name' => 'Aisha',   'surname' => 'Patel',     'gender' => 'female', 'dob' => '1989-05-14', 'area' => 'Lenasia',     'doctor' => 'Dr. Smith'],
            ['first_name' => 'Mandla',  'surname' => 'Zulu',      'gender' => 'male',   'dob' => '1996-12-08', 'area' => 'Alexandra',   'doctor' => 'Dr. Ndlovu'],
            ['first_name' => 'Chantal', 'surname' => 'Pillay',    'gender' => 'female', 'dob' => '1973-04-21', 'area' => 'Randburg',    'doctor' => 'Dr. Botha'],
        ];

        $patients = [];

        foreach ($rows as $i => $row) {
            $seq = str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT);

            $patients[] = Patient::updateOrCreate(
                ['id_number' => sprintf('85%07d08%d', $i + 1, ($i % 9) + 1) . '0'],
                [
                    'first_name'        => $row['first_name'],
                    'surname'           => $row['surname'],
                    'date_of_birth'     => $row['dob'],
                    'gender'            => $row['gender'],
                    'phone'             => '0' . (60 + $i) . '123456' . $i,
                    'email'             => strtolower($row['first_name'] . '.' . str_replace(' ', '', $row['surname'])) . '@example.com',
                    'mma_file_number'   => 'MMA-' . $seq,
                    'area'              => $row['area'],
                    'treating_doctor'   => $row['doctor'],
                    'date_registered'   => Carbon::now()->subDays(120 - ($i * 10))->toDateString(),
                    'address'           => ($i + 1) . ' Main Road, ' . $row['area'],
                    'emergency_contact' => '0' . (70 + $i) . '987654' . $i,
                    'medical_aid_number' => 'MA' . sprintf('%08d', 100000 + $i),
                ]
            );
        }

        return $patients;
    }

    /**
     * ~12 cases spread across case types, statuses and workflow stages.
     *
     * @param  array<int, \App\Models\Patient>  $patients
     * @param  array<string, \App\Models\User>  $users
     * @return array<int, \App\Models\MedicalCase>
     */
    private function seedCases(array $patients, array $users): array
    {
        // [case_type, case_status, workflow_stage, priority]
        $blueprints = [
            ['inpatient',  'booked',       'operations',   'medium'],
            ['inpatient',  'in_progress',  'operations',   'high'],
            ['inpatient',  'admin_review', 'admin_review', 'urgent'],
            ['inpatient',  'closed',       'closed',       'low'],
            ['outpatient', 'booked',       'operations',   'low'],
            ['outpatient', 'in_progress',  'operations',   'medium'],
            ['outpatient', 'billing',      'billing',      'high'],
            ['outpatient', 'closed',       'closed',       'medium'],
            ['laboratory', 'booked',       'operations',   'low'],
            ['laboratory', 'in_progress',  'operations',   'medium'],
            ['laboratory', 'billing',      'billing',      'high'],
            ['laboratory', 'closed',       'closed',       'low'],
        ];

        $bookingUser = $users['booking'];
        $cases       = [];

        foreach ($blueprints as $i => $bp) {
            [$type, $status, $stage, $priority] = $bp;

            $patient = $patients[$i % count($patients)];
            $seq     = str_pad((string) ($i + 1), 5, '0', STR_PAD_LEFT);

            $department = match ($stage) {
                'operations'   => 'Operations',
                'admin_review' => 'Admin',
                'billing'      => 'Billing',
                'closed'       => 'Archive',
                default        => null,
            };

            $cases[] = MedicalCase::updateOrCreate(
                ['case_number' => 'CASE-' . $seq],
                [
                    'patient_id'          => $patient->id,
                    'case_type'           => $type,
                    'case_status'         => $status,
                    'workflow_stage'      => $stage,
                    'priority'            => $priority,
                    'assigned_department' => $department,
                    'created_by'          => $bookingUser->id,
                    'date_opened'         => Carbon::now()->subDays(60 - ($i * 4))->toDateString(),
                ]
            );
        }

        return $cases;
    }

    /**
     * Create the matching detail record for each case based on its type.
     *
     * @param  array<int, \App\Models\MedicalCase>  $cases
     */
    private function seedCaseDetails(array $cases): void
    {
        foreach ($cases as $i => $case) {
            $opened   = Carbon::parse($case->date_opened);
            $closedish = in_array($case->case_status, ['admin_review', 'billing', 'closed'], true);
            $isClosed  = $case->case_status === 'closed';

            switch ($case->case_type) {
                case 'inpatient':
                    InpatientDetail::updateOrCreate(
                        ['case_id' => $case->id],
                        [
                            'file_number'        => 'IN-' . str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                            'admission_date'     => $opened->copy()->addDay()->toDateString(),
                            'discharge_date'     => $closedish ? $opened->copy()->addDays(6)->toDateString() : null,
                            'date_to_admin'      => $closedish ? $opened->copy()->addDays(7)->toDateString() : null,
                            'mr_requested'       => $closedish,
                            'mr_received'        => $isClosed,
                            'admin_closure_date' => $isClosed ? $opened->copy()->addDays(10)->toDateString() : null,
                            'submission_date'    => $isClosed ? $opened->copy()->addDays(11)->toDateString() : null,
                            'date_pastel'        => $isClosed ? $opened->copy()->addDays(12)->toDateString() : null,
                            'case_status'        => $case->case_status,
                        ]
                    );
                    break;

                case 'outpatient':
                    OutpatientDetail::updateOrCreate(
                        ['case_id' => $case->id],
                        [
                            'file_date'          => $opened->toDateString(),
                            'file_number'        => 'OUT-' . str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                            'consult_date'       => $opened->copy()->addDays(2)->toDateString(),
                            'followup_date'      => $opened->copy()->addDays(16)->toDateString(),
                            'ongoing_treatment'  => $case->case_status === 'in_progress',
                            'date_to_admin'      => $closedish ? $opened->copy()->addDays(5)->toDateString() : null,
                            'mr_requested'       => $closedish,
                            'mr_received'        => $isClosed,
                            'admin_closure_date' => $isClosed ? $opened->copy()->addDays(9)->toDateString() : null,
                            'submission_date'    => $isClosed ? $opened->copy()->addDays(10)->toDateString() : null,
                            'date_pastel'        => $isClosed ? $opened->copy()->addDays(11)->toDateString() : null,
                            'case_status'        => $case->case_status,
                        ]
                    );
                    break;

                case 'laboratory':
                    LaboratoryDetail::updateOrCreate(
                        ['case_id' => $case->id],
                        [
                            'appointment_date' => $opened->copy()->addDays(1)->toDateString(),
                            'treating_doctor'  => $case->patient?->treating_doctor ?? 'Dr. Ndlovu',
                            'area'             => $case->patient?->area ?? 'Soweto',
                            'date_registered'  => $opened->toDateString(),
                            'invoice_status'   => $isClosed ? 'paid' : ($case->case_status === 'billing' ? 'invoiced' : 'pending'),
                            'lab_type'         => ['Full Blood Count', 'Lipid Panel', 'Liver Function', 'Urinalysis'][$i % 4],
                            'case_status'      => $case->case_status,
                        ]
                    );
                    break;
            }
        }
    }

    /**
     * A handful of documents tied to cases/patients.
     *
     * @param  array<int, \App\Models\MedicalCase>  $cases
     * @param  array<int, \App\Models\Patient>      $patients
     * @param  array<string, \App\Models\User>      $users
     */
    private function seedDocuments(array $cases, array $patients, array $users): void
    {
        $opsUser   = $users['operations'];
        $statuses  = ['pending', 'approved', 'rejected'];
        $types     = ['Admission Form', 'Lab Report', 'Discharge Summary', 'Referral Letter', 'Consent Form'];
        $categories = ['clinical', 'administrative', 'billing'];

        foreach (array_slice($cases, 0, 6) as $i => $case) {
            Document::create([
                'name'              => $types[$i % count($types)] . ' - ' . $case->case_number,
                'patient_id'        => $case->patient_id,
                'case_id'           => $case->id,
                'upload_date'       => Carbon::parse($case->date_opened)->addDay()->toDateString(),
                'document_type'     => $types[$i % count($types)],
                'file_url'          => 'documents/' . strtolower(str_replace(' ', '_', $types[$i % count($types)])) . '_' . $case->id . '.pdf',
                'uploaded_by'       => $opsUser->id,
                'document_status'   => $statuses[$i % count($statuses)],
                'document_category' => $categories[$i % count($categories)],
            ]);
        }

        // A couple of patient-only documents (no case).
        foreach (array_slice($patients, 0, 2) as $i => $patient) {
            Document::create([
                'name'              => 'ID Copy - ' . $patient->mma_file_number,
                'patient_id'        => $patient->id,
                'case_id'           => null,
                'upload_date'       => Carbon::now()->subDays(30 - $i)->toDateString(),
                'document_type'     => 'Identity Document',
                'file_url'          => 'documents/id_copy_' . $patient->id . '.pdf',
                'uploaded_by'       => $opsUser->id,
                'document_status'   => 'approved',
                'document_category' => 'administrative',
            ]);
        }
    }

    /**
     * Billing records for cases in billing/closed states.
     *
     * @param  array<int, \App\Models\MedicalCase>  $cases
     */
    private function seedBillings(array $cases): void
    {
        foreach ($cases as $case) {
            if (! in_array($case->case_status, ['billing', 'closed'], true)) {
                continue;
            }

            $opened   = Carbon::parse($case->date_opened);
            $isClosed = $case->case_status === 'closed';

            Billing::updateOrCreate(
                ['case_id' => $case->id],
                [
                    'billing_status'  => $isClosed ? 'completed' : 'submitted',
                    'submission_date' => $opened->copy()->addDays(10)->toDateString(),
                    'date_pastel'     => $isClosed ? $opened->copy()->addDays(12)->toDateString() : null,
                    'notes'           => $isClosed
                        ? 'Billing completed and posted to Pastel.'
                        : 'Submitted to medical aid, awaiting confirmation.',
                ]
            );
        }
    }

    /**
     * Admin review records for cases that reached admin_review or beyond.
     *
     * @param  array<int, \App\Models\MedicalCase>  $cases
     * @param  array<string, \App\Models\User>      $users
     */
    private function seedAdminReviews(array $cases, array $users): void
    {
        $admin = $users['admin'];

        foreach ($cases as $case) {
            if (! in_array($case->case_status, ['admin_review', 'billing', 'closed'], true)) {
                continue;
            }

            $opened   = Carbon::parse($case->date_opened);
            $isClosed = $case->case_status === 'closed';

            AdminReview::updateOrCreate(
                ['case_id' => $case->id],
                [
                    'admin_closure_date' => $isClosed ? $opened->copy()->addDays(10)->toDateString() : null,
                    'review_notes'       => $isClosed
                        ? 'All documentation verified. Case closed.'
                        : 'Pending verification of medical records.',
                    'reviewed_by'        => $admin->id,
                ]
            );
        }
    }

    /**
     * Some notifications addressed to operating roles.
     *
     * @param  array<int, \App\Models\MedicalCase>  $cases
     * @param  array<string, \App\Models\User>      $users
     */
    private function seedNotifications(array $cases, array $users): void
    {
        $targets = [
            'admin_review' => ['type' => 'case.sent_to_admin_review', 'role' => 'admin',      'msg' => 'has been sent for admin review.'],
            'billing'      => ['type' => 'case.sent_to_billing',      'role' => 'billing',    'msg' => 'is ready for billing.'],
            'in_progress'  => ['type' => 'case.in_progress',          'role' => 'operations', 'msg' => 'is in progress.'],
            'closed'       => ['type' => 'case.closed',               'role' => 'owner',      'msg' => 'has been closed.'],
        ];

        foreach ($cases as $case) {
            if (! isset($targets[$case->case_status])) {
                continue;
            }

            $t = $targets[$case->case_status];

            Notification::create([
                'type'    => $t['type'],
                'message' => 'Case ' . $case->case_number . ' ' . $t['msg'],
                'case_id' => $case->id,
                'user_id' => $users[$t['role']]->id,
                'read'    => $case->case_status === 'closed',
            ]);
        }
    }

    /**
     * Audit log trail for the seeded cases.
     *
     * @param  array<int, \App\Models\MedicalCase>  $cases
     * @param  array<string, \App\Models\User>      $users
     */
    private function seedAuditLogs(array $cases, array $users): void
    {
        foreach ($cases as $case) {
            // Creation entry by the booking user.
            AuditLog::create([
                'user_id'        => $users['booking']->id,
                'action'         => 'case.created',
                'auditable_type' => MedicalCase::class,
                'auditable_id'   => $case->id,
                'changes'        => [
                    'case_type'   => $case->case_type,
                    'case_status' => 'booked',
                ],
                'description'    => 'Case ' . $case->case_number . ' created.',
            ]);

            // Workflow transition entries depending on where the case got to.
            $transitions = [];

            if (in_array($case->case_status, ['in_progress', 'admin_review', 'billing', 'closed'], true)) {
                $transitions[] = ['operations', 'case.sent_to_operations', 'operations', 'moved to operations.'];
            }
            if (in_array($case->case_status, ['admin_review', 'billing', 'closed'], true)) {
                $transitions[] = ['operations', 'case.sent_to_admin_review', 'admin_review', 'sent for admin review.'];
            }
            if (in_array($case->case_status, ['billing', 'closed'], true)) {
                $transitions[] = ['admin', 'case.sent_to_billing', 'billing', 'sent to billing.'];
            }
            if ($case->case_status === 'closed') {
                $transitions[] = ['admin', 'case.closed', 'closed', 'case closed.'];
            }

            foreach ($transitions as [$role, $action, $stage, $desc]) {
                AuditLog::create([
                    'user_id'        => $users[$role]->id,
                    'action'         => $action,
                    'auditable_type' => MedicalCase::class,
                    'auditable_id'   => $case->id,
                    'changes'        => ['workflow_stage' => $stage],
                    'description'    => 'Case ' . $case->case_number . ' ' . $desc,
                ]);
            }
        }
    }
}
