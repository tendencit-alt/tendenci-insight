import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Parse a date string as LOCAL date, avoiding timezone shifts.
 * Use this instead of `new Date(str)` for date-only strings (YYYY-MM-DD)
 * coming from Postgres `date` columns, which otherwise get parsed as UTC
 * midnight and may render as the previous day in timezones west of UTC.
 */
export function parseDateLocal(value: string | Date | null | undefined): Date {
  if (!value) return new Date(NaN);
  if (value instanceof Date) return value;
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoDateOnly) {
    return new Date(Number(isoDateOnly[1]), Number(isoDateOnly[2]) - 1, Number(isoDateOnly[3]));
  }
  // For full timestamps or other formats, fall back to native parsing.
  return new Date(value);
}

// File validation constants and helpers
export const ALLOWED_FILE_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'xlsm', 'dwg', 'skp',
  'jpg', 'jpeg', 'png', 'webp', 'txt',
  'mp3', 'wav', 'm4a', 'webm', 'ogg',
  'mp4', 'mov', 'avi', 'mkv', 'wmv'
];

export const ALLOWED_FILE_TYPES_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.dwg,.skp,.jpg,.jpeg,.png,.webp,.txt,.mp3,.wav,.m4a,.webm,.ogg,.mp4,.mov,.avi,.mkv,.wmv';

// MIME types permitidos para upload
// CRÍTICO: application/octet-stream é necessário para arquivos .skp e .dwg que browsers não reconhecem
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12', // Excel com macros (.xlsm)
  'application/octet-stream', // CRÍTICO: browsers enviam .skp e .dwg como octet-stream
  'image/dwg',
  'image/x-dwg',
  'application/dwg',
  'application/x-dwg',
  'application/acad',
  'application/x-acad',
  'application/vnd.sketchup.skp', // SketchUp (.skp)
  'application/x-sketchup',
  'model/vnd.sketchup.skp',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'text/plain',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska', // .mkv
  'video/x-ms-wmv', // .wmv
  'video/webm',
  '' // Alguns browsers enviam MIME type vazio
];

export const MAX_FILE_SIZE_MB = 1024; // 1GB
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function validateFileType(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? ALLOWED_FILE_EXTENSIONS.includes(ext) : false;
}

export function validateFileSize(fileSize: number): boolean {
  return fileSize <= MAX_FILE_SIZE_BYTES;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
