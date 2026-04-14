import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search, Star, Clock, ChevronRight, Pencil,
  ShoppingCart, Truck, FolderKanban, FileText,
  Wallet, HandCoins, Landmark, ArrowLeftRight,
  BarChart3, PiggyBank, TrendingUp, Activity,
  FileBarChart, Cog, Shield, Building2,
  Users, Lock, Plug, SlidersHorizontal,
  Package, Tags, FolderTree, Briefcase,
  LayoutGrid, AlertTriangle, Plus, CreditCard,
  UserPlus, Zap, PlayCircle, GripVertical,
  Eye, EyeOff, Rocket, CheckCircle2,
  TrendingDown, Minus, HeartPulse,
  Lightbulb, Calendar, DollarSign, Monitor,
  Gauge, ShieldAlert, ArrowUpRight, ArrowDownRight,
  Sparkles, Calculator, MessageSquareText, BarChart,
  ShieldCheck, RefreshCw, Database,
  Undo2, ListChecks, Play, CheckSquare,
} from "lucide-react";
import {
  useActionItems,
  useContinueItems,
  useUserProfile,
  getModuleOrder,
} from "@/hooks/useSmartLauncher";
import { useModulePreviews } from "@/hooks/useModulePreviews";
import { useCompanyStatus } from "@/hooks/useCompanyStatus";
import { useDecisionSuggestions, useOperationalTimeline } from "@/hooks/useDecisionLayer";
import { format as fmtDate } from "date-fns";
import { usePredictiveLayer, useSimulator } from "@/hooks/usePredictiveLayer";
import { Slider } from "@/components/ui/slider";
import { useExplainabilityLayer } from "@/hooks/useExplainabilityLayer";
import { useTrustLayer } from "@/hooks/useTrustLayer";
import { useActionLayer } from "@/hooks/useActionLayer";
import { useAutomationLayer } from "@/hooks/useAutomationLayer";

// ─── Module definitions ───
const MODULES = [
  {
    key: "operacoes", label: "Operações", desc: "Pedidos, compras, projetos e contratos",
    icon: ShoppingCart,
    color: "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-200/60 dark:border-blue-800/40",
    items: [
      { label: "Pedidos", route: "/pedidos", icon: ShoppingCart },
      { label: "Compras", route: "/fornecedores", icon: Truck },
      { label: "Projetos", route: "/producao", icon: FolderKanban },
      { label: "Contratos", route: "/pedidos", icon: FileText },
    ],
  },
  {
    key: "financeiro", label: "Financeiro", desc: "Contas, conciliação e fluxo de caixa",
    icon: Wallet,
    color: "from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-200/60 dark:border-emerald-800/40",
    items: [
      { label: "Contas a Pagar", route: "/financeiro", icon: HandCoins },
      { label: "Contas a Receber", route: "/financeiro", icon: Wallet },
      { label: "Conciliação", route: "/financeiro", icon: ArrowLeftRight },
      { label: "Fluxo de Caixa", route: "/bi-dashboard", icon: Landmark },
    ],
  },
  {
    key: "controladoria", label: "Controladoria", desc: "DRE, orçamento, forecast e KPIs",
    icon: BarChart3,
    color: "from-violet-500/10 to-violet-600/5 dark:from-violet-500/20 dark:to-violet-600/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    borderColor: "border-violet-200/60 dark:border-violet-800/40",
    items: [
      { label: "DRE", route: "/bi-dashboard", icon: BarChart3 },
      { label: "Orçamento", route: "/bi-dashboard", icon: PiggyBank },
      { label: "Forecast", route: "/bi-dashboard", icon: TrendingUp },
      { label: "KPIs Executivos", route: "/bi-dashboard", icon: Activity },
    ],
  },
  {
    key: "relatorios", label: "Relatórios", desc: "Financeiros, operacionais e auditoria",
    icon: FileBarChart,
    color: "from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-200/60 dark:border-amber-800/40",
    items: [
      { label: "Financeiros", route: "/relatorios", icon: FileBarChart },
      { label: "Operacionais", route: "/relatorios", icon: Cog },
      { label: "Comerciais", route: "/relatorios", icon: ShoppingCart },
      { label: "Auditoria", route: "/relatorios", icon: Shield },
    ],
  },
  {
    key: "cadastros", label: "Cadastros", desc: "Clientes, fornecedores e estruturas",
    icon: Package,
    color: "from-sky-500/10 to-sky-600/5 dark:from-sky-500/20 dark:to-sky-600/10",
    iconColor: "text-sky-600 dark:text-sky-400",
    borderColor: "border-sky-200/60 dark:border-sky-800/40",
    items: [
      { label: "Clientes", route: "/pedidos", icon: Users },
      { label: "Fornecedores", route: "/fornecedores", icon: Truck },
      { label: "Categorias", route: "/cadastros-financeiros", icon: Tags },
      { label: "Centro de Custo", route: "/cadastros-financeiros", icon: FolderTree },
      { label: "Projetos", route: "/cadastros-financeiros", icon: Briefcase },
    ],
  },
  {
    key: "configuracoes", label: "Configurações", desc: "Usuários, permissões e integrações",
    icon: SlidersHorizontal,
    color: "from-gray-500/10 to-gray-600/5 dark:from-gray-500/20 dark:to-gray-600/10",
    iconColor: "text-muted-foreground",
    borderColor: "border-border",
    items: [
      { label: "Usuários", route: "/settings/users", icon: Users },
      { label: "Permissões", route: "/settings/users", icon: Lock },
      { label: "Empresa", route: "/settings", icon: Building2 },
      { label: "Integrações", route: "/settings", icon: Plug },
      { label: "Preferências", route: "/settings", icon: SlidersHorizontal },
    ],
  },
];

const SEARCHABLE_ITEMS = MODULES.flatMap((m) =>
  m.items.map((item) => ({ ...item, module: m.label }))
);

const QUICK_ACTIONS = [
  { label: "Novo Pedido", icon: ShoppingCart, route: "/pedidos", color: "text-blue-600 dark:text-blue-400" },
  { label: "Nova Despesa", icon: CreditCard, route: "/financeiro", color: "text-red-500 dark:text-red-400" },
  { label: "Nova Receita", icon: Plus, route: "/financeiro", color: "text-emerald-600 dark:text-emerald-400" },
  { label: "Conciliar Banco", icon: ArrowLeftRight, route: "/financeiro", color: "text-violet-600 dark:text-violet-400" },
  { label: "Criar Cliente", icon: UserPlus, route: "/pedidos", color: "text-sky-600 dark:text-sky-400" },
];

const DEFAULT_FAVORITES = [
  { label: "DRE", route: "/bi-dashboard", icon: "BarChart3" },
  { label: "Fluxo de Caixa", route: "/bi-dashboard", icon: "Landmark" },
  { label: "Contas a Pagar", route: "/financeiro", icon: "HandCoins" },
  { label: "Contas a Receber", route: "/financeiro", icon: "Wallet" },
  { label: "Pedidos", route: "/pedidos", icon: "ShoppingCart" },
  { label: "Conciliação", route: "/financeiro", icon: "ArrowLeftRight" },
];

const ICON_MAP: Record<string, any> = {
  BarChart3, Landmark, HandCoins, Wallet, ShoppingCart, ArrowLeftRight,
  FolderKanban, FileText, Truck, PiggyBank, TrendingUp, Activity,
  FileBarChart, Cog, Shield, Users, Lock, Building2, Plug, SlidersHorizontal,
  Package, Tags, FolderTree, Briefcase,
};

// ─── Onboarding steps ───
const ONBOARDING_STEPS = [
  { key: "empresa", label: "Cadastrar Empresa", route: "/settings", icon: Building2 },
  { key: "cliente", label: "Cadastrar Cliente", route: "/pedidos", icon: Users },
  { key: "pedido", label: "Criar Pedido", route: "/pedidos", icon: ShoppingCart },
  { key: "conciliar", label: "Conciliar Banco", route: "/financeiro", icon: ArrowLeftRight },
  { key: "dre", label: "Visualizar DRE", route: "/bi-dashboard", icon: BarChart3 },
];

// ─── Storage helpers ───
function getFavoritesFromStorage(): typeof DEFAULT_FAVORITES {
  try { const s = localStorage.getItem("erp-home-favorites"); if (s) return JSON.parse(s); } catch {}
  return DEFAULT_FAVORITES;
}

function addRecent(label: string, route: string) {
  try {
    const stored = localStorage.getItem("erp-home-recents");
    const recents: any[] = stored ? JSON.parse(stored) : [];
    const filtered = recents.filter((r: any) => r.label !== label);
    filtered.unshift({ label, route, time: new Date().toISOString() });
    localStorage.setItem("erp-home-recents", JSON.stringify(filtered.slice(0, 8)));
  } catch {}
}

interface WorkspacePrefs {
  order: string[];
  hidden: string[];
  pinned: string[];
}

function getWorkspacePrefs(): WorkspacePrefs {
  try { const s = localStorage.getItem("erp-workspace-prefs"); if (s) return JSON.parse(s); } catch {}
  return { order: [], hidden: [], pinned: [] };
}

function getOnboardingDone(): string[] {
  try { const s = localStorage.getItem("erp-onboarding-done"); if (s) return JSON.parse(s); } catch {}
  return [];
}

// ─── Severity helpers ───
const SEVERITY_STYLES = {
  red: "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30",
  yellow: "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30",
  green: "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30",
};
const SEVERITY_DOT = { red: "bg-red-500", yellow: "bg-amber-500", green: "bg-emerald-500" };
const PREVIEW_DOT = { red: "bg-red-500", yellow: "bg-amber-500", green: "bg-emerald-500" };

export default function HomeLauncher() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [favorites, setFavorites] = useState(getFavoritesFromStorage);
  const [editFavDialog, setEditFavDialog] = useState(false);
  const [workspaceDialog, setWorkspaceDialog] = useState(false);
  const [tempFavorites, setTempFavorites] = useState<typeof DEFAULT_FAVORITES>([]);
  const [workspacePrefs, setWorkspacePrefs] = useState(getWorkspacePrefs);
  const [onboardingDone, setOnboardingDone] = useState(getOnboardingDone);

  const { data: actionItems = [], isLoading: loadingActions } = useActionItems();
  const continueItems = useContinueItems();
  const userProfile = useUserProfile();
  const moduleOrder = getModuleOrder(userProfile);
  const { data: modulePreviews } = useModulePreviews();
  const { data: companyStatus, isLoading: loadingStatus } = useCompanyStatus();
  const { data: suggestions = [], isLoading: loadingSuggestions } = useDecisionSuggestions();
  const { data: timeline = [] } = useOperationalTimeline();
  const [fabOpen, setFabOpen] = useState(false);
  const [executiveMode, setExecutiveMode] = useState(false);
  const { data: predictive, isLoading: loadingPredictive } = usePredictiveLayer();
  const simulator = useSimulator();
  const [showSimulator, setShowSimulator] = useState(false);
  const { data: explainability, isLoading: loadingExplain, showBreakdown, setShowBreakdown } = useExplainabilityLayer();
  const { data: trust, isLoading: loadingTrust } = useTrustLayer();
  const [showTrustDetail, setShowTrustDetail] = useState(false);
  const actionLayer = useActionLayer();
  const { summary: autoSummary, suggestions: autoSuggestions, activeRules: autoRules, activateRule } = useAutomationLayer();
  const [showAutoPanel, setShowAutoPanel] = useState(false);

  const showOnboarding = onboardingDone.length < ONBOARDING_STEPS.length;

  const orderedModules = useMemo(() => {
    const customOrder = workspacePrefs.order.length > 0 ? workspacePrefs.order : moduleOrder;
    const pinned = workspacePrefs.pinned;
    return [...MODULES]
      .filter((m) => !workspacePrefs.hidden.includes(m.key))
      .sort((a, b) => {
        const aPinned = pinned.includes(a.key) ? 0 : 1;
        const bPinned = pinned.includes(b.key) ? 0 : 1;
        if (aPinned !== bPinned) return aPinned - bPinned;
        return customOrder.indexOf(a.key) - customOrder.indexOf(b.key);
      });
  }, [moduleOrder, workspacePrefs]);

  useEffect(() => { localStorage.setItem("erp-home-favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("erp-workspace-prefs", JSON.stringify(workspacePrefs)); }, [workspacePrefs]);
  useEffect(() => { localStorage.setItem("erp-onboarding-done", JSON.stringify(onboardingDone)); }, [onboardingDone]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return SEARCHABLE_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.module.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search]);

  const handleNavigate = useCallback((label: string, route: string) => {
    addRecent(label, route);
    navigate(route);
  }, [navigate]);

  const completeOnboardingStep = useCallback((key: string, route: string) => {
    setOnboardingDone((prev) => {
      const next = prev.includes(key) ? prev : [...prev, key];
      return next;
    });
    navigate(route);
  }, [navigate]);

  const toggleFavorite = (item: (typeof SEARCHABLE_ITEMS)[0]) => {
    const exists = tempFavorites.some((f) => f.label === item.label);
    if (exists) {
      setTempFavorites(tempFavorites.filter((f) => f.label !== item.label));
    } else if (tempFavorites.length < 8) {
      const iconName = Object.entries(ICON_MAP).find(([, v]) => v === item.icon)?.[0] || "BarChart3";
      setTempFavorites([...tempFavorites, { label: item.label, route: item.route, icon: iconName }]);
    }
  };

  const toggleModuleHidden = (key: string) => {
    setWorkspacePrefs((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(key) ? prev.hidden.filter((k) => k !== key) : [...prev.hidden, key],
    }));
  };

  const toggleModulePinned = (key: string) => {
    setWorkspacePrefs((prev) => ({
      ...prev,
      pinned: prev.pinned.includes(key) ? prev.pinned.filter((k) => k !== key) : [...prev.pinned, key],
    }));
  };

  const moveModule = (key: string, dir: -1 | 1) => {
    setWorkspacePrefs((prev) => {
      const currentOrder = prev.order.length > 0 ? [...prev.order] : MODULES.map((m) => m.key);
      const idx = currentOrder.indexOf(key);
      if (idx < 0) return prev;
      const newIdx = Math.max(0, Math.min(currentOrder.length - 1, idx + dir));
      const item = currentOrder.splice(idx, 1)[0];
      currentOrder.splice(newIdx, 0, item);
      return { ...prev, order: currentOrder };
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        {/* ── Header + Search ── */}
        <div className="text-center space-y-4 pt-4">
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Central de Navegação</h1>
            <div className="flex items-center gap-1.5 ml-3">
              <Button
                variant={executiveMode ? "default" : "outline"}
                size="sm"
                className="h-7 text-[10px] gap-1 rounded-lg"
                onClick={() => setExecutiveMode((p) => !p)}
              >
                <Monitor className="h-3 w-3" />
                {executiveMode ? "Modo Completo" : "Modo Executivo"}
              </Button>
              <Button
                variant={actionLayer.rapidMode ? "default" : "outline"}
                size="sm"
                className="h-7 text-[10px] gap-1 rounded-lg"
                onClick={() => actionLayer.setRapidMode((p) => !p)}
              >
                <Play className="h-3 w-3" />
                {actionLayer.rapidMode ? "Sair Execução" : "Execução Rápida"}
              </Button>
              {actionLayer.canUndo && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] gap-1 rounded-lg"
                  onClick={actionLayer.undoLast}
                >
                  <Undo2 className="h-3 w-3" /> Desfazer
                </Button>
              )}
            </div>
          </div>
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pedido, cliente, lançamento... (Ctrl+K)"
              className="pl-10 h-11 bg-card border-border text-sm rounded-xl"
              onFocus={() => {}}
            />
            {searchResults.length > 0 && (
              <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
                <CardContent className="p-1">
                  {searchResults.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { setSearch(""); handleNavigate(item.label, item.route); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-muted/60 transition-colors"
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.module}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ── Company Status Cockpit ── */}
        {companyStatus && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-primary" /> Status da Empresa
              </h2>
              <Badge
                variant="outline"
                className={`text-[10px] gap-1 ${
                  companyStatus.health === "estavel"
                    ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                    : companyStatus.health === "atencao"
                    ? "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                    : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
                }`}
              >
                <div className={`h-1.5 w-1.5 rounded-full ${
                  companyStatus.health === "estavel" ? "bg-emerald-500"
                  : companyStatus.health === "atencao" ? "bg-amber-500" : "bg-red-500"
                }`} />
                {companyStatus.health === "estavel" ? "Estável" : companyStatus.health === "atencao" ? "Atenção" : "Risco"}
                {` · ${companyStatus.healthScore}pts`}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {[companyStatus.cashBalance, companyStatus.monthlyResult, companyStatus.openOrders, companyStatus.overduePayables, companyStatus.goalProgress].map((kpi) => {
                const TrendIcon = kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus;
                const trendColor = kpi.trend === "up" ? "text-emerald-600 dark:text-emerald-400" : kpi.trend === "down" ? "text-red-500 dark:text-red-400" : "text-muted-foreground";
                return (
                  <Card key={kpi.label} className="border-border/60">
                    <CardContent className="p-3">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-sm font-bold truncate">{kpi.formatted}</p>
                        <TrendIcon className={`h-3 w-3 shrink-0 ${trendColor}`} />
                      </div>
                      {kpi.trendLabel && (
                        <p className={`text-[9px] mt-0.5 ${trendColor}`}>{kpi.trendLabel}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        {loadingStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        )}

        {/* ── Decision Suggestions ── */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Decisões Sugeridas Hoje
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {suggestions.map((s) => {
                const prioColor = s.priority === 1 ? "border-destructive/40 bg-destructive/5 dark:bg-destructive/10" : s.priority === 2 ? "border-amber-300/60 bg-amber-50/50 dark:border-amber-700/40 dark:bg-amber-950/20" : "border-border bg-card";
                const prioLabel = s.priority === 1 ? "Crítica" : s.priority === 2 ? "Relevante" : "Recomendada";
                const prioBadge = s.priority === 1 ? "bg-destructive text-destructive-foreground" : s.priority === 2 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-muted text-muted-foreground";
                const impactIcon = s.impact.type === "caixa" ? DollarSign : s.impact.type === "faturamento" ? TrendingUp : Activity;
                const ImpactIcon = impactIcon;
                return (
                  <button key={s.id} onClick={() => handleNavigate(s.title, s.route)} className={`rounded-xl border p-3.5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${prioColor}`}>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={`text-[9px] h-4 ${prioBadge}`}>{prioLabel}</Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-semibold">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                      <ImpactIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[9px] font-medium text-muted-foreground">{s.impact.label}</span>
                    </div>
                    <div className="mt-1.5">
                      <Badge variant="outline" className="text-[9px] h-4 gap-1">
                        <Zap className="h-2.5 w-2.5" /> {s.action}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {loadingSuggestions && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        )}

        {/* ── Operational Timeline (7 days) ── */}
        {!executiveMode && timeline.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Próximos 7 Dias
            </h2>
            <Card>
              <CardContent className="p-3">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1.5">
                    {timeline.map((ev) => {
                      const typeConfig = {
                        payment: { color: "text-destructive", label: "Pagamento" },
                        receivable: { color: "text-emerald-600 dark:text-emerald-400", label: "Recebimento" },
                        delivery: { color: "text-blue-600 dark:text-blue-400", label: "Entrega" },
                        order: { color: "text-amber-600 dark:text-amber-400", label: "Pedido" },
                      };
                      const cfg = typeConfig[ev.type] || typeConfig.payment;
                      return (
                        <div key={ev.id} className="flex items-center gap-3 px-2.5 py-2 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                          <span className="text-[10px] font-mono text-muted-foreground w-14 shrink-0">
                            {fmtDate(new Date(ev.date), "dd/MM")}
                          </span>
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.color === "text-destructive" ? "bg-destructive" : cfg.color.includes("emerald") ? "bg-emerald-500" : cfg.color.includes("blue") ? "bg-blue-500" : "bg-amber-500"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{ev.label}</p>
                            <Badge variant="outline" className="text-[9px] h-3.5">{cfg.label}</Badge>
                          </div>
                          {ev.formatted && (
                            <span className={`text-xs font-semibold whitespace-nowrap ${cfg.color}`}>{ev.formatted}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Predictive Layer ── */}
        {predictive && (
          <div className="space-y-4">
            {/* Projections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Previsões
                </h2>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[9px] gap-1 ${
                      predictive.riskLevel === "baixo"
                        ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                        : predictive.riskLevel === "moderado"
                        ? "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                        : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
                    }`}
                  >
                    <ShieldAlert className="h-2.5 w-2.5" />
                    Risco {predictive.riskLevel}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] gap-1">
                    <Gauge className="h-2.5 w-2.5" />
                    Saúde {predictive.healthScore}pts
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {[predictive.projections.cash7d, predictive.projections.cash30d, predictive.projections.monthResult, predictive.projections.goalPct].map((p) => (
                  <Card key={p.label} className={`border-border/60 ${p.isNegative ? "border-destructive/30 bg-destructive/5 dark:bg-destructive/10" : ""}`}>
                    <CardContent className="p-3">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{p.label}</p>
                      <p className={`text-sm font-bold mt-1 ${p.isNegative ? "text-destructive" : ""}`}>{p.formatted}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Trends */}
            {predictive.trends.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Tendências Detectadas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {predictive.trends.map((t, i) => {
                    const signalIcon = t.signal === "acelerando" ? ArrowUpRight
                      : t.signal === "desacelerando" ? ArrowDownRight
                      : t.signal === "comprimindo" ? TrendingDown : Minus;
                    const SignalIcon = signalIcon;
                    const signalColor = t.signal === "acelerando" ? "text-emerald-600 dark:text-emerald-400"
                      : t.signal === "desacelerando" || t.signal === "comprimindo" ? "text-destructive" : "text-muted-foreground";
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className={`text-[10px] gap-1 cursor-help ${signalColor}`}>
                            <SignalIcon className="h-3 w-3" />
                            {t.metric}: {t.signal}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">{t.description}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Predictive Alerts */}
            {predictive.alerts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Alertas Antecipados
                </h3>
                <div className="space-y-1.5">
                  {predictive.alerts.map((a) => (
                    <div
                      key={a.id}
                      className={`rounded-lg border p-2.5 flex items-start gap-2.5 ${
                        a.severity === "danger"
                          ? "border-destructive/40 bg-destructive/5 dark:bg-destructive/10"
                          : "border-amber-300/60 bg-amber-50/50 dark:border-amber-700/40 dark:bg-amber-950/20"
                      }`}
                    >
                      <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${a.severity === "danger" ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`} />
                      <div>
                        <p className="text-xs font-semibold">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Simulator */}
            <div className="space-y-2">
              <button
                onClick={() => setShowSimulator((p) => !p)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Calculator className="h-3.5 w-3.5" />
                Simulador Rápido
                <ChevronRight className={`h-3 w-3 transition-transform ${showSimulator ? "rotate-90" : ""}`} />
              </button>
              {showSimulator && (
                <Card className="border-border/60">
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-muted-foreground font-medium">Receita: {simulator.revenueChange > 0 ? "+" : ""}{simulator.revenueChange}%</label>
                        <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => simulator.setRevenueChange(0)}>Reset</Button>
                      </div>
                      <Slider value={[simulator.revenueChange]} onValueChange={([v]) => simulator.setRevenueChange(v)} min={-30} max={30} step={5} className="w-full" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-muted-foreground font-medium">Despesas: {simulator.expenseChange > 0 ? "+" : ""}{simulator.expenseChange}%</label>
                        <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => simulator.setExpenseChange(0)}>Reset</Button>
                      </div>
                      <Slider value={[simulator.expenseChange]} onValueChange={([v]) => simulator.setExpenseChange(v)} min={-30} max={30} step={5} className="w-full" />
                    </div>
                    {(() => {
                      const curRev = predictive.projections.monthResult.value > 0
                        ? predictive.projections.monthResult.value * 2
                        : 100000;
                      const curExp = curRev - predictive.projections.monthResult.value;
                      const sim = simulator.simulate(curRev, curExp);
                      return (
                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Resultado Simulado</p>
                            <p className={`text-sm font-bold ${sim.simulatedResult < 0 ? "text-destructive" : ""}`}>{sim.formatted}</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${sim.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : sim.delta < 0 ? "text-destructive" : ""}`}>
                            {sim.delta > 0 ? "+" : ""}{sim.delta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </Badge>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
        {loadingPredictive && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        )}

        {/* ── Explainability Layer ── */}
        {explainability && (
          <div className="space-y-4">
            {/* Natural Language Summary */}
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex items-start gap-2.5">
              <MessageSquareText className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-foreground">{explainability.naturalLanguage}</p>
            </div>

            {/* Top 3 Impacts */}
            {explainability.topImpacts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" /> Top Impactos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {explainability.topImpacts.map((imp, i) => (
                    <Card key={i} className={`border-border/60 ${
                      imp.type === "negative" ? "border-destructive/30 bg-destructive/5 dark:bg-destructive/10"
                      : imp.type === "positive" ? "border-emerald-300/40 bg-emerald-50/50 dark:border-emerald-700/30 dark:bg-emerald-950/20"
                      : "border-amber-300/40 bg-amber-50/50 dark:border-amber-700/30 dark:bg-amber-950/20"
                    }`}>
                      <CardContent className="p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="outline" className={`text-[9px] px-1.5 ${
                            imp.type === "negative" ? "text-destructive border-destructive/30"
                            : imp.type === "positive" ? "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                            : "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                          }`}>
                            {imp.type === "negative" ? "▼ Negativo" : imp.type === "positive" ? "▲ Positivo" : "⬤ Instável"}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-semibold truncate">{imp.label}</p>
                        <p className="text-[10px] text-muted-foreground">{imp.formatted}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Historical Comparisons */}
            {explainability.historicalComparisons.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <BarChart className="h-3.5 w-3.5" /> Comparação Histórica
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {explainability.historicalComparisons.map((c, i) => (
                    <Card key={i} className="border-border/60">
                      <CardContent className="p-2.5">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{c.metric}</p>
                        <div className="flex items-end justify-between mt-1">
                          <p className="text-sm font-bold">{c.formatted.current}</p>
                          <div className="flex items-center gap-0.5">
                            {c.direction === "up" ? <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                              : c.direction === "down" ? <ArrowDownRight className="h-3 w-3 text-destructive" />
                              : <Minus className="h-3 w-3 text-muted-foreground" />}
                            <span className={`text-[10px] font-medium ${
                              c.direction === "up" ? "text-emerald-600 dark:text-emerald-400"
                              : c.direction === "down" ? "text-destructive" : "text-muted-foreground"
                            }`}>{c.pctChange > 0 ? "+" : ""}{c.pctChange.toFixed(1)}%</span>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Média: {c.formatted.average}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Anomalies */}
            {explainability.anomalies.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" /> Anomalias Detectadas
                </h3>
                <div className="space-y-1.5">
                  {explainability.anomalies.map((a) => (
                    <div key={a.id} className={`rounded-lg border p-2.5 flex items-start gap-2.5 ${
                      a.severity === "critical"
                        ? "border-destructive/40 bg-destructive/5 dark:bg-destructive/10"
                        : "border-amber-300/60 bg-amber-50/50 dark:border-amber-700/40 dark:bg-amber-950/20"
                    }`}>
                      <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                        a.severity === "critical" ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] shrink-0 ${
                        a.severity === "critical" ? "text-destructive border-destructive/30" : "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                      }`}>+{a.deviation.toFixed(0)}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variance Drivers */}
            {explainability.drivers.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowBreakdown((p) => !p)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BarChart className="h-3.5 w-3.5" />
                  Entender Resultado do Mês
                  <ChevronRight className={`h-3 w-3 transition-transform ${showBreakdown ? "rotate-90" : ""}`} />
                </button>
                {showBreakdown && (
                  <Card className="border-border/60">
                    <CardContent className="p-3 space-y-3">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Ranking de Impacto por Categoria</p>
                      <div className="space-y-1.5">
                        {explainability.drivers.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-4 text-right">{i + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium truncate">{d.category}</span>
                                <span className={`text-[10px] font-semibold ${d.direction === "positive" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                                  {d.direction === "positive" ? "+" : "-"}{d.formatted}
                                </span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${d.direction === "positive" ? "bg-emerald-500" : "bg-destructive"}`}
                                  style={{ width: `${Math.min(d.pctImpact, 100)}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-[9px] text-muted-foreground w-8 text-right">{d.pctImpact}%</span>
                          </div>
                        ))}
                      </div>

                      {/* Revenue vs Expense breakdown */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Receitas</p>
                          {explainability.monthBreakdown.revenue.slice(0, 5).map((r, i) => (
                            <div key={i} className="flex justify-between text-[10px] py-0.5">
                              <span className="text-muted-foreground truncate mr-2">{r.category}</span>
                              <span className="font-medium shrink-0">{r.formatted}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-destructive mb-1">Despesas</p>
                          {explainability.monthBreakdown.expenses.slice(0, 5).map((e, i) => (
                            <div key={i} className="flex justify-between text-[10px] py-0.5">
                              <span className="text-muted-foreground truncate mr-2">{e.category}</span>
                              <span className="font-medium shrink-0">{e.formatted}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
        {loadingExplain && (
          <Skeleton className="h-16 rounded-xl" />
        )}

        {/* ── Trust Layer ── */}
        {trust && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Confiabilidade dos Dados
              </h2>
              <Badge variant="outline" className={`text-[9px] gap-1 ${
                trust.overallScore >= 80 ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                : trust.overallScore >= 50 ? "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
              }`}>
                {trust.overallScore}% confiável
              </Badge>
            </div>

            {/* 4 Trust Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[trust.reconciliation, trust.classification, trust.cadastralQuality, trust.forecastCoverage].map((m) => (
                <Card key={m.label} className="border-border/60">
                  <CardContent className="p-2.5">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{m.label}</p>
                    <div className="flex items-end justify-between mt-1">
                      <p className="text-sm font-bold">{m.value}%</p>
                      <Badge variant="outline" className={`text-[8px] px-1 ${
                        m.level === "alta" ? "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                        : m.level === "média" ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                        : "text-destructive border-destructive/30"
                      }`}>{m.level}</Badge>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        m.level === "alta" ? "bg-emerald-500" : m.level === "média" ? "bg-amber-500" : "bg-destructive"
                      }`} style={{ width: `${m.value}%` }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Expandable details */}
            <button
              onClick={() => setShowTrustDetail((p) => !p)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <Database className="h-3.5 w-3.5" />
              Detalhes de Confiabilidade
              <ChevronRight className={`h-3 w-3 transition-transform ${showTrustDetail ? "rotate-90" : ""}`} />
            </button>

            {showTrustDetail && (
              <Card className="border-border/60">
                <CardContent className="p-3 space-y-4">
                  {/* Maturity */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Maturidade Operacional</p>
                      <p className="text-xs font-semibold mt-0.5 capitalize">{trust.maturity.level}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] ${
                      trust.maturity.level === "avançado" ? "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                      : trust.maturity.level === "intermediário" ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                      : "text-muted-foreground"
                    }`}>{trust.maturity.score}pts</Badge>
                  </div>

                  {/* Data Freshness */}
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Atualização dos Dados
                    </p>
                    <div className="space-y-1.5">
                      {trust.freshness.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{f.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-medium ${f.fresh ? "text-foreground" : "text-destructive"}`}>{f.ageLabel}</span>
                            <div className={`h-1.5 w-1.5 rounded-full ${f.fresh ? "bg-emerald-500" : "bg-destructive"}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* KPI Confidence */}
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Confiança por KPI</p>
                    <div className="space-y-1.5">
                      {trust.kpiConfidence.map((k, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{k.kpi}</span>
                            <p className="text-[9px] text-muted-foreground truncate">{k.reason}</p>
                          </div>
                          <Badge variant="outline" className={`text-[8px] px-1 ml-2 shrink-0 ${
                            k.level === "alta" ? "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                            : k.level === "média" ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                            : "text-destructive border-destructive/30"
                          }`}>{k.level}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        {loadingTrust && <Skeleton className="h-28 rounded-xl" />}

        {/* ── Onboarding Guide ── */}
        {showOnboarding && (
          <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Rocket className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Primeiros Passos</h2>
                <Badge variant="outline" className="text-[10px] ml-auto">
                  {onboardingDone.length}/{ONBOARDING_STEPS.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {ONBOARDING_STEPS.map((step) => {
                  const done = onboardingDone.includes(step.key);
                  return (
                    <Button
                      key={step.key}
                      variant={done ? "ghost" : "outline"}
                      size="sm"
                      className={`h-9 text-xs gap-2 rounded-lg ${done ? "opacity-60 line-through" : "border-primary/30 hover:border-primary/60"}`}
                      onClick={() => completeOnboardingStep(step.key, step.route)}
                      disabled={done}
                    >
                      {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <step.icon className="h-3.5 w-3.5 text-primary" />}
                      {step.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Hoje Preciso Fazer ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Hoje Preciso Fazer
            </h2>
            {actionItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant={actionLayer.batchMode ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[9px] gap-1 rounded-md"
                  onClick={() => { actionLayer.setBatchMode((p) => !p); if (actionLayer.batchMode) actionLayer.clearBatch(); }}
                >
                  <ListChecks className="h-3 w-3" />
                  {actionLayer.batchMode ? "Cancelar Lote" : "Selecionar"}
                </Button>
                {actionLayer.batchMode && actionLayer.selectedItems.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[9px] h-5">{actionLayer.selectedItems.length} selecionado(s)</Badge>
                    <Button size="sm" className="h-6 text-[9px] gap-1 rounded-md" onClick={() => actionLayer.executeBatch("pay")}>
                      <DollarSign className="h-2.5 w-2.5" /> Pagar
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 text-[9px] gap-1 rounded-md" onClick={() => actionLayer.executeBatch("reschedule")}>
                      <Calendar className="h-2.5 w-2.5" /> Reagendar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          {loadingActions ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : actionItems.length === 0 ? (
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="text-sm text-muted-foreground">Tudo em dia! Nenhuma pendência urgente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {actionItems.map((item) => {
                const alertActions = actionLayer.getActionsForAlert(item.id);
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 transition-all hover:shadow-md ${SEVERITY_STYLES[item.severity]} ${
                      actionLayer.batchMode && actionLayer.isBatchSelected(item.id, "action") ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {actionLayer.batchMode && (
                        <Checkbox
                          checked={actionLayer.isBatchSelected(item.id, "action")}
                          onCheckedChange={() => actionLayer.toggleBatchItem({ id: item.id, label: item.label, table: item.id.includes("payable") ? "fin_payables" : item.id.includes("receivable") ? "fin_receivables" : "action" })}
                          className="mt-1 shrink-0"
                        />
                      )}
                      <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${SEVERITY_DOT[item.severity]}`} />
                      <div className="flex-1 min-w-0">
                        <button onClick={() => handleNavigate(item.label, item.route)} className="text-left w-full">
                          <p className="text-xs font-semibold truncate">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>
                        </button>
                        {/* Inline Action Buttons */}
                        {alertActions.length > 0 && !actionLayer.batchMode && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {alertActions.map((a) => (
                              <Button
                                key={a.id}
                                variant="outline"
                                size="sm"
                                className="h-5 text-[9px] px-1.5 gap-0.5 rounded-md"
                                onClick={(e) => { e.stopPropagation(); handleNavigate(a.label, item.route); }}
                              >
                                {a.icon === "pay" && <DollarSign className="h-2.5 w-2.5" />}
                                {a.icon === "reschedule" && <Calendar className="h-2.5 w-2.5" />}
                                {a.icon === "reconcile" && <CheckSquare className="h-2.5 w-2.5" />}
                                {a.icon === "approve" && <CheckCircle2 className="h-2.5 w-2.5" />}
                                {a.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      {!actionLayer.batchMode && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 cursor-pointer" onClick={() => handleNavigate(item.label, item.route)} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Quick Actions (hidden in executive & rapid mode) ── */}
        {!executiveMode && !actionLayer.rapidMode && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Ações Rápidas
          </h2>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button key={action.label} variant="outline" size="sm" className="h-9 text-xs gap-2 rounded-lg hover:shadow-sm" onClick={() => handleNavigate(action.label, action.route)}>
                <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
        )}

        {/* ── Automation Layer ── */}
        {!executiveMode && !actionLayer.rapidMode && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-500" /> Automações
            </h2>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] h-5">
                {autoSummary.executedToday} hoje
              </Badge>
              {autoSummary.failed > 0 && (
                <Badge variant="destructive" className="text-[9px] h-5">
                  {autoSummary.failed} falha(s)
                </Badge>
              )}
              {autoSummary.paused > 0 && (
                <Badge variant="secondary" className="text-[9px] h-5">
                  {autoSummary.paused} pausada(s)
                </Badge>
              )}
              <Button variant="outline" size="sm" className="h-6 text-[9px] gap-1 rounded-md" onClick={() => setShowAutoPanel((p) => !p)}>
                {showAutoPanel ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                {showAutoPanel ? "Ocultar" : "Detalhes"}
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card className="border-violet-200/60 dark:border-violet-800/40">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Play className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{autoSummary.executedToday}</p>
                  <p className="text-[9px] text-muted-foreground">Executadas hoje</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-200/60 dark:border-amber-800/40">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{autoSummary.pending}</p>
                  <p className="text-[9px] text-muted-foreground">Pendentes</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200/60 dark:border-red-800/40">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{autoSummary.failed}</p>
                  <p className="text-[9px] text-muted-foreground">Falhas</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-muted">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{autoSummary.paused}</p>
                  <p className="text-[9px] text-muted-foreground">Pausadas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Suggestions */}
          {autoSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sugestões de Automação</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {autoSuggestions.slice(0, 4).map((s) => (
                  <div key={s.id} className="rounded-xl border p-3 bg-card/50 hover:bg-muted/40 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="outline" className="text-[8px] h-4 px-1">
                            {s.type === "financeiro" ? "Financeiro" : "Operacional"}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold truncate">{s.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.description}</p>
                      </div>
                      <Button
                        size="sm"
                        className="h-6 text-[9px] gap-1 rounded-md shrink-0"
                        onClick={async () => {
                          const ok = await activateRule(s);
                          if (ok) {
                            // Refetch will remove it from suggestions
                          }
                        }}
                      >
                        <Zap className="h-2.5 w-2.5" /> Ativar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expanded Panel: Recent Executions */}
          {showAutoPanel && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Execuções Recentes</p>
              {autoSummary.recentExecutions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma execução hoje.</p>
              ) : (
                <div className="space-y-1">
                  {autoSummary.recentExecutions.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-2 rounded-lg border p-2 text-xs">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${ex.status === "sucesso" || ex.status === "simulacao" ? "bg-emerald-500" : ex.status === "falha" ? "bg-red-500" : "bg-amber-500"}`} />
                      <span className="font-medium flex-1 truncate">{ex.ruleName}</span>
                      <Badge variant={ex.status === "falha" ? "destructive" : "outline"} className="text-[8px] h-4">
                        {ex.status}
                      </Badge>
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {new Date(ex.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Rules List */}
              {autoRules.length > 0 && (
                <>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-3">Regras Ativas</p>
                  <div className="space-y-1">
                    {autoRules.filter((r: any) => r.active).slice(0, 6).map((r: any) => (
                      <div key={r.id} className="flex items-center gap-2 rounded-lg border p-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="font-medium flex-1 truncate">{r.name}</span>
                        <span className="text-[9px] text-muted-foreground">{r.execution_count || 0}x</span>
                        {(r.error_count || 0) > 0 && (
                          <Badge variant="destructive" className="text-[8px] h-4">{r.error_count} erro(s)</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        )}

        {!executiveMode && !actionLayer.rapidMode && (
        <>
        {/* ── Favorites ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Favoritos</h2>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => { setTempFavorites([...favorites]); setEditFavDialog(true); }}>
              <Pencil className="h-3 w-3" /> Editar
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {favorites.map((fav, i) => {
              const Icon = ICON_MAP[fav.icon] || Star;
              return (
                <button key={i} onClick={() => handleNavigate(fav.label, fav.route)} className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card/50 p-3 hover:bg-muted/60 hover:border-primary/20 transition-all duration-200">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight">{fav.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Continue Where Left Off ── */}
        {continueItems.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-muted-foreground" /> Continuar de Onde Parei
            </h2>
            <div className="flex flex-wrap gap-2">
              {continueItems.map((r, i) => (
                <Button key={i} variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg" onClick={() => handleNavigate(r.label, r.route)}>
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* ── Module Grid (profile-ordered + workspace) ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" /> Módulos
            </h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => setWorkspaceDialog(true)}>
              <SlidersHorizontal className="h-3 w-3" /> Personalizar
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orderedModules.map((mod) => {
              const isExpanded = expandedModule === mod.key;
              const preview = modulePreviews?.[mod.key];
              const isPinned = workspacePrefs.pinned.includes(mod.key);
              return (
                <Card
                  key={mod.key}
                  className={`relative overflow-hidden border transition-all duration-300 cursor-pointer ${mod.borderColor} ${isExpanded ? "ring-1 ring-primary/20 shadow-md" : "hover:shadow-md"} ${isPinned ? "ring-1 ring-amber-300/30" : ""}`}
                  onClick={() => setExpandedModule(isExpanded ? null : mod.key)}
                >
                  <CardContent className="p-0">
                    <div className={`bg-gradient-to-br ${mod.color} p-4`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-background/80 dark:bg-background/40 flex items-center justify-center shadow-sm">
                            <mod.icon className={`h-5 w-5 ${mod.iconColor}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold text-sm">{mod.label}</h3>
                              {isPinned && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{mod.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Preview alert dots */}
                          {preview && preview.alerts.length > 0 && (
                            <div className="flex gap-0.5 mr-1">
                              {preview.alerts.slice(0, 3).map((a, i) => (
                                <Tooltip key={i}>
                                  <TooltipTrigger asChild>
                                    <div className={`h-2 w-2 rounded-full ${PREVIEW_DOT[a.severity]}`} />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">{a.label}</TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          )}
                          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                      </div>
                    </div>

                    {/* Expanded: preview + items */}
                    <div className={`grid transition-all duration-300 overflow-hidden ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="overflow-hidden">
                        {/* Module preview alerts */}
                        {preview && preview.alerts.length > 0 && (
                          <div className="px-3 pt-2 pb-1 border-t border-border/50 space-y-1">
                            {preview.alerts.map((alert, i) => (
                              <div key={i} className="flex items-center gap-2 text-[10px]">
                                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${PREVIEW_DOT[alert.severity]}`} />
                                <span className="text-muted-foreground">{alert.label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className={`p-2 ${!preview || preview.alerts.length === 0 ? "border-t border-border/50" : ""} space-y-0.5`}>
                          {mod.items.map((item, j) => (
                            <button
                              key={j}
                              onClick={(e) => { e.stopPropagation(); handleNavigate(item.label, item.route); }}
                              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left hover:bg-muted/60 transition-colors group/item"
                            >
                              <item.icon className={`h-3.5 w-3.5 ${mod.iconColor} opacity-70 group-hover/item:opacity-100 transition-opacity`} />
                              <span className="text-xs font-medium flex-1">{item.label}</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
        </>
        )}
      </div>

      {/* ── FAB + Create Menu ── */}
      <div className="fixed bottom-6 right-6 z-40">
        {fabOpen && (
          <div className="absolute bottom-14 right-0 mb-2 space-y-1.5 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant="secondary"
                className="w-full justify-start gap-2 text-xs shadow-md rounded-lg h-9"
                onClick={() => { setFabOpen(false); handleNavigate(action.label, action.route); }}
              >
                <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
                {action.label}
              </Button>
            ))}
          </div>
        )}
        <Button
          size="lg"
          className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all p-0"
          onClick={() => setFabOpen((p) => !p)}
        >
          <Plus className={`h-5 w-5 transition-transform duration-200 ${fabOpen ? "rotate-45" : ""}`} />
        </Button>
      </div>

      {/* ── Edit Favorites Dialog ── */}
      <Dialog open={editFavDialog} onOpenChange={setEditFavDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" /> Editar Favoritos
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-2">
            <div className="space-y-4">
              {MODULES.map((mod) => (
                <div key={mod.key}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">{mod.label}</p>
                  <div className="space-y-1">
                    {mod.items.map((item, j) => {
                      const checked = tempFavorites.some((f) => f.label === item.label);
                      return (
                        <label key={j} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                          <Checkbox checked={checked} onCheckedChange={() => toggleFavorite({ ...item, module: mod.label })} disabled={!checked && tempFavorites.length >= 8} />
                          <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between pt-2">
            <Badge variant="outline" className="text-[10px]">{tempFavorites.length}/8 selecionados</Badge>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditFavDialog(false)}>Cancelar</Button>
              <Button size="sm" onClick={() => { setFavorites(tempFavorites); setEditFavDialog(false); }}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Workspace Personalization Dialog ── */}
      <Dialog open={workspaceDialog} onOpenChange={setWorkspaceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" /> Personalizar Módulos
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-2">
            <div className="space-y-1">
              {MODULES.map((mod) => {
                const isHidden = workspacePrefs.hidden.includes(mod.key);
                const isPinned = workspacePrefs.pinned.includes(mod.key);
                return (
                  <div key={mod.key} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 transition-colors ${isHidden ? "opacity-50" : ""}`}>
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <mod.icon className={`h-4 w-4 ${mod.iconColor} shrink-0`} />
                    <span className="text-xs font-medium flex-1">{mod.label}</span>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveModule(mod.key, -1)}>
                            <ChevronRight className="h-3 w-3 -rotate-90" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Mover para cima</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveModule(mod.key, 1)}>
                            <ChevronRight className="h-3 w-3 rotate-90" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Mover para baixo</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant={isPinned ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => toggleModulePinned(mod.key)}>
                            <Star className={`h-3 w-3 ${isPinned ? "fill-current" : ""}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">{isPinned ? "Desfixar" : "Fixar"}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleModuleHidden(mod.key)}>
                            {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">{isHidden ? "Mostrar" : "Ocultar"}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setWorkspacePrefs({ order: [], hidden: [], pinned: [] })}>
              Resetar Padrão
            </Button>
            <Button size="sm" onClick={() => setWorkspaceDialog(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
