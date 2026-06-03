<?php

namespace App\Exports;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

/**
 * Builds a branded .xlsx for a management register, matching the MMA
 * spreadsheet layout: logo + company name + Reg No header, a shaded title bar,
 * grey column headers and a fully bordered table. Uses PhpSpreadsheet directly
 * (maatwebsite/excel isn't PHP 8.5 compatible).
 */
class RegisterExport
{
    /**
     * @param  string             $sheetTitle  e.g. "IN PATIENT MANAGEMENT REGISTER"
     * @param  array<int,string>  $columns     column headers
     * @param  array<int,array>   $rows        data rows (each an ordered array)
     * @param  string|null        $logoPath    absolute path to the logo image
     */
    public function __construct(
        protected string $sheetTitle,
        protected array $columns,
        protected array $rows,
        protected ?string $logoPath = null,
    ) {
    }

    public function build(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Register');

        $colCount = max(count($this->columns), 1);
        $lastCol = Coordinate::stringFromColumnIndex($colCount);

        // --- Branded header (rows 1–5) ---
        $sheet->mergeCells("C2:{$lastCol}2");
        $sheet->setCellValue('C2', 'Meridian Medical Assistance (Pty) Ltd');
        $sheet->mergeCells("C3:{$lastCol}3");
        $sheet->setCellValue('C3', 'Reg No: 2009/024614/07');
        $sheet->mergeCells("A5:{$lastCol}5");
        $sheet->setCellValue('A5', $this->sheetTitle);

        $sheet->getStyle('C2')->getFont()->setBold(true)->setSize(16)->getColor()->setRGB('9A7D2E');
        $sheet->getStyle('C2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('C3')->getFont()->setSize(10)->getColor()->setRGB('9A7D2E');
        $sheet->getStyle('C3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A5')->getFont()->setBold(true)->setSize(12);
        $sheet->getStyle('A5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A5')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('EDEDED');

        // --- Column headers (row 6) ---
        foreach ($this->columns as $i => $header) {
            $col = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->setCellValue("{$col}6", $header);
        }
        $headingRange = "A6:{$lastCol}6";
        $sheet->getStyle($headingRange)->getFont()->setBold(true);
        $sheet->getStyle($headingRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('D9D9D9');

        // --- Data rows (row 7+) ---
        $r = 7;
        foreach ($this->rows as $row) {
            $i = 1;
            foreach (array_values((array) $row) as $value) {
                $col = Coordinate::stringFromColumnIndex($i);
                $sheet->setCellValueExplicit("{$col}{$r}", (string) $value, DataType::TYPE_STRING);
                $i++;
            }
            $r++;
        }

        // --- Borders around the whole table ---
        $lastRow = 6 + count($this->rows);
        $sheet->getStyle("A6:{$lastCol}{$lastRow}")
            ->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        // --- Logo (top-left), if present ---
        if ($this->logoPath && is_file($this->logoPath)) {
            $drawing = new Drawing();
            $drawing->setName('MMA');
            $drawing->setPath($this->logoPath);
            $drawing->setHeight(72);
            $drawing->setCoordinates('A1');
            $drawing->setOffsetX(4);
            $drawing->setOffsetY(4);
            $drawing->setWorksheet($sheet);
        }

        $sheet->getRowDimension(1)->setRowHeight(58);
        for ($c = 1; $c <= $colCount; $c++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }

        return $spreadsheet;
    }
}
