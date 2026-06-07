/**
 * MENU PERMISSION MAP
 *
 * Estrutura em árvore que ESPELHA o menu real (AppSidebar + AppNavbar).
 * Cada folha aponta para:
 *   - `key`      → feature_key estável (rota/aba) usada como chave nos overrides
 *   - `module`   → módulo agregado (baseline/fallback do enforcement)
 *
 * Enforcement: `hasAccess(module, feature_key, action)` consulta o override
 * por feature_key primeiro; cai para o módulo se não houver registro.
 * Backfill é automático: usuário sem overrides herda 100% das permissões
 * de módulo que já tinha.
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
  module: MenuModule;   // módulo agregado (baseline)
  ownerOnly?: boolean;
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
      { key: '/central-navegacao',  label: 'Central de Navegação', module: 'dashboard' },
      { key: '/control-tower',      label: 'Control Tower',         module: 'dashboard_executivo', ownerOnly: true },
      { key: '/executive',          label: 'Executive Center',      module: 'dashboard_executivo', ownerOnly: true },
    ],
  },
  {
    key: 'comercial',
    label: 'Comercial',
    leaves: [
      { key: '/pedidos',            label: 'Pedidos',                          module: 'pedidos' },
      { key: '/contatos',           label: 'Clientes / Fornecedores (Contatos)', module: 'comercial' },
      { key: '/crm',                label: 'CRM',                              module: 'comercial' },
      { key: '/catalogo',           label: 'Catálogo de Produtos',             module: 'comercial' },
      
    ],
  },
  {
    key: 'operacao',
    label: 'Operação',
    leaves: [
      { key: '/producao-operacoes', label: 'Produção',              module: 'operacional' },
      { key: '/entregas-montagem',  label: 'Entregas & Montagem',   module: 'operacional' },
      { key: '/compras',            label: 'Compras',               module: 'operacional' },
      { key: '/estoque',            label: 'Estoque',               module: 'estoque' },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    leaves: [
      { key: '/dre',                label: 'DRE',                              module: 'financeiro' },
      { key: '/fluxo-caixa',        label: 'Fluxo de Caixa',                   module: 'financeiro' },
      { key: '/contas-pagar',       label: 'Contas a Pagar',                   module: 'financeiro' },
      { key: '/contas-receber',     label: 'Contas a Receber',                 module: 'financeiro' },
      { key: '/financeiro/rh-pj',   label: 'RH / PJ',                          module: 'financeiro' },
      { key: '/financeiro/compromissos-venda', label: 'Compromissos sobre Venda', module: 'financeiro' },
      { key: '/financeiro',         label: 'Tesouraria',                       module: 'financeiro' },
      { key: '/conciliacao',        label: 'Conciliação Bancária',             module: 'financeiro' },
      { key: '/configuracoes/financeiro/contas-bancarias',  label: 'Contas Bancárias (Open Finance)', module: 'cadastros_financeiros' },
      { key: '/resultado-financeiro', label: 'Forecast Financeiro',            module: 'financeiro' },
      { key: '/planning',           label: 'Metas Financeiras',                module: 'planejamento' },
    ],
  },
  {
    key: 'kpis',
    label: "KPI's & BI",
    leaves: [
      { key: '/dashboard',                   label: 'Dashboard Executivo',     module: 'dashboard_executivo' },
      { key: '/dashboards-personalizados',   label: 'Dashboards Personalizados', module: 'relatorios_bi' },
    ],
  },
  {
    key: 'pessoas',
    label: 'Pessoas',
    leaves: [
      { key: '/rh',                 label: 'RH & Colaboradores',  module: 'configuracoes' },
      { key: '/smart-onboarding',   label: 'Smart Onboarding',    module: 'configuracoes' },
    ],
  },
  {
    key: 'estrategia',
    label: 'Estratégia',
    leaves: [
      
      { key: '/education',          label: 'Educação & Trilhas',  module: 'configuracoes' },
      
    ],
  },
  {
    key: 'configuracoes',
    label: 'Configurações',
    leaves: [
      // Usuários & Permissões
      { key: '/settings/users',     label: 'Usuários & Permissões', module: 'configuracoes' },
      { key: '/governanca',         label: 'Governança de Acesso',  module: 'configuracoes' },
      // Marca & Catálogo
      { key: '/settings?tab=brand', label: 'Marca & Catálogo',      module: 'configuracoes' },
      // Financeiro (sub-cadastros)
      { key: '/cadastros-financeiros?tab=chart',         label: 'Plano de Contas',          module: 'cadastros_financeiros' },
      { key: '/cadastros-financeiros?tab=cost-centers',  label: 'Centros de Custo',         module: 'cadastros_financeiros' },
      { key: '/cadastros-financeiros?tab=projects',      label: 'Projetos',                 module: 'cadastros_financeiros' },
      { key: '/cadastros-financeiros?tab=fees',          label: 'Taxas',                    module: 'cadastros_financeiros' },
      { key: '/cadastros-financeiros?tab=bank-accounts', label: 'Contas Bancárias',         module: 'cadastros_financeiros' },
      { key: '/cadastros-financeiros?tab=commitments',   label: 'Compromissos sobre Venda (config)', module: 'cadastros_financeiros' },
      // Sistema
      { key: '/settings',           label: 'Configurações Gerais',  module: 'configuracoes' },
      { key: '/settings/integracoes', label: 'Integrações',         module: 'configuracoes' },
      { key: '/settings/logs',      label: 'Logs do Sistema',       module: 'configuracoes' },
    ],
  },
  // ---- Seções exclusivas do Owner ----
  {
    key: 'owner_operacao',
    label: 'Owner · Operação',
    ownerOnly: true,
    leaves: [
      { key: '/owner/control-tower',       label: 'Owner Control Tower',  module: 'dashboard_executivo', ownerOnly: true },
    ],
  },
  {
    key: 'owner_receita',
    label: 'Owner · Receita & Clientes',
    ownerOnly: true,
    leaves: [
      { key: '/owner/billing-ops',     label: 'Billing Ops',            module: 'configuracoes', ownerOnly: true },
      { key: '/billing',               label: 'Billing & Subscriptions', module: 'configuracoes', ownerOnly: true },
      { key: '/owner/upgrade-center',  label: 'Upgrade Center',          module: 'configuracoes', ownerOnly: true },
      { key: '/customer-lifecycle',    label: 'Customer Lifecycle',      module: 'configuracoes', ownerOnly: true },
    ],
  },
  {
    key: 'owner_admin',
    label: 'Owner · Administração',
    ownerOnly: true,
    leaves: [
      { key: '/super-admin',           label: 'Painel Owner',       module: 'configuracoes', ownerOnly: true },
      { key: '/owner/admin',           label: 'Smart Admin',        module: 'configuracoes', ownerOnly: true },
    ],
  },
];

export const ALL_TREE_MODULES: MenuModule[] = Array.from(
  new Set(MENU_PERMISSION_MAP.flatMap(r => r.leaves.map(l => l.module))),
) as MenuModule[];

/** Encontra a folha exata por feature_key (rota). */
export function findLeafByKey(featureKey: string): MenuLeaf | null {
  for (const root of MENU_PERMISSION_MAP) {
    const leaf = root.leaves.find(l => l.key === featureKey);
    if (leaf) return leaf;
  }
  return null;
}

/** Lista todos os feature_keys. */
export function allFeatureKeys(includeOwnerOnly = true): string[] {
  return MENU_PERMISSION_MAP
    .filter(r => includeOwnerOnly || !r.ownerOnly)
    .flatMap(r => r.leaves.filter(l => includeOwnerOnly || !l.ownerOnly).map(l => l.key));
}
