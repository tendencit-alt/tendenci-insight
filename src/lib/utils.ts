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
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'xlsm', 'dwg',
  'jpg', 'jpeg', 'png', 'webp', 'txt',
  'mp3', 'wav', 'm4a', 'webm', 'ogg'
];

export const ALLOWED_FILE_TYPES_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.dwg,.jpg,.jpeg,.png,.webp,.txt,.mp3,.wav,.m4a,.webm,.ogg';

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
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
