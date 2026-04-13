/**
 * Configuração centralizada de status financeiros
 * Garante consistência entre Contas a Pagar, Contas a Receber, Razão e BI
 */

// =============================================
// STATUS PAYABLES (Contas a Pagar)
// =============================================
export const PAYABLE_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'outline' | 'secondary' | 'destructive'; className?: string }> = {
  ABERTO: { label: 'Aberto', variant: 'outline' },
  PROVISIONADO: { label: 'Provisionado', variant: 'outline', className: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  CONFIRMADO: { label: 'Confirmado', variant: 'outline', className: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  VENCIDO: { label: 'Vencido', variant: 'destructive' },
  PARCIALMENTE_PAGO: { label: 'Parcial', variant: 'secondary', className: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  PAGO: { label: 'Pago', variant: 'default', className: 'bg-green-600' },
  CONCILIADO: { label: 'Conciliado', variant: 'default', className: 'bg-emerald-700' },
  EM_DISPUTA: { label: 'Em Disputa', variant: 'secondary', className: 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-400' },
  RENEGOCIADO: { label: 'Renegociado', variant: 'secondary', className: 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-400' },
  CANCELADO: { label: 'Cancelado', variant: 'destructive', className: 'bg-gray-500' },
};

// =============================================
// STATUS RECEIVABLES (Contas a Receber)
// =============================================
export const RECEIVABLE_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'outline' | 'secondary' | 'destructive'; className?: string }> = {
  ABERTO: { label: 'Aberto', variant: 'outline' },
  PROVISIONADO: { label: 'Provisionado', variant: 'outline', className: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  CONFIRMADO: { label: 'Confirmado', variant: 'outline', className: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  VENCIDO: { label: 'Vencido', variant: 'destructive' },
  PARCIALMENTE_RECEBIDO: { label: 'Parcial', variant: 'secondary', className: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  RECEBIDO: { label: 'Recebido', variant: 'default', className: 'bg-green-600' },
  CONCILIADO: { label: 'Conciliado', variant: 'default', className: 'bg-emerald-700' },
  EM_DISPUTA: { label: 'Em Disputa', variant: 'secondary', className: 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-400' },
  RENEGOCIADO: { label: 'Renegociado', variant: 'secondary', className: 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-400' },
  CANCELADO: { label: 'Cancelado', variant: 'destructive', className: 'bg-gray-500' },
};

// =============================================
// STATUS LEDGER (Livro Razão)
// =============================================
export const LEDGER_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'outline' | 'secondary' | 'destructive'; className?: string }> = {
  ABERTO: { label: 'Aberto', variant: 'outline' },
  VENCIDO: { label: 'Vencido', variant: 'destructive' },
  PAGO_RECEBIDO: { label: 'Realizado', variant: 'default', className: 'bg-green-600' },
  CONCILIADO: { label: 'Conciliado', variant: 'default', className: 'bg-emerald-700' },
  CANCELADO: { label: 'Cancelado', variant: 'destructive', className: 'bg-gray-500' },
};

// =============================================
// TRANSIÇÕES VÁLIDAS
// =============================================
export const PAYABLE_TRANSITIONS: Record<string, string[]> = {
  ABERTO: ['CONFIRMADO', 'PROVISIONADO', 'PAGO', 'CANCELADO'],
  PROVISIONADO: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['PAGO', 'PARCIALMENTE_PAGO', 'CANCELADO', 'EM_DISPUTA', 'RENEGOCIADO'],
  VENCIDO: ['PAGO', 'PARCIALMENTE_PAGO', 'CANCELADO', 'EM_DISPUTA', 'RENEGOCIADO'],
  PARCIALMENTE_PAGO: ['PAGO', 'CANCELADO', 'EM_DISPUTA'],
  PAGO: ['CONCILIADO', 'ABERTO'],
  EM_DISPUTA: ['CONFIRMADO', 'CANCELADO', 'PAGO'],
  RENEGOCIADO: ['CONFIRMADO', 'CANCELADO'],
  CANCELADO: ['PROVISIONADO'],
  CONCILIADO: [],
};

export const RECEIVABLE_TRANSITIONS: Record<string, string[]> = {
  ABERTO: ['CONFIRMADO', 'PROVISIONADO', 'RECEBIDO', 'CANCELADO'],
  PROVISIONADO: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['RECEBIDO', 'PARCIALMENTE_RECEBIDO', 'CANCELADO', 'EM_DISPUTA', 'RENEGOCIADO'],
  VENCIDO: ['RECEBIDO', 'PARCIALMENTE_RECEBIDO', 'CANCELADO', 'EM_DISPUTA', 'RENEGOCIADO'],
  PARCIALMENTE_RECEBIDO: ['RECEBIDO', 'CANCELADO', 'EM_DISPUTA'],
  RECEBIDO: ['CONCILIADO', 'ABERTO'],
  EM_DISPUTA: ['CONFIRMADO', 'CANCELADO', 'RECEBIDO'],
  RENEGOCIADO: ['CONFIRMADO', 'CANCELADO'],
  CANCELADO: ['PROVISIONADO'],
  CONCILIADO: [],
};

// =============================================
// HELPERS
// =============================================

/** Status "realizados" que representam caixa efetivo */
export const PAYABLE_REALIZED_STATUSES = ['PAGO', 'CONCILIADO'];
export const RECEIVABLE_REALIZED_STATUSES = ['RECEBIDO', 'CONCILIADO'];
export const LEDGER_REALIZED_STATUSES = ['PAGO_RECEBIDO', 'CONCILIADO'];

/** Status que permitem edição */
export const PAYABLE_EDITABLE_STATUSES = ['ABERTO', 'PROVISIONADO', 'CONFIRMADO', 'VENCIDO', 'PARCIALMENTE_PAGO', 'EM_DISPUTA', 'RENEGOCIADO'];
export const RECEIVABLE_EDITABLE_STATUSES = ['ABERTO', 'PROVISIONADO', 'CONFIRMADO', 'VENCIDO', 'PARCIALMENTE_RECEBIDO', 'EM_DISPUTA', 'RENEGOCIADO'];

/** Verifica se o status é um status "aberto" (ainda não realizado) */
export function isOpenStatus(status: string): boolean {
  return ['ABERTO', 'PROVISIONADO', 'CONFIRMADO', 'VENCIDO', 'PARCIALMENTE_PAGO', 'PARCIALMENTE_RECEBIDO', 'EM_DISPUTA', 'RENEGOCIADO'].includes(status);
}

/** Verifica se o título está conciliado (travado) */
export function isConciliated(status: string): boolean {
  return status === 'CONCILIADO';
}

/** Retorna o status derivado baseado na data de vencimento */
export function getDerivedDueStatus(status: string, dueDate: string): 'a_vencer' | 'vencido' | null {
  if (!['ABERTO', 'PROVISIONADO', 'CONFIRMADO'].includes(status)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return due < today ? 'vencido' : 'a_vencer';
}

/** Lista de todos os status para filtros */
export const ALL_PAYABLE_STATUSES = [
  { value: 'ABERTO', label: 'Aberto' },
  { value: 'PROVISIONADO', label: 'Provisionado' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'PARCIALMENTE_PAGO', label: 'Parcialmente Pago' },
  { value: 'PAGO', label: 'Pago' },
  { value: 'CONCILIADO', label: 'Conciliado' },
  { value: 'EM_DISPUTA', label: 'Em Disputa' },
  { value: 'RENEGOCIADO', label: 'Renegociado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export const ALL_RECEIVABLE_STATUSES = [
  { value: 'ABERTO', label: 'Aberto' },
  { value: 'PROVISIONADO', label: 'Provisionado' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'PARCIALMENTE_RECEBIDO', label: 'Parcialmente Recebido' },
  { value: 'RECEBIDO', label: 'Recebido' },
  { value: 'CONCILIADO', label: 'Conciliado' },
  { value: 'EM_DISPUTA', label: 'Em Disputa' },
  { value: 'RENEGOCIADO', label: 'Renegociado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];
