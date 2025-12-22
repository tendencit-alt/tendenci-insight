/**
 * Utilitário para validação e formatação de números de WhatsApp brasileiros
 */

/**
 * Remove zeros à esquerda e caracteres não numéricos de um número de telefone
 */
export function cleanPhoneNumber(phone: string): string {
  // Remove todos os caracteres não numéricos
  let clean = phone.replace(/\D/g, '');
  
  // Remove zeros à esquerda
  while (clean.startsWith('0')) {
    clean = clean.substring(1);
  }
  
  return clean;
}

/**
 * Valida se um número de telefone brasileiro está em formato válido
 * Aceita formatos: 
 * - 11 dígitos: DDD + 9 + 8 dígitos (ex: 11999999999)
 * - 10 dígitos: DDD + 8 dígitos (ex: 1199999999) - será convertido para 11
 * - 13 dígitos: 55 + DDD + 9 + 8 dígitos (ex: 5511999999999)
 * - 12 dígitos: 55 + DDD + 8 dígitos (ex: 551199999999)
 */
export function validateBrazilianPhone(phone: string): { 
  valid: boolean; 
  error?: string;
  formatted: string;
} {
  const clean = cleanPhoneNumber(phone);
  
  if (!clean) {
    return { valid: false, error: 'Número não pode estar vazio', formatted: '' };
  }
  
  if (clean.length < 10) {
    return { valid: false, error: `Número muito curto (${clean.length} dígitos). Esperado: DDD + número`, formatted: clean };
  }
  
  if (clean.length > 13) {
    return { valid: false, error: `Número muito longo (${clean.length} dígitos)`, formatted: clean };
  }
  
  // Validar formato e extrair DDD
  let digits11 = clean;
  
  if (clean.length === 10) {
    // DDD + 8 dígitos → adicionar 9
    digits11 = clean.slice(0, 2) + '9' + clean.slice(2);
  } else if (clean.length === 11) {
    digits11 = clean;
  } else if (clean.length === 12 && clean.startsWith('55')) {
    // 55 + DDD + 8 dígitos → adicionar 9
    digits11 = clean.slice(2, 4) + '9' + clean.slice(4);
  } else if (clean.length === 13 && clean.startsWith('55')) {
    digits11 = clean.slice(2);
  } else if (clean.length === 12 || clean.length === 13) {
    // Formato não reconhecido
    return { 
      valid: false, 
      error: 'Formato não reconhecido. Use: DDD + número (ex: 11999999999)', 
      formatted: clean 
    };
  }
  
  // Validar DDD (11 a 99)
  const ddd = parseInt(digits11.slice(0, 2));
  if (ddd < 11 || ddd > 99) {
    return { valid: false, error: `DDD inválido: ${ddd}`, formatted: clean };
  }
  
  // Validar que o terceiro dígito é 9 (celular)
  if (digits11[2] !== '9') {
    return { valid: false, error: 'Número de celular deve começar com 9', formatted: clean };
  }
  
  return { valid: true, formatted: digits11 };
}

/**
 * Formata um número de telefone para envio via WhatsApp
 * Retorna o número no formato: 11999999999 (sem código do país)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const validation = validateBrazilianPhone(phone);
  return validation.formatted;
}

/**
 * Formata um número de telefone para exibição
 * Retorna: (11) 99999-9999
 */
export function formatPhoneForDisplay(phone: string): string {
  const clean = cleanPhoneNumber(phone);
  
  // Se tem 11 dígitos (DDD + 9 + 8)
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  
  // Se tem 10 dígitos (DDD + 8)
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  
  // Se tem 13 dígitos (55 + DDD + 9 + 8)
  if (clean.length === 13 && clean.startsWith('55')) {
    const withoutCountry = clean.slice(2);
    return `(${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 7)}-${withoutCountry.slice(7)}`;
  }
  
  // Retornar como está se não reconhecer
  return phone;
}

/**
 * Valida e formata número de WhatsApp para salvar no banco
 * Retorna o número limpo e formatado, ou null se inválido
 */
export function sanitizeWhatsAppNumber(phone: string): { number: string | null; error?: string } {
  if (!phone || !phone.trim()) {
    return { number: null };
  }
  
  const validation = validateBrazilianPhone(phone);
  
  if (!validation.valid) {
    return { number: null, error: validation.error };
  }
  
  return { number: validation.formatted };
}
