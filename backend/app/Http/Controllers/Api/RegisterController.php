<?php

namespace App\Http\Controllers\Api;

use App\Exports\RegisterExport;
use App\Http\Controllers\Controller;
use App\Models\MedicalCase;
use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RegisterController extends Controller
{
    /**
     * GET /api/registers/{type}/export
     * Download a branded .xlsx of the inpatient / outpatient / laboratory register.
     */
    public function export(string $type): StreamedResponse
    {
        abort_unless(in_array($type, ['inpatient', 'outpatient', 'laboratory'], true), 404);

        [$title, $headings, $rows, $filename] = $this->build($type);

        $spreadsheet = (new RegisterExport($title, $headings, $rows, $this->logoPath()))->build();
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(
            function () use ($writer) {
                $writer->save('php://output');
            },
            $filename,
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        );
    }

    /**
     * Build [title, headings, rows, filename] for the requested register,
     * mapping the columns exactly to the MMA spreadsheet layouts.
     *
     * @return array{0:string,1:array<int,string>,2:array<int,array>,3:string}
     */
    private function build(string $type): array
    {
        return match ($type) {
            'inpatient' => $this->inpatient(),
            'outpatient' => $this->outpatient(),
            'laboratory' => $this->laboratory(),
        };
    }

    private function inpatient(): array
    {
        $cases = MedicalCase::with(['patient', 'inpatientDetail'])
            ->where('case_type', 'inpatient')
            ->orderBy('date_opened')
            ->get();

        $rows = $cases->map(function (MedicalCase $c) {
            $d = $c->inpatientDetail;
            return [
                $this->date($c->date_opened),
                $c->file_number ?? ($d->file_number ?? ''),
                $this->patientName($c),
                $this->date($d->admission_date ?? null),
                $this->date($d->discharge_date ?? null),
                $this->date($d->date_to_admin ?? null),
                $this->yesNo($d->mr_requested ?? false),
                $this->yesNo($d->mr_received ?? false),
                $this->date($d->admin_closure_date ?? null),
                $this->date($d->submission_date ?? null),
                $this->date($d->date_pastel ?? null),
            ];
        })->all();

        return [
            'IN PATIENT MANAGEMENT REGISTER',
            ['File Date', 'File No', 'Name of Patient', 'Admission Date', 'Discharge Date', 'Date to Admin', 'MR Req', 'MR Rec', 'Admin Closure Date', 'Submission Date', 'Date Pastel'],
            $rows,
            'Inpatient-Management-Register.xlsx',
        ];
    }

    private function outpatient(): array
    {
        $cases = MedicalCase::with(['patient', 'outpatientDetail'])
            ->where('case_type', 'outpatient')
            ->orderBy('date_opened')
            ->get();

        $rows = $cases->map(function (MedicalCase $c) {
            $d = $c->outpatientDetail;
            return [
                $this->date($d->file_date ?? null),
                $c->file_number ?? ($d->file_number ?? ''),
                $this->patientName($c),
                $this->date($d->consult_date ?? null),
                $this->date($d->followup_date ?? null),
                $this->yesNo($d->ongoing_treatment ?? false),
                $this->date($d->date_to_admin ?? null),
                $this->yesNo($d->mr_requested ?? false),
                $this->yesNo($d->mr_received ?? false),
                $this->date($d->admin_closure_date ?? null),
                $this->date($d->submission_date ?? null),
                $this->date($d->date_pastel ?? null),
            ];
        })->all();

        return [
            'OUT PATIENT MANAGEMENT REGISTER',
            ['File Date', 'File No', 'Name of Patient', 'Consult Date', 'FU Date', 'Ongoing Treatment', 'Date to Admin', 'MR Req', 'MR Rec', 'Admin Closure Date', 'Date Submitted', 'Date Pastel'],
            $rows,
            'Outpatient-Management-Register.xlsx',
        ];
    }

    private function laboratory(): array
    {
        $cases = MedicalCase::with(['patient', 'laboratoryDetail'])
            ->where('case_type', 'laboratory')
            ->orderBy('date_opened')
            ->get();

        $rows = $cases->map(function (MedicalCase $c) {
            $d = $c->laboratoryDetail;
            $p = $c->patient;
            return [
                $p->surname ?? '',
                $p->first_name ?? '',
                $this->date($p->date_of_birth ?? null),
                $c->file_number ?? ($p->mma_file_number ?? ''),
                $this->date($d->appointment_date ?? null),
                $c->treating_doctor ?? ($d->treating_doctor ?? ''),
                $d->area ?? '',
                $this->date($d->date_registered ?? null),
            ];
        })->all();

        return [
            'LABORATORY AND PATHOLOGY OUT PATIENT INVOICE REQUEST',
            ['Surname', 'Name', 'DOB', 'MMA File', 'Date of Appointment', 'Treating Doctor', 'Area', 'Date Req'],
            $rows,
            'Laboratory-Outpatient-Request.xlsx',
        ];
    }

    /**
     * Resolve the MMA logo from the first location it exists in. Saving the
     * logo to frontend/public/mma-logo.png makes it appear in both the
     * print/PDF header and the Excel export.
     */
    private function logoPath(): ?string
    {
        $candidates = [
            storage_path('app/branding/mma-logo.png'),
            base_path('../frontend/public/mma-logo.png'),
        ];

        foreach ($candidates as $path) {
            if (is_file($path)) {
                return $path;
            }
        }

        return null;
    }

    private function patientName(MedicalCase $c): string
    {
        return $c->patient
            ? trim(($c->patient->first_name ?? '') . ' ' . ($c->patient->surname ?? ''))
            : '';
    }

    private function date($value): string
    {
        if (! $value) {
            return '';
        }

        try {
            return Carbon::parse($value)->format('d/m/Y');
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    private function yesNo($value): string
    {
        return $value ? 'Yes' : 'No';
    }
}
