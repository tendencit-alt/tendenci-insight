import { usePermissions } from '@/hooks/usePermissions';

// Mapeamento completo de módulos para rotas
export const routeMap: Record<string, string> = {
  'dashboard': '/',
  'leads': '/leads',
  'crm': '/kanban',
  'projetos': '/projects',
  'prospeccao': '/prospeccao',
  'arquitetos': '/prospeccao',
  'metas': '/metas',
  'configuracoes': '/settings',
  'ia_configuracao': '/ia-configuracao',
  'producao': '/producao',
  'pedidos': '/pedidos',
  'estoque': '/estoque',
  'compras': '/compras',
  'fornecedores': '/fornecedores',
  'gestao_usuarios': '/settings/users',
  'dashboards_personalizados': '/dashboards',
};

// Ordem de prioridade para redirecionamento
const routePriority = [
  'dashboard',
  'crm',
  'producao',
  'pedidos',
  'estoque',
  'prospeccao',
  'projetos',
  'leads',
  'metas',
  'fornecedores',
  'compras',
  'configuracoes',
  'ia_configuracao',
  'dashboards_personalizados',
  'gestao_usuarios',
];

export function useFirstAllowedRoute() {
  const { permissions, loading, isMaster } = usePermissions();
  
  if (loading) {
    return { route: null, loading: true };
  }
  
  // Masters/admins vão para BI/Dashboard
  if (isMaster) {
    return { route: '/bi-dashboard', loading: false };
  }
  
  // Encontrar primeiro módulo permitido na ordem de prioridade
  for (const mod of routePriority) {
    const perm = permissions?.permissions?.find(p => p.module === mod);
    if (perm?.can_view) {
      return { route: routeMap[mod] || '/', loading: false };
    }
  }
  
  // Se não encontrar nenhum, ir para auth
  return { route: '/auth', loading: false };
}

// Função helper para buscar primeira rota permitida baseada em permissões
export function getFirstAllowedRoute(
  userPermissions: Array<{ module: string; can_view: boolean }> | null | undefined,
  isMaster: boolean
): string {
  if (isMaster) return '/bi-dashboard';
  
  if (!userPermissions || userPermissions.length === 0) {
    return '/auth';
  }
  
  for (const mod of routePriority) {
    const perm = userPermissions.find(p => p.module === mod);
    if (perm?.can_view) {
      return routeMap[mod] || '/';
    }
  }
  
  return '/auth';
}
