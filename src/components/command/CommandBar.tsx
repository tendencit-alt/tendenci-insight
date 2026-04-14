import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
  Home, ShoppingCart, Factory, Wallet, BookOpen, Target,
  Database, BarChart3, Settings, Building2, Users, FileText,
  Briefcase, DollarSign, HardHat, Package, Layers, CreditCard,
  ArrowLeftRight, BarChart, TrendingUp, Calculator, History,
  Zap, Shield, LineChart, PieChart, UserCog, Link2, Landmark,
  ClipboardList, FolderOpen, Wrench, Search, Plus, Play,
  Star, Clock
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationUsage } from "@/hooks/useNavigationUsage";
import { cn } from "@/lib/utils";

// ── Types ──
type RoleKey = "owner" | "financeiro" | "comercial" | "operacional" | "admin";

interface CommandItem {
  id: string;
  label: string;
  keywords: string[];
  icon: any;
  action: () => void;
  group: string;
  priority?: number; // higher = more relevant
}

// ── Role-based priority boosts ──
const ROLE_BOOSTS: Record<RoleKey, string[]> = {
  owner: ["dre", "metas", "resultado", "fluxo-caixa", "bi-dashboard", "controladoria"],
  financeiro: ["contas-pagar", "contas-receber", "conciliacao", "fluxo-caixa", "dre", "financeiro"],
  comercial: ["pedidos", "clientes", "propostas", "contratos", "comissoes"],
  operacional: ["producao", "ordens-producao", "execucao-obras", "projetos-operacionais"],
  admin: [],
};

function resolveRoleKey(userLevel: string): RoleKey {
  if (userLevel === 'system_owner' || userLevel === 'tenant_owner') return 'owner';
  return 'admin';
}

// ── Icon map for dynamic lookup ──
const ICON_MAP: Record<string, any> = {
  Home, ShoppingCart, Factory, Wallet, BookOpen, Target,
  Database, BarChart3, Settings, Building2, Users, FileText,
  Briefcase, DollarSign, HardHat, Package, Layers, CreditCard,
  ArrowLeftRight, BarChart, TrendingUp, Calculator, History,
  Zap, Shield, LineChart, PieChart, UserCog, Link2, Landmark,
  ClipboardList, FolderOpen, Wrench,
};

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { userLevel } = usePermissions();
  const { getTopPaths } = useNavigationUsage();
  const roleKey = resolveRoleKey(userLevel);
  const boostSet = useMemo(() => new Set(ROLE_BOOSTS[roleKey]), [roleKey]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const go = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
    setSearch("");
  }, [navigate]);

  // ── All command items ──
  const commands = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      // Navigation
      { id: "nav-home", label: "Central de Navegação", keywords: ["home", "inicio", "central", "navegação"], icon: Home, action: () => go("/central-navegacao"), group: "Navegação" },
      { id: "nav-pedidos", label: "Pedidos", keywords: ["pedidos", "vendas", "orders"], icon: ShoppingCart, action: () => go("/pedidos"), group: "Navegação" },
      { id: "nav-clientes", label: "Clientes", keywords: ["clientes", "customers"], icon: Users, action: () => go("/clientes"), group: "Navegação" },
      { id: "nav-producao", label: "Produção", keywords: ["producao", "produção", "fabrica"], icon: Factory, action: () => go("/producao"), group: "Navegação" },
      { id: "nav-financeiro", label: "Tesouraria", keywords: ["tesouraria", "financeiro", "caixa", "banco"], icon: Wallet, action: () => go("/financeiro"), group: "Navegação" },
      { id: "nav-fornecedores", label: "Fornecedores", keywords: ["fornecedores", "suppliers"], icon: Package, action: () => go("/fornecedores"), group: "Navegação" },
      { id: "nav-estoque", label: "Produtos / Materiais", keywords: ["estoque", "materiais", "produtos", "inventory"], icon: Layers, action: () => go("/estoque"), group: "Navegação" },
      { id: "nav-plano-contas", label: "Plano de Contas", keywords: ["plano", "contas", "categorias", "chart"], icon: BookOpen, action: () => go("/cadastros-financeiros"), group: "Navegação" },
      { id: "nav-metas", label: "Metas", keywords: ["metas", "goals", "objetivos"], icon: Target, action: () => go("/metas"), group: "Navegação" },
      { id: "nav-bi", label: "BI Analítico", keywords: ["bi", "dashboard", "analítico", "indicadores"], icon: PieChart, action: () => go("/bi-dashboard"), group: "Navegação" },
      { id: "nav-dashboards", label: "Dashboards", keywords: ["dashboards", "relatórios", "painel"], icon: BarChart3, action: () => go("/dashboards"), group: "Navegação" },
      { id: "nav-automacoes", label: "Automações", keywords: ["automações", "regras", "automação"], icon: Zap, action: () => go("/automacoes"), group: "Navegação" },
      { id: "nav-auditoria", label: "Auditoria", keywords: ["auditoria", "log", "histórico"], icon: History, action: () => go("/auditoria"), group: "Navegação" },
      { id: "nav-aprovacoes", label: "Aprovações", keywords: ["aprovações", "aprovar", "pendente"], icon: Shield, action: () => go("/aprovacoes"), group: "Navegação" },
      { id: "nav-tarefas", label: "Tarefas", keywords: ["tarefas", "tasks", "pendências"], icon: ClipboardList, action: () => go("/tarefas"), group: "Navegação" },
      { id: "nav-settings", label: "Configurações", keywords: ["configurações", "settings", "config"], icon: Settings, action: () => go("/settings"), group: "Navegação" },
      { id: "nav-users", label: "Usuários", keywords: ["usuários", "users", "permissões"], icon: UserCog, action: () => go("/settings/users"), group: "Navegação" },
      { id: "nav-documentos", label: "Documentos", keywords: ["documentos", "arquivos", "files"], icon: FileText, action: () => go("/documentos"), group: "Navegação" },

      // Actions
      { id: "act-novo-pedido", label: "Novo Pedido", keywords: ["novo", "pedido", "criar", "venda"], icon: Plus, action: () => go("/pedidos?action=new"), group: "Ações" },
      { id: "act-novo-cliente", label: "Novo Cliente", keywords: ["novo", "cliente", "cadastrar"], icon: Plus, action: () => go("/clientes?action=new"), group: "Ações" },
      { id: "act-novo-fornecedor", label: "Novo Fornecedor", keywords: ["novo", "fornecedor", "cadastrar"], icon: Plus, action: () => go("/fornecedores?action=new"), group: "Ações" },
      { id: "act-novo-lancamento", label: "Novo Lançamento Financeiro", keywords: ["novo", "lançamento", "financeiro", "despesa", "receita"], icon: Plus, action: () => go("/financeiro?action=new"), group: "Ações" },

      // Reports / Executive
      { id: "rep-dre", label: "DRE Gerencial", keywords: ["dre", "resultado", "demonstrativo", "lucro"], icon: LineChart, action: () => go("/dre"), group: "Relatórios" },
      { id: "rep-fluxo", label: "Fluxo de Caixa", keywords: ["fluxo", "caixa", "cash", "flow", "projeção"], icon: BarChart, action: () => go("/fluxo-caixa"), group: "Relatórios" },
      { id: "rep-resultado", label: "Resultado Financeiro", keywords: ["resultado", "financeiro", "juros"], icon: Calculator, action: () => go("/resultado-financeiro"), group: "Relatórios" },

      // Operational
      { id: "op-contas-pagar", label: "Contas a Pagar", keywords: ["contas", "pagar", "vencidas", "despesas"], icon: CreditCard, action: () => go("/contas-pagar"), group: "Operacional" },
      { id: "op-contas-receber", label: "Contas a Receber", keywords: ["contas", "receber", "recebíveis", "receitas"], icon: TrendingUp, action: () => go("/contas-receber"), group: "Operacional" },
      { id: "op-conciliacao", label: "Conciliação Bancária", keywords: ["conciliação", "conciliar", "banco", "ofx"], icon: ArrowLeftRight, action: () => go("/conciliacao"), group: "Operacional" },
      { id: "op-ordens-prod", label: "Ordens de Produção", keywords: ["ordens", "produção", "op", "fabricação"], icon: ClipboardList, action: () => go("/ordens-producao"), group: "Operacional" },

      // Activity feed commands
      { id: "feed-hoje", label: "Atividade Hoje", keywords: ["atividade", "hoje", "feed", "recente"], icon: Clock, action: () => go("/atividades"), group: "Feed" },
      { id: "feed-financeiro", label: "Atividade Financeiro", keywords: ["atividade", "financeiro", "feed"], icon: Play, action: () => go("/atividades?sector=financeiro"), group: "Feed" },
      { id: "feed-comercial", label: "Atividade Comercial", keywords: ["atividade", "comercial", "feed"], icon: Play, action: () => go("/atividades?sector=comercial"), group: "Feed" },
      { id: "feed-operacoes", label: "Atividade Operações", keywords: ["atividade", "operações", "produção", "feed"], icon: Play, action: () => go("/atividades?sector=operacoes"), group: "Feed" },

      // Notification commands
      { id: "notif-criticas", label: "Notificações Críticas", keywords: ["notificações", "críticas", "alertas", "urgente"], icon: Search, action: () => go("/tarefas?filter=critica"), group: "Notificações" },
      { id: "notif-contas", label: "Contas Vencidas", keywords: ["contas", "vencidas", "atraso", "inadimplência"], icon: CreditCard, action: () => go("/contas-pagar?filter=vencidas"), group: "Notificações" },
      { id: "notif-aprovacoes", label: "Aprovações Pendentes", keywords: ["aprovações", "pendentes", "aprovar"], icon: Shield, action: () => go("/aprovacoes?status=pending"), group: "Notificações" },
      { id: "notif-resumo", label: "Resumo do Dia", keywords: ["resumo", "dia", "diário", "pendências"], icon: Star, action: () => go("/central-navegacao"), group: "Notificações" },

      // Flow commands
      { id: "flow-comercial", label: "Fluxo Comercial", keywords: ["fluxo", "comercial", "lead", "orçamento", "pedido"], icon: ShoppingCart, action: () => go("/central-navegacao"), group: "Fluxos" },
      { id: "flow-producao", label: "Fluxo Produção", keywords: ["fluxo", "produção", "corte", "montagem", "embalagem"], icon: Factory, action: () => go("/central-navegacao"), group: "Fluxos" },
      { id: "flow-financeiro", label: "Fluxo Financeiro", keywords: ["fluxo", "financeiro", "conciliação", "baixa"], icon: Wallet, action: () => go("/central-navegacao"), group: "Fluxos" },
      { id: "flow-fechamento", label: "Fluxo Fechamento Mensal", keywords: ["fluxo", "fechamento", "mensal", "dre", "resultado"], icon: BarChart3, action: () => go("/central-navegacao"), group: "Fluxos" },

      // Integrity commands
      { id: "int-integridade", label: "Integridade da Base", keywords: ["integridade", "consistência", "validação", "score"], icon: Shield, action: () => go("/central-navegacao"), group: "Integridade" },
      { id: "int-auditoria", label: "Auditoria Automática", keywords: ["auditoria", "automática", "inconsistências", "órfãos"], icon: ClipboardList, action: () => go("/auditoria"), group: "Integridade" },

      // Automation commands
      { id: "auto-regras", label: "Regras de Automação", keywords: ["automação", "regras", "motor", "engine"], icon: Zap, action: () => go("/automacoes"), group: "Automação" },
      { id: "auto-pedido", label: "Automação Pedido Aprovado", keywords: ["automação", "pedido", "aprovado", "comissão", "receber"], icon: Zap, action: () => go("/automacoes"), group: "Automação" },
      { id: "auto-fechamento", label: "Checklist Fechamento", keywords: ["fechamento", "mensal", "checklist", "verificação"], icon: ClipboardList, action: () => go("/automacoes"), group: "Automação" },

      // Forecast & Scenarios
      { id: "forecast-resultado", label: "Forecast Resultado Mensal", keywords: ["forecast", "resultado", "previsão", "lucro", "projeção"], icon: TrendingUp, action: () => go("/central-navegacao"), group: "Forecast" },
      { id: "forecast-caixa", label: "Projeção Liquidez", keywords: ["caixa", "liquidez", "projeção", "saldo", "7 dias", "30 dias"], icon: BarChart, action: () => go("/central-navegacao"), group: "Forecast" },
      { id: "forecast-cenarios", label: "Cenários Financeiros", keywords: ["cenários", "conservador", "agressivo", "realista", "simulação"], icon: BarChart3, action: () => go("/central-navegacao"), group: "Forecast" },
      { id: "forecast-simulador", label: "Simulador de Custos", keywords: ["simulador", "custos", "comissão", "frete", "matéria-prima", "margem"], icon: Calculator, action: () => go("/central-navegacao"), group: "Forecast" },
      { id: "forecast-emprestimo", label: "Simulador Empréstimo", keywords: ["empréstimo", "financiamento", "juros", "parcela"], icon: Landmark, action: () => go("/central-navegacao"), group: "Forecast" },

      // Performance Intelligence
      { id: "perf-diagnostico", label: "Diagnóstico Performance", keywords: ["diagnóstico", "performance", "margem", "caixa", "crescimento"], icon: BarChart3, action: () => go("/central-navegacao"), group: "Performance" },
      { id: "perf-custos", label: "Ranking de Custos", keywords: ["ranking", "custos", "top", "maiores", "despesas"], icon: BarChart, action: () => go("/central-navegacao"), group: "Performance" },
      { id: "perf-recomendacoes", label: "Recomendações Gerenciais", keywords: ["recomendações", "sugestões", "melhoria", "gerencial"], icon: TrendingUp, action: () => go("/central-navegacao"), group: "Performance" },
    ];

    // Apply role-based priority
    return nav.map(item => ({
      ...item,
      priority: boostSet.has(item.id.replace(/^nav-|^act-|^rep-|^op-/, "")) ? 10 : 0,
    }));
  }, [go, boostSet]);

  // ── Recent paths as suggestions ──
  const recentSuggestions = useMemo(() => {
    const topPaths = getTopPaths(5);
    return commands.filter(c => topPaths.some(p => {
      // Match if the command action navigates to this path
      const cmdPath = c.id.replace(/^nav-/, "/").replace(/-/g, "/");
      return false; // We'll use label matching instead
    }));
  }, [getTopPaths, commands]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-start justify-center pt-[20vh]" onClick={e => e.stopPropagation()}>
        <div className="w-full max-w-[560px] rounded-xl border border-border bg-popover shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <Command
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            filter={(value, search) => {
              const item = commands.find(c => c.id === value);
              if (!item) return 0;
              const s = search.toLowerCase();
              if (item.label.toLowerCase().includes(s)) return 1;
              if (item.keywords.some(k => k.includes(s))) return 1;
              return 0;
            }}
          >
            {/* Input */}
            <div className="flex items-center gap-2 px-4 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Buscar módulo, ação ou relatório..."
                className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[340px] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado.
              </Command.Empty>

              {/* Suggested */}
              {!search && (
                <Command.Group heading="Sugerido">
                  {commands
                    .filter(c => c.priority && c.priority > 0)
                    .slice(0, 4)
                    .map(item => (
                      <CommandItemRow key={item.id} item={item} />
                    ))}
                </Command.Group>
              )}

              {/* Navegação */}
              <Command.Group heading="Navegação">
                {commands.filter(c => c.group === "Navegação").map(item => (
                  <CommandItemRow key={item.id} item={item} />
                ))}
              </Command.Group>

              {/* Ações */}
              <Command.Group heading="Ações rápidas">
                {commands.filter(c => c.group === "Ações").map(item => (
                  <CommandItemRow key={item.id} item={item} />
                ))}
              </Command.Group>

              {/* Relatórios */}
              <Command.Group heading="Relatórios">
                {commands.filter(c => c.group === "Relatórios").map(item => (
                  <CommandItemRow key={item.id} item={item} />
                ))}
              </Command.Group>

              {/* Operacional */}
              <Command.Group heading="Operacional">
                {commands.filter(c => c.group === "Operacional").map(item => (
                  <CommandItemRow key={item.id} item={item} />
                ))}
              </Command.Group>

              {/* Feed */}
              <Command.Group heading="Feed de Atividades">
                {commands.filter(c => c.group === "Feed").map(item => (
                  <CommandItemRow key={item.id} item={item} />
                ))}
              </Command.Group>

              {/* Fluxos */}
              <Command.Group heading="Fluxos Operacionais">
                {commands.filter(c => c.group === "Fluxos").map(item => (
                  <CommandItemRow key={item.id} item={item} />
                ))}
              </Command.Group>

              {/* Integridade */}
              <Command.Group heading="Integridade">
                {commands.filter(c => c.group === "Integridade").map(item => (
                  <CommandItemRow key={item.id} item={item} />
                ))}
              </Command.Group>
            </Command.List>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 text-[9px]">↑↓</kbd>
                  navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 text-[9px]">↵</kbd>
                  abrir
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 text-[9px]">⌘K</kbd>
                comando
              </span>
            </div>
          </Command>
        </div>
      </div>
    </div>
  );
}

// ── Individual command row ──
function CommandItemRow({ item }: { item: CommandItem }) {
  const Icon = item.icon;
  return (
    <Command.Item
      value={item.id}
      onSelect={() => item.action()}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground text-foreground/80"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted/60 flex-shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="truncate">{item.label}</span>
      </div>
      {item.group === "Ações" && (
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ação</span>
      )}
    </Command.Item>
  );
}
