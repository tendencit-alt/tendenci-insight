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

// File validation constants and helpers
export const ALLOWED_FILE_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'xlsm', 'dwg', 'skp',
  'jpg', 'jpeg', 'png', 'webp', 'txt',
  'mp3', 'wav', 'm4a', 'webm', 'ogg'
];

export const ALLOWED_FILE_TYPES_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.dwg,.skp,.jpg,.jpeg,.png,.webp,.txt,.mp3,.wav,.m4a,.webm,.ogg';

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
