import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Command } from "cmdk";
import {
  Home, ShoppingCart, Factory, Wallet, BookOpen, Target,
  Database, BarChart3, Settings, Building2, Users, FileText,
  Briefcase, DollarSign, Package, Layers, CreditCard,
  ArrowLeftRight, BarChart, TrendingUp, Calculator, History,
  Zap, Shield, LineChart, PieChart, UserCog, Landmark,
  ClipboardList, Wrench, Search, Plus, Play, Star, Clock,
  Truck, Receipt, FileSignature, GitCompare, Bot, Sparkles,
  type LucideIcon,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationUsage } from "@/hooks/useNavigationUsage";
import { cn } from "@/lib/utils";

// ── Global open store (so navbar button can trigger it) ──
type Listener = (open: boolean) => void;
const listeners = new Set<Listener>();
export const commandBarStore = {
  open: () => listeners.forEach((l) => l(true)),
  close: () => listeners.forEach((l) => l(false)),
  toggle: () => listeners.forEach((l) => l(undefined as any)),
};

// ── Types ──
type GroupKey = "Ações" | "Módulos" | "Registros" | "KPI's" | "Configurações";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  keywords: string[]; // include synonyms + abbreviations
  icon: LucideIcon;
  group: GroupKey;
  action: () => void;
  contextRoutes?: string[]; // boost when current route matches
  roles?: string[]; // visible only for these roles (empty = all)
}

// ── History (recent commands) ──
const HISTORY_KEY = "erp_command_bar_history";
const MAX_HISTORY = 8;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function pushHistory(id: string) {
  try {
    const cur = loadHistory().filter((x) => x !== id);
    cur.unshift(id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(cur.slice(0, MAX_HISTORY)));
  } catch {}
}

// ── Fuzzy + diacritic-insensitive match ──
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 1;
  const h = normalize(haystack);
  const n = normalize(needle);
  if (h === n) return 1000;
  if (h.startsWith(n)) return 500;
  if (h.includes(n)) return 200;
  // subsequence (typo tolerance)
  let i = 0;
  for (const ch of h) {
    if (ch === n[i]) i++;
    if (i === n.length) return 50;
  }
  return 0;
}

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { userLevel } = usePermissions();
  const { getTopPaths, trackVisit } = useNavigationUsage();
  const debounceRef = useRef<number | null>(null);

  // Subscribe to global store
  useEffect(() => {
    const l: Listener = (next) => {
      setOpen((prev) => (next === undefined ? !prev : next));
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  // Ctrl+K / Cmd+K + Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Debounce search (50ms — instant feel, no jank on long lists)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setDebounced(search), 50);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Reset search when closing
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const go = useCallback(
    (id: string, path: string, label: string, group: string) => {
      pushHistory(id);
      trackVisit(path, group);
      navigate(path);
      setOpen(false);
      setSearch("");
    },
    [navigate, trackVisit]
  );

  // ── Catalog: Modules + Actions + Reports + Records + Settings ──
  const commands = useMemo<CommandItem[]>(
    () => [
      // ───── MÓDULOS ─────
      { id: "mod-home", label: "Central de Navegação", group: "Módulos", icon: Home,
        keywords: ["home", "inicio", "central", "launcher", "dashboard"],
        action: () => go("mod-home", "/central-navegacao", "Central de Navegação", "Módulos") },
      { id: "mod-pedidos", label: "Pedidos", group: "Módulos", icon: ShoppingCart,
        keywords: ["pedidos", "vendas", "ordens", "orders", "pe"],
        action: () => go("mod-pedidos", "/pedidos", "Pedidos", "Módulos") },
      { id: "mod-crm", label: "CRM Comercial", group: "Módulos", icon: Users,
        keywords: ["crm", "pipeline", "funil", "leads", "comercial"],
        action: () => go("mod-crm", "/crm-comercial", "CRM", "Módulos") },
      { id: "mod-producao", label: "Produção", group: "Módulos", icon: Factory,
        keywords: ["producao", "fabrica", "kanban", "op", "ordens de producao"],
        action: () => go("mod-producao", "/producao", "Produção", "Módulos") },
      { id: "mod-projetos", label: "Projetos", group: "Módulos", icon: Briefcase,
        keywords: ["projetos", "obras", "execucao"],
        action: () => go("mod-projetos", "/projetos", "Projetos", "Módulos") },
      { id: "mod-financeiro", label: "Financeiro", group: "Módulos", icon: Wallet,
        keywords: ["financeiro", "tesouraria", "fin", "caixa"],
        action: () => go("mod-financeiro", "/financeiro", "Financeiro", "Módulos") },
      { id: "mod-bi", label: "BI Dashboard", group: "Módulos", icon: PieChart,
        keywords: ["bi", "dashboard", "indicadores", "kpi", "analitico"],
        action: () => go("mod-bi", "/bi-dashboard", "BI", "Módulos") },
      { id: "mod-cadastros-fin", label: "Cadastros Financeiros", group: "Módulos", icon: BookOpen,
        keywords: ["plano de contas", "categorias", "centros de custo", "cc", "controladoria"],
        action: () => go("mod-cadastros-fin", "/cadastros-financeiros", "Cadastros Financeiros", "Módulos") },
      { id: "mod-fornecedores", label: "Fornecedores", group: "Módulos", icon: Truck,
        keywords: ["fornecedores", "suppliers", "compras"],
        action: () => go("mod-fornecedores", "/fornecedores", "Fornecedores", "Módulos") },
      { id: "mod-estoque", label: "Estoque / Produtos", group: "Módulos", icon: Package,
        keywords: ["estoque", "produtos", "inventario", "materiais", "sku"],
        action: () => go("mod-estoque", "/estoque", "Estoque", "Módulos") },
      { id: "mod-tarefas", label: "Tarefas", group: "Módulos", icon: ClipboardList,
        keywords: ["tarefas", "tasks", "to do", "pendencias"],
        action: () => go("mod-tarefas", "/tarefas", "Tarefas", "Módulos") },
      { id: "mod-rh", label: "Recursos Humanos", group: "Módulos", icon: Users,
        keywords: ["rh", "colaboradores", "ponto", "funcionarios"],
        action: () => go("mod-rh", "/rh", "RH", "Módulos") },

      // ───── AÇÕES (execução direta) ─────
      { id: "act-novo-pedido", label: "Criar novo pedido", group: "Ações", icon: Plus,
        keywords: ["novo", "criar", "pedido", "venda", "+"],
        action: () => go("act-novo-pedido", "/pedidos?action=new", "Novo Pedido", "Ações") },
      { id: "act-nova-proposta", label: "Criar nova proposta", group: "Ações", icon: FileSignature,
        keywords: ["nova", "proposta", "orcamento", "cotacao"],
        action: () => go("act-nova-proposta", "/crm-comercial?action=new-proposta", "Proposta", "Ações") },
      { id: "act-nova-despesa", label: "Lançar nova despesa", group: "Ações", icon: ArrowLeftRight,
        keywords: ["nova", "despesa", "pagar", "lancamento", "saida", "conta a pagar", "ap"],
        action: () => go("act-nova-despesa", "/financeiro?tab=payables&action=new", "Nova Despesa", "Ações") },
      { id: "act-nova-receita", label: "Lançar nova receita", group: "Ações", icon: TrendingUp,
        keywords: ["nova", "receita", "receber", "entrada", "conta a receber", "ar"],
        action: () => go("act-nova-receita", "/financeiro?tab=receivables&action=new", "Nova Receita", "Ações") },
      { id: "act-novo-cliente", label: "Cadastrar novo cliente", group: "Ações", icon: Plus,
        keywords: ["novo", "cliente", "cadastrar", "cad cliente"],
        action: () => go("act-novo-cliente", "/clientes?action=new", "Novo Cliente", "Ações") },
      { id: "act-novo-fornecedor", label: "Cadastrar novo fornecedor", group: "Ações", icon: Plus,
        keywords: ["novo", "fornecedor", "cadastrar", "supplier"],
        action: () => go("act-novo-fornecedor", "/fornecedores?action=new", "Novo Fornecedor", "Ações") },
      { id: "act-conciliar", label: "Iniciar conciliação bancária", group: "Ações", icon: GitCompare,
        keywords: ["conciliar", "conciliacao", "ofx", "extrato", "banco"],
        action: () => go("act-conciliar", "/financeiro?tab=reconciliation", "Conciliação", "Ações") },
      { id: "act-importar-ofx", label: "Importar extrato OFX", group: "Ações", icon: Database,
        keywords: ["importar", "ofx", "extrato", "banco"],
        action: () => go("act-importar-ofx", "/financeiro?tab=reconciliation&import=ofx", "Importar OFX", "Ações") },

      // ───── REGISTROS (atalhos para listas filtráveis) ─────
      { id: "rec-clientes", label: "Lista de clientes", group: "Registros", icon: Users,
        keywords: ["clientes", "customers", "buscar cliente"],
        action: () => go("rec-clientes", "/clientes", "Clientes", "Registros") },
      { id: "rec-fornecedores", label: "Lista de fornecedores", group: "Registros", icon: Truck,
        keywords: ["fornecedores", "suppliers"],
        action: () => go("rec-fornecedores", "/fornecedores", "Fornecedores", "Registros") },
      { id: "rec-pedidos", label: "Lista de pedidos", group: "Registros", icon: Receipt,
        keywords: ["pedidos", "buscar pedido"],
        action: () => go("rec-pedidos", "/pedidos", "Pedidos", "Registros") },
      { id: "rec-projetos", label: "Lista de projetos", group: "Registros", icon: Briefcase,
        keywords: ["projetos", "obras"],
        action: () => go("rec-projetos", "/projetos", "Projetos", "Registros") },
      { id: "rec-produtos", label: "Lista de produtos", group: "Registros", icon: Package,
        keywords: ["produtos", "sku", "estoque"],
        action: () => go("rec-produtos", "/estoque", "Produtos", "Registros") },

      // ───── RELATÓRIOS ─────
      { id: "rep-dre", label: "DRE Gerencial", group: "KPI's", icon: LineChart,
        keywords: ["dre", "resultado", "demonstrativo", "lucro", "competencia"],
        action: () => go("rep-dre", "/financeiro?tab=dre", "DRE", "KPI's") },
      { id: "rep-fluxo", label: "Fluxo de Caixa", group: "KPI's", icon: BarChart,
        keywords: ["fluxo", "caixa", "cash flow", "liquidez", "fc"],
        action: () => go("rep-fluxo", "/financeiro?tab=cashflow", "Fluxo de Caixa", "KPI's") },
      { id: "rep-resultado", label: "Resultado Financeiro", group: "KPI's", icon: Calculator,
        keywords: ["resultado", "financeiro", "juros", "rentabilidade"],
        action: () => go("rep-resultado", "/financeiro?tab=financial-result", "Resultado", "KPI's") },
      { id: "rep-pagar", label: "Contas a Pagar", group: "KPI's", icon: CreditCard,
        keywords: ["contas a pagar", "ap", "vencidas", "despesas"],
        action: () => go("rep-pagar", "/financeiro?tab=payables", "Contas a Pagar", "KPI's") },
      { id: "rep-receber", label: "Contas a Receber", group: "KPI's", icon: TrendingUp,
        keywords: ["contas a receber", "ar", "recebiveis"],
        action: () => go("rep-receber", "/financeiro?tab=receivables", "Contas a Receber", "KPI's") },
      { id: "rep-tesouraria", label: "Tesouraria", group: "KPI's", icon: Landmark,
        keywords: ["tesouraria", "saldo", "bancos"],
        action: () => go("rep-tesouraria", "/financeiro?tab=treasury", "Tesouraria", "KPI's") },
      { id: "rep-relatorios", label: "Central de KPI's", group: "KPI's", icon: BarChart3,
        keywords: ["relatorios", "reports", "exportar"],
        action: () => go("rep-relatorios", "/relatorios", "KPI's", "KPI's") },
      { id: "rep-bi", label: "BI Analítico", group: "KPI's", icon: PieChart,
        keywords: ["bi", "analitico", "indicadores", "dashboard"],
        action: () => go("rep-bi", "/bi-dashboard", "BI", "KPI's") },

      // ───── CONFIGURAÇÕES ─────
      { id: "cfg-empresa", label: "Configurações da Empresa", group: "Configurações", icon: Building2,
        keywords: ["empresa", "company", "configuracoes", "settings"],
        action: () => go("cfg-empresa", "/settings", "Configurações", "Configurações") },
      { id: "cfg-usuarios", label: "Usuários e Permissões", group: "Configurações", icon: UserCog,
        keywords: ["usuarios", "users", "permissoes", "rbac", "papeis"],
        action: () => go("cfg-usuarios", "/settings/users", "Usuários", "Configurações") },
      { id: "cfg-automacoes", label: "Automações por Evento", group: "Configurações", icon: Bot,
        keywords: ["automacoes", "regras", "engine", "eventos"],
        action: () => go("cfg-automacoes", "/cadastros-financeiros?tab=event_automations", "Automações", "Configurações") },
      { id: "cfg-classificacao", label: "Classificação Automática", group: "Configurações", icon: Sparkles,
        keywords: ["classificacao", "ia", "smart", "categorizar"],
        action: () => go("cfg-classificacao", "/cadastros-financeiros?tab=classification", "Classificação", "Configurações") },
      { id: "cfg-cc", label: "Centros de Custo", group: "Configurações", icon: Layers,
        keywords: ["centros de custo", "cc", "setores", "departamentos"],
        action: () => go("cfg-cc", "/cadastros-financeiros?tab=cost-centers", "Centros de Custo", "Configurações") },
      { id: "cfg-plano", label: "Plano de Contas", group: "Configurações", icon: BookOpen,
        keywords: ["plano de contas", "categorias", "natureza", "chart"],
        action: () => go("cfg-plano", "/cadastros-financeiros?tab=chart", "Plano de Contas", "Configurações") },
    ],
    [go]
  );

  // ── Context-aware boosts ──
  const contextBoost = useCallback(
    (item: CommandItem): number => {
      let boost = 0;
      // Current route boost
      const path = location.pathname;
      if (path.startsWith("/financeiro") && (item.group === "KPI's" || item.id.startsWith("act-nova-"))) boost += 30;
      if (path.startsWith("/pedidos") && item.id.includes("pedido")) boost += 30;
      if (path.startsWith("/producao") && item.id.includes("producao")) boost += 30;
      // Role boost
      if (userLevel === "system_owner" || userLevel === "tenant_owner") {
        if (["rep-dre", "rep-fluxo", "mod-bi"].includes(item.id)) boost += 20;
      }
      return boost;
    },
    [location.pathname, userLevel]
  );

  // ── Recent / frequent ranking ──
  const history = useMemo(() => loadHistory(), [open]);
  const topPaths = useMemo(() => getTopPaths(10), [getTopPaths, open]);

  const recencyScore = useCallback(
    (id: string): number => {
      const idx = history.indexOf(id);
      return idx === -1 ? 0 : (MAX_HISTORY - idx) * 15;
    },
    [history]
  );

  const frequencyScore = useCallback(
    (item: CommandItem): number => {
      // boost if any keyword/path matches a top visited path
      const allText = normalize(item.label + " " + item.keywords.join(" "));
      let score = 0;
      topPaths.forEach((p, i) => {
        const seg = normalize(p.replace(/^\//, "").split("?")[0]);
        if (seg && allText.includes(seg)) score += (10 - i) * 2;
      });
      return score;
    },
    [topPaths]
  );

  // ── Filtered + ranked results ──
  const ranked = useMemo(() => {
    const q = debounced.trim();
    return commands
      .map((c) => {
        const labelScore = fuzzyScore(c.label, q);
        const keywordScore = q
          ? Math.max(0, ...c.keywords.map((k) => fuzzyScore(k, q)))
          : 0;
        const matchScore = Math.max(labelScore, keywordScore);
        if (q && matchScore === 0) return null;
        const total =
          matchScore +
          contextBoost(c) +
          recencyScore(c.id) +
          frequencyScore(c);
        return { item: c, score: total };
      })
      .filter((x): x is { item: CommandItem; score: number } => x !== null)
      .sort((a, b) => b.score - a.score);
  }, [commands, debounced, contextBoost, recencyScore, frequencyScore]);

  // ── Group results by GroupKey ──
  const groups = useMemo(() => {
    const order: GroupKey[] = ["Ações", "Módulos", "Registros", "KPI's", "Configurações"];
    const map = new Map<GroupKey, { item: CommandItem; score: number }[]>();
    order.forEach((g) => map.set(g, []));
    ranked.forEach((r) => map.get(r.item.group)!.push(r));
    return order.filter((g) => (map.get(g)?.length ?? 0) > 0).map((g) => ({ group: g, items: map.get(g)! }));
  }, [ranked]);

  // ── Recent (only when no search) ──
  const recentItems = useMemo(() => {
    if (debounced.trim()) return [];
    return history
      .map((id) => commands.find((c) => c.id === id))
      .filter((c): c is CommandItem => !!c)
      .slice(0, 5);
  }, [history, commands, debounced]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-150" />
      <div className="fixed inset-0 flex items-start justify-center pt-[15vh] px-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-full max-w-[640px] rounded-xl border border-border bg-popover shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <Command
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest"
            // Disable cmdk's internal filter — we do our own ranking
            shouldFilter={false}
            loop
          >
            {/* Input */}
            <div className="flex items-center gap-2 px-4 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Digite para buscar ações, módulos, registros, relatórios..."
                className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                autoFocus
              />
              <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[420px] overflow-y-auto p-2">
              <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                Nenhum resultado para "{search}".
              </Command.Empty>

              {/* Recent */}
              {recentItems.length > 0 && (
                <Command.Group heading="Recentes">
                  {recentItems.map((item) => (
                    <Row key={`recent-${item.id}`} item={item} icon={Clock} />
                  ))}
                </Command.Group>
              )}

              {/* Ranked groups */}
              {groups.map(({ group, items }) => (
                <Command.Group key={group} heading={group}>
                  {items.map(({ item }) => (
                    <Row key={item.id} item={item} />
                  ))}
                </Command.Group>
              ))}
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
                  executar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 text-[9px]">esc</kbd>
                  fechar
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

// ── Row ──
function Row({ item, icon }: { item: CommandItem; icon?: LucideIcon }) {
  const Icon = icon ?? item.icon;
  return (
    <Command.Item
      value={item.id}
      onSelect={() => item.action()}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors",
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground text-foreground/85"
      )}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted/60 flex-shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="truncate block">{item.label}</span>
        {item.description && (
          <span className="text-[11px] text-muted-foreground truncate block">{item.description}</span>
        )}
      </div>
      <span
        className={cn(
          "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold",
          item.group === "Ações" && "bg-primary/15 text-primary",
          item.group === "Módulos" && "bg-blue-500/15 text-blue-500",
          item.group === "Registros" && "bg-emerald-500/15 text-emerald-500",
          item.group === "KPI's" && "bg-amber-500/15 text-amber-600",
          item.group === "Configurações" && "bg-muted text-muted-foreground"
        )}
      >
        {item.group}
      </span>
    </Command.Item>
  );
}
