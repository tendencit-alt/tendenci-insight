import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useNavigationUsage } from "./useNavigationUsage";

// ── Contextual action map: route → suggested next actions ──
const CONTEXTUAL_ACTIONS: Record<string, { label: string; route: string; reason: string }[]> = {
  "/financeiro": [
    { label: "Conciliar Extrato", route: "/financeiro?tab=reconciliation", reason: "Conferir lançamentos bancários" },
    { label: "Ver Fluxo de Caixa", route: "/bi-dashboard", reason: "Verificar projeção de caixa" },
    { label: "Criar Meta Financeira", route: "/financeiro?tab=goals", reason: "Definir metas do mês" },
  ],
  "/bi-dashboard": [
    { label: "Criar Meta", route: "/financeiro?tab=goals", reason: "Definir meta baseada nos indicadores" },
    { label: "Simular Cenário", route: "/planning", reason: "Projetar impacto de decisões" },
    { label: "Gerar KPI", route: "/relatorios", reason: "Exportar análise executiva" },
  ],
  "/pedidos": [
    { label: "Verificar Financeiro", route: "/financeiro", reason: "Conferir contas geradas do pedido" },
    { label: "Ver Produção", route: "/producao-operacoes", reason: "Acompanhar status produtivo" },
    { label: "Novo Cliente", route: "/crm-comercial", reason: "Cadastrar cliente do pedido" },
  ],
  "/crm-comercial": [
    { label: "Criar Proposta", route: "/pedidos", reason: "Criar proposta para o lead" },
    { label: "Atualizar Pipeline", route: "/crm-comercial", reason: "Revisar estágio dos deals" },
    { label: "Forecast Vendas", route: "/bi-dashboard", reason: "Ver projeção comercial" },
  ],
  "/producao-operacoes": [
    { label: "Atualizar Pedido", route: "/pedidos", reason: "Sincronizar status do pedido vinculado" },
    { label: "Ver Estoque", route: "/estoque", reason: "Verificar materiais disponíveis" },
  ],
  "/fornecedores": [
    { label: "Registrar Conta a Pagar", route: "/financeiro", reason: "Lançar despesa da compra" },
    { label: "Ver Estoque", route: "/estoque", reason: "Conferir itens em estoque" },
  ],
  "/relatorios": [
    { label: "DRE Gerencial", route: "/bi-dashboard", reason: "Analisar resultado do mês" },
    { label: "Forecast", route: "/bi-dashboard", reason: "Ver projeções financeiras" },
  ],
  "/control-tower": [],
  "/cadastros-financeiros": [
    { label: "Ver DRE", route: "/bi-dashboard", reason: "Conferir impacto no resultado" },
    { label: "Ver Financeiro", route: "/financeiro", reason: "Verificar lançamentos" },
  ],
  "/settings": [
    { label: "Gerenciar Usuários", route: "/settings/users", reason: "Adicionar ou editar usuários" },
    { label: "Ver Auditoria", route: "/auditoria", reason: "Conferir logs do sistema" },
  ],
};

// ── Contextual shortcuts per route (quick actions within screens) ──
const CONTEXTUAL_SHORTCUTS: Record<string, { label: string; route: string; icon: string }[]> = {
  "/bi-dashboard": [
    { label: "Criar Meta", route: "/financeiro?tab=goals", icon: "Target" },
    { label: "Simular Cenário", route: "/planning", icon: "Calculator" },
    { label: "Abrir Forecast", route: "/bi-dashboard", icon: "TrendingUp" },
    { label: "Exportar KPI", route: "/relatorios", icon: "FileBarChart" },
  ],
  "/crm-comercial": [
    { label: "Criar Proposta", route: "/pedidos", icon: "FileText" },
    { label: "Atualizar Pipeline", route: "/crm-comercial", icon: "Kanban" },
    { label: "Meta Comercial", route: "/planning", icon: "Target" },
  ],
  "/financeiro": [
    { label: "Lançar Receita", route: "/financeiro?tab=receivables", icon: "Plus" },
    { label: "Lançar Despesa", route: "/financeiro?tab=payables", icon: "CreditCard" },
    { label: "Importar OFX", route: "/financeiro?tab=reconciliation", icon: "ArrowLeftRight" },
    { label: "Ver DRE", route: "/bi-dashboard", icon: "BarChart3" },
  ],
  "/pedidos": [
    { label: "Novo Pedido", route: "/pedidos", icon: "Plus" },
    { label: "Ver Financeiro", route: "/financeiro", icon: "Wallet" },
    { label: "Ver Produção", route: "/producao-operacoes", icon: "Factory" },
  ],
  "/producao-operacoes": [
    { label: "Nova OP", route: "/producao-operacoes", icon: "Plus" },
    { label: "Kanban", route: "/producao-operacoes", icon: "Kanban" },
    { label: "Pedidos", route: "/pedidos", icon: "ClipboardList" },
  ],
};

// ── Breadcrumb-related actions per route ──
const BREADCRUMB_ACTIONS: Record<string, { label: string; route: string }[]> = {
  "/financeiro": [
    { label: "Contas a Receber", route: "/financeiro?tab=receivables" },
    { label: "Contas a Pagar", route: "/financeiro?tab=payables" },
    { label: "Tesouraria", route: "/financeiro?tab=treasury" },
    { label: "Conciliação", route: "/financeiro?tab=reconciliation" },
  ],
  "/bi-dashboard": [
    { label: "DRE", route: "/bi-dashboard" },
    { label: "Fluxo de Caixa", route: "/bi-dashboard" },
    { label: "KPIs", route: "/bi-dashboard" },
  ],
  "/cadastros-financeiros": [
    { label: "Plano de Contas", route: "/cadastros-financeiros?tab=chart" },
    { label: "Centros de Custo", route: "/cadastros-financeiros?tab=cost-centers" },
    { label: "Projetos", route: "/cadastros-financeiros?tab=projects" },
  ],
};

export function useNavigationIntelligence() {
  const { pathname } = useLocation();
  const { getTopPaths, getTopGroups, trackVisit } = useNavigationUsage();

  const basePath = useMemo(() => {
    const parts = pathname.split("?")[0].split("/").filter(Boolean);
    return "/" + (parts[0] || "");
  }, [pathname]);

  // Next actions based on current screen
  const nextActions = useMemo(() => {
    return CONTEXTUAL_ACTIONS[basePath] || CONTEXTUAL_ACTIONS[pathname] || [];
  }, [basePath, pathname]);

  // Contextual shortcuts for current screen
  const contextualShortcuts = useMemo(() => {
    return CONTEXTUAL_SHORTCUTS[basePath] || CONTEXTUAL_SHORTCUTS[pathname] || [];
  }, [basePath, pathname]);

  // Breadcrumb quick-nav actions
  const breadcrumbActions = useMemo(() => {
    return BREADCRUMB_ACTIONS[basePath] || [];
  }, [basePath]);

  // Recent history (last 8 unique)
  const recentHistory = useMemo(() => {
    try {
      const raw = localStorage.getItem("erp-home-recents");
      return raw ? JSON.parse(raw).slice(0, 8) : [];
    } catch { return []; }
  }, [pathname]); // re-eval on nav

  // Adaptive favorites (most used)
  const adaptiveFavorites = useMemo(() => getTopPaths(6), [getTopPaths]);

  // Top groups
  const topGroups = useMemo(() => getTopGroups(4), [getTopGroups]);

  return {
    nextActions,
    contextualShortcuts,
    breadcrumbActions,
    recentHistory,
    adaptiveFavorites,
    topGroups,
    trackVisit,
    currentPath: pathname,
    basePath,
  };
}
