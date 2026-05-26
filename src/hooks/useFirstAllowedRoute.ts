import { usePermissions } from '@/hooks/usePermissions';

// Mapeamento de módulos ativos para rotas
export const routeMap: Record<string, string> = {
  'dashboard': '/bi-dashboard',
  'pedidos': '/pedidos',
  'producao': '/producao',
  'financeiro': '/financeiro',
  'fornecedores': '/fornecedores',
  'estoque': '/estoque',
  'cadastros_financeiros': '/cadastros-financeiros',
  'configuracoes': '/settings',
  'gestao_usuarios': '/settings/users',
};

// Ordem de prioridade para redirecionamento
const routePriority = [
  'dashboard',
  'pedidos',
  'producao',
  'financeiro',
  'fornecedores',
  'estoque',
  'cadastros_financeiros',
  'configuracoes',
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
  
  // Sem módulo permitido: cair no Home Launcher (evita loop ao redirecionar para /auth)
  return { route: '/', loading: false };
}

// Função helper para buscar primeira rota permitida baseada em permissões
export function getFirstAllowedRoute(
  userPermissions: Array<{ module: string; can_view: boolean }> | null | undefined,
  isMaster: boolean
): string {
  if (isMaster) return '/bi-dashboard';

  if (!userPermissions || userPermissions.length === 0) {
    return '/';
  }

  for (const mod of routePriority) {
    const perm = userPermissions.find(p => p.module === mod);
    if (perm?.can_view) {
      return routeMap[mod] || '/';
    }
  }

  return '/';
}
