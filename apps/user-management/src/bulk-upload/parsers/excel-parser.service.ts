import { Readable } from 'stream';
import { Injectable } from '@nestjs/common';
import { Workbook, Worksheet } from 'exceljs';
import { Gender } from '../../users/schemas/user.schema';

interface ColumnDef {
  header: string;
  field: string;
  must: boolean;
}

// Verbatim mapping from spec §6 — do not invent different column names.
const COLUMN_MAP: ColumnDef[] = [
  { header: 'Registration No', field: 'studentDetails.registrationNo', must: true },
  { header: 'Username', field: 'username', must: false },
  { header: 'Name With Initials', field: 'nameWithInitials', must: true },
  { header: 'Full Name', field: 'fullName', must: true },
  { header: 'NIC', field: 'nic', must: true },
  { header: 'Title', field: 'title', must: false },
  { header: 'Gender', field: 'gender', must: false },
  { header: 'DOB', field: 'dateOfBirth', must: false },
  { header: 'Permanent address', field: 'permanentAddress', must: true },
  { header: 'home telephone', field: 'homeTelephoneNo', must: false },
  { header: 'Mobile', field: 'mobileNo', must: false },
  { header: 'AL Index Number', field: 'studentDetails.alIndexNumber', must: false },
  { header: 'Z-Score', field: 'studentDetails.zScore', must: false },
  { header: 'Medium', field: 'studentDetails.medium', must: false },
  { header: 'Category (Merit - District)', field: 'studentDetails.meritCategory', must: false },
  { header: 'District-No.', field: 'studentDetails.districtNo', must: false },
  { header: 'Religion-No.', field: 'studentDetails.religionNo', must: false },
  { header: 'Ethnicity-No.', field: 'studentDetails.ethnicityNo', must: false },
];

const HEADER_ROW = 1;
const FIRST_DATA_ROW = 4;
const REGISTRATION_NO_RE = /^\d{6}[A-Za-z]$/;
const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ParsedStudentRow {
  rowNumber: number;
  username: string | null;
  nameWithInitials: string;
  fullName: string;
  nic: string;
  title?: string;
  gender?: Gender;
  dateOfBirth?: string;
  permanentAddress: string;
  homeTelephoneNo?: string;
  mobileNo?: string;
  studentDetails: {
    registrationNo: string;
    alIndexNumber?: string;
    zScore?: number;
    medium?: string;
    meritCategory?: string;
    districtNo?: string;
    religionNo?: string;
    ethnicityNo?: string;
  };
}

export interface ParseResult {
  rows: ParsedStudentRow[];
  rowErrors: string[];
  attemptedRowCount: number;
}

@Injectable()
export class ExcelParserService {
  async parse(file: Express.Multer.File): Promise<ParseResult> {
    const worksheet = await this.loadWorksheet(file);
    if (!worksheet) {
      return { rows: [], rowErrors: ['File could not be read as .xlsx or .csv'], attemptedRowCount: 0 };
    }

    const columnIndex = this.matchHeaders(worksheet);
    const missingMustHeaders = COLUMN_MAP.filter((c) => c.must && !columnIndex.has(c.header));
    if (missingMustHeaders.length > 0) {
      return {
        rows: [],
        rowErrors: [
          `Missing required column(s): ${missingMustHeaders.map((c) => c.header).join(', ')}`,
        ],
        attemptedRowCount: 0,
      };
    }

    const rows: ParsedStudentRow[] = [];
    const rowErrors: string[] = [];
    let attemptedRowCount = 0;

    for (let rowNumber = FIRST_DATA_ROW; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      if (row.actualCellCount === 0) continue; // skip blank trailing rows
      attemptedRowCount++;

      const errorsBefore = rowErrors.length;
      const parsed = this.parseRow(row, rowNumber, columnIndex, rowErrors);
      if (rowErrors.length === errorsBefore) rows.push(parsed);
    }

    return { rows, rowErrors, attemptedRowCount };
  }

  private async loadWorksheet(file: Express.Multer.File): Promise<Worksheet | undefined> {
    const isCsv =
      file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv');

    if (isCsv) {
      const workbook = new Workbook();
      return workbook.csv.read(Readable.from(file.buffer));
    }

    // exceljs's index.d.ts is a module file that locally shadows `Buffer` with
    // its own minimal `extends ArrayBuffer` shape — a different, unnameable
    // type from here, so a same-name cast can't satisfy it. `any` bypasses the
    // check entirely rather than re-asserting a type that gets re-verified.
    const workbook = new Workbook();
    await workbook.xlsx.load(file.buffer as any);
    return workbook.worksheets[0];
  }

  private matchHeaders(worksheet: Worksheet): Map<string, number> {
    const index = new Map<string, number>();
    const headerRow = worksheet.getRow(HEADER_ROW);
    const byLowerHeader = new Map(COLUMN_MAP.map((c) => [c.header.toLowerCase(), c.header]));

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = String(cell.text ?? '').trim().toLowerCase();
      const matched = byLowerHeader.get(text);
      if (matched) index.set(matched, colNumber);
    });

    return index;
  }

  private parseRow(
    row: import('exceljs').Row,
    rowNumber: number,
    columnIndex: Map<string, number>,
    rowErrors: string[],
  ): ParsedStudentRow {
    const cellText = (header: string): string => {
      const col = columnIndex.get(header);
      if (!col) return '';
      return String(row.getCell(col).text ?? '').trim();
    };

    for (const col of COLUMN_MAP) {
      if (col.must && !cellText(col.header)) {
        rowErrors.push(`Row ${rowNumber}: missing required value for "${col.header}"`);
      }
    }

    const registrationNo = cellText('Registration No');
    if (registrationNo && !REGISTRATION_NO_RE.test(registrationNo)) {
      rowErrors.push(`Row ${rowNumber}: Registration No "${registrationNo}" must be 6 digits + 1 letter`);
    }

    const dobRaw = cellText('DOB');
    if (dobRaw && !DOB_RE.test(dobRaw)) {
      rowErrors.push(`Row ${rowNumber}: DOB "${dobRaw}" must be in yyyy-mm-dd format`);
    }

    const zScoreRaw = cellText('Z-Score');
    let zScore: number | undefined;
    if (zScoreRaw) {
      zScore = Number(zScoreRaw);
      if (Number.isNaN(zScore)) {
        rowErrors.push(`Row ${rowNumber}: Z-Score "${zScoreRaw}" is not numeric`);
        zScore = undefined;
      }
    }

    const genderRaw = cellText('Gender').toUpperCase();
    let gender: Gender | undefined;
    if (genderRaw === 'M') gender = 'Male';
    else if (genderRaw === 'F') gender = 'Female';
    else if (genderRaw) rowErrors.push(`Row ${rowNumber}: Gender "${genderRaw}" must be M or F`);

    return {
      rowNumber,
      username: cellText('Username') || null,
      nameWithInitials: cellText('Name With Initials'),
      fullName: cellText('Full Name'),
      nic: cellText('NIC'),
      title: cellText('Title') || undefined,
      gender,
      dateOfBirth: dobRaw || undefined,
      permanentAddress: cellText('Permanent address'),
      homeTelephoneNo: cellText('home telephone') || undefined,
      mobileNo: cellText('Mobile') || undefined,
      studentDetails: {
        registrationNo,
        alIndexNumber: cellText('AL Index Number') || undefined,
        zScore,
        medium: cellText('Medium') || undefined,
        meritCategory: cellText('Category (Merit - District)') || undefined,
        districtNo: cellText('District-No.') || undefined,
        religionNo: cellText('Religion-No.') || undefined,
        ethnicityNo: cellText('Ethnicity-No.') || undefined,
      },
    };
  }
}
