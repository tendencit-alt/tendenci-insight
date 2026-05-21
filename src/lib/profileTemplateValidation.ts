// Shared validation for profile-type templates.
// Mirrors the backend function `public.validate_profile_template_completeness`.

export const REQUIRED_TEMPLATE_MODULES = [
  'dashboard_executivo',
  'comercial',
  'operacional',
  'financeiro',
  'controladoria',
  'planejamento',
  'cadastros',
  'relatorios_bi',
  'configuracoes',
] as const;

export const TEMPLATE_MODULE_LABELS: Record<string, string> = {
  dashboard_executivo: 'Dashboard Executivo',
  comercial: 'Comercial',
  operacional: 'Operacional',
  financeiro: 'Financeiro',
  controladoria: 'Controladoria',
  planejamento: 'Planejamento',
  cadastros: 'Cadastros',
  relatorios_bi: 'KPI's & BI',
  configuracoes: 'Configurações',
};

const FLAG_KEYS = [
  'can_view', 'can_create', 'can_edit', 'can_delete',
  'can_approve', 'can_conciliate', 'can_export', 'can_admin',
] as const;

export interface TemplateCompleteness {
  isComplete: boolean;
  missingModules: string[];   // não declarados no JSON
  emptyModules: string[];     // declarados mas sem nenhuma flag ativa
  noViewModules: string[];    // têm flags mas faltam can_view
  totalRequired: number;
  /** união de missing + empty + noView (módulos que precisam de atenção) */
  incompleteModules: string[];
}

export function validateTemplateCompleteness(
  perms: Record<string, Record<string, boolean>> | null | undefined
): TemplateCompleteness {
  const missing: string[] = [];
  const empty: string[] = [];
  const noView: string[] = [];

  for (const m of REQUIRED_TEMPLATE_MODULES) {
    const mod = perms?.[m];
    if (!mod || typeof mod !== 'object') {
      missing.push(m);
      continue;
    }
    const anyFlag = FLAG_KEYS.some(k => !!mod[k]);
    if (!anyFlag) {
      empty.push(m);
    } else if (!mod.can_view) {
      noView.push(m);
    }
  }

  const incomplete = [...missing, ...empty, ...noView];
  return {
    isComplete: incomplete.length === 0,
    missingModules: missing,
    emptyModules: empty,
    noViewModules: noView,
    totalRequired: REQUIRED_TEMPLATE_MODULES.length,
    incompleteModules: incomplete,
  };
}

export function describeTemplateGaps(result: TemplateCompleteness): string {
  if (result.isComplete) return 'Template completo: cobre todos os módulos.';
  const parts: string[] = [];
  if (result.missingModules.length)
    parts.push(`${result.missingModules.length} módulo(s) não declarado(s)`);
  if (result.emptyModules.length)
    parts.push(`${result.emptyModules.length} sem nenhuma permissão`);
  if (result.noViewModules.length)
    parts.push(`${result.noViewModules.length} sem permissão de visualização`);
  return parts.join(' • ');
}
