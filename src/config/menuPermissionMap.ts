/**
 * MENU PERMISSION MAP
 *
 * Estrutura em árvore que ESPELHA o menu real (AppSidebar + AppNavbar).
 * Cada folha aponta para o `module` agregado já utilizado pelo enforcement
 * (Can, usePermissions.hasModuleAccess, useFirstAllowedRoute). Várias
 * folhas podem compartilhar o mesmo módulo — é o comportamento intencional
 * herdado do `aliasMap` em `src/hooks/usePermissions.ts`.
 *
 * Toggles na UI gravam diretamente em `profile_type_permissions` no módulo
 * mapeado. Para granularidade fina (folha individual) usa-se a tabela
 * `profile_type_feature_overrides` (criada na migration desta entrega) que
 * fica disponível como extensão futura sem alterar enforcement existente.
 */

export type MenuModule =
  | 'dashboard'
  | 'dashboard_executivo'
  | 'comercial'
  | 'operacional'
  | 'producao'
  | 'financeiro'
  | 'cadastros_financeiros'
  | 'cadastros'
  | 'controladoria'
  | 'planejamento'
  | 'relatorios_bi'
  | 'configuracoes'
  | 'estoque'
  | 'pedidos'
  | 'gestao_usuarios'
  | 'fornecedores';

export interface MenuLeaf {
  key: string;          // feature_key estável (rota normalizada)
  label: string;        // texto exibido (igual ao menu)
  module: MenuModule;   // módulo agregado para enforcement
  ownerOnly?: boolean;  // raiz/folha só visível para Owner
}

export interface MenuRoot {
  key: string;
  label: string;
  ownerOnly?: boolean;
  leaves: MenuLeaf[];
}

export const MENU_PERMISSION_MAP: MenuRoot[] = [
  {
    key: 'hoje',
    label: 'Hoje',
    leaves: [
      { key: '/central-navegacao', label: 'Central de Navegação', module: 'dashboard' },
      { key: '/control-tower', label: 'Control Tower', module: 'dashboard_executivo' },
      { key: '/executive', label: 'Executive Center', module: 'dashboard_executivo' },
    ],
  },
  {
    key: 'comercial',
    label: 'Comercial',
    leaves: [
      { key: '/crm', label: 'CRM', module: 'comercial' },
      { key: '/pedidos', label: 'Pedidos', module: 'pedidos' },
      { key: '/contatos', label: 'Contatos (Clientes / Fornecedores / Ambos)', module: 'comercial' },
      { key: '/catalogo', label: 'Catálogo de Produtos', module: 'comercial' },
      { key: '/comissoes', label: 'Comissões', module: 'comercial' },
    ],
  },
  {
    key: 'operacoes',
    label: 'Operações',
    leaves: [
      { key: '/producao-operacoes', label: 'Produção', module: 'operacional' },
      { key: '/producao', label: 'Produção (legado)', module: 'producao' },
      { key: '/automacoes', label: 'Automações', module: 'operacional' },
      { key: '/suprimentos', label: 'Suprimentos / Compras', module: 'operacional' },
      { key: '/estoque', label: 'Estoque', module: 'estoque' },
      { key: '/entregas-montagem', label: 'Entregas & Montagem', module: 'operacional' },
      { key: '/relatorios', label: "KPI's Operacionais", module: 'operacional' },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    leaves: [
      { key: '/financeiro', label: 'Tesouraria', module: 'financeiro' },
      { key: '/financeiro/rh-pj', label: 'RH / PJ', module: 'financeiro' },
      { key: '/contas-receber', label: 'Contas a Receber', module: 'financeiro' },
      { key: '/contas-pagar', label: 'Contas a Pagar', module: 'financeiro' },
      { key: '/conciliacao', label: 'Conciliação Bancária', module: 'financeiro' },
      { key: '/dre', label: 'DRE Gerencial', module: 'financeiro' },
      { key: '/fluxo-caixa', label: 'Fluxo de Caixa', module: 'financeiro' },
      { key: '/resultado-financeiro', label: 'Forecast Financeiro', module: 'financeiro' },
      { key: '/planning', label: 'Metas Financeiras', module: 'planejamento' },
      { key: '/cadastros-financeiros?tab=chart', label: 'Plano de Contas', module: 'cadastros_financeiros' },
      { key: '/cadastros-financeiros?tab=cost-centers', label: 'Centros de Custo', module: 'cadastros_financeiros' },
      { key: '/cadastros-financeiros?tab=projects', label: 'Projetos', module: 'cadastros_financeiros' },
      { key: '/cadastros-financeiros?tab=fees', label: 'Taxas', module: 'cadastros_financeiros' },
      { key: '/cadastros-financeiros?tab=bank-accounts', label: 'Contas Bancárias', module: 'cadastros_financeiros' },
    ],
  },
  {
    key: 'kpis',
    label: "KPI's & BI",
    leaves: [
      { key: '/dashboard', label: 'Dashboard Executivo', module: 'dashboard_executivo' },
      { key: '/dashboards-personalizados', label: 'Dashboards Personalizados', module: 'relatorios_bi' },
      { key: '/benchmarking', label: 'Benchmarking', module: 'relatorios_bi' },
    ],
  },
  {
    key: 'pessoas',
    label: 'Pessoas',
    leaves: [
      { key: '/rh', label: 'RH & Colaboradores', module: 'configuracoes' },
      { key: '/settings/users', label: 'Usuários', module: 'configuracoes' },
      { key: '/governanca', label: 'Permissões', module: 'configuracoes' },
      { key: '/smart-onboarding', label: 'Smart Onboarding', module: 'configuracoes' },
    ],
  },
  {
    key: 'estrategia',
    label: 'Estratégia',
    leaves: [
      { key: '/ai-decision', label: 'Decision Assistant', module: 'dashboard_executivo' },
      { key: '/education', label: 'Educação & Trilhas', module: 'configuracoes' },
      { key: '/auditoria', label: 'Auditoria', module: 'controladoria' },
    ],
  },
  {
    key: 'sistema',
    label: 'Sistema',
    leaves: [
      { key: '/settings', label: 'Configurações', module: 'configuracoes' },
      { key: '/settings/integracoes', label: 'Integrações', module: 'configuracoes' },
      { key: '/settings/logs', label: 'Logs do Sistema', module: 'configuracoes' },
    ],
  },
  // ---- Seções exclusivas do Owner ----
  {
    key: 'owner_operacao',
    label: 'Owner · Operação',
    ownerOnly: true,
    leaves: [
      { key: '/owner/control-tower', label: 'Owner Control Tower', module: 'dashboard_executivo', ownerOnly: true },
      { key: '/owner/execution-priority', label: 'Execution Priority', module: 'dashboard_executivo', ownerOnly: true },
    ],
  },
  {
    key: 'owner_receita',
    label: 'Owner · Receita & Clientes',
    ownerOnly: true,
    leaves: [
      { key: '/owner/billing-ops', label: 'Billing Ops', module: 'configuracoes', ownerOnly: true },
      { key: '/billing', label: 'Billing & Subscriptions', module: 'configuracoes', ownerOnly: true },
      { key: '/owner/upgrade-center', label: 'Upgrade Center', module: 'configuracoes', ownerOnly: true },
      { key: '/customer-lifecycle', label: 'Customer Lifecycle', module: 'configuracoes', ownerOnly: true },
    ],
  },
  {
    key: 'owner_admin',
    label: 'Owner · Administração',
    ownerOnly: true,
    leaves: [
      { key: '/super-admin', label: 'Painel Owner', module: 'configuracoes', ownerOnly: true },
      { key: '/owner/admin', label: 'Smart Admin', module: 'configuracoes', ownerOnly: true },
      { key: '/owner/permission-debug', label: 'Permission Debug', module: 'configuracoes', ownerOnly: true },
    ],
  },
];

/** Lista de módulos únicos referenciados pela árvore (para validação). */
export const ALL_TREE_MODULES: MenuModule[] = Array.from(
  new Set(MENU_PERMISSION_MAP.flatMap(r => r.leaves.map(l => l.module))),
) as MenuModule[];

/** Folhas agrupadas por módulo (para mostrar "compartilhado com X"). */
export function leavesByModule(): Record<string, MenuLeaf[]> {
  const out: Record<string, MenuLeaf[]> = {};
  MENU_PERMISSION_MAP.forEach(root => {
    root.leaves.forEach(leaf => {
      (out[leaf.module] ||= []).push(leaf);
    });
  });
  return out;
}
