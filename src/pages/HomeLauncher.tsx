import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search, ChevronRight, Plus,
  LayoutGrid, AlertTriangle,
  Lightbulb, Calendar, DollarSign,
  Sparkles, Calculator,
  ShieldAlert, Gauge, BarChart,
  MessageSquareText, ShieldCheck, RefreshCw, Database,
  Undo2, ListChecks, Play, CheckSquare,
  ArrowUpRight, ArrowDownRight, TrendingDown, Minus, TrendingUp,
  Activity, Zap, Clock, CheckCircle2,
  Brain, Repeat, ArrowRight,
  Users, UserCheck, MessageCircle, Eye, EyeOff,
} from "lucide-react";
import {
  useActionItems,
  useContinueItems,
  useUserProfile,
} from "@/hooks/useSmartLauncher";
import { useDecisionSuggestions, useOperationalTimeline } from "@/hooks/useDecisionLayer";
import { format as fmtDate } from "date-fns";
import { usePredictiveLayer, useSimulator } from "@/hooks/usePredictiveLayer";
import { Slider } from "@/components/ui/slider";
import { useExplainabilityLayer } from "@/hooks/useExplainabilityLayer";
import { useTrustLayer } from "@/hooks/useTrustLayer";
import { useActionLayer } from "@/hooks/useActionLayer";
import { useAutomationLayer } from "@/hooks/useAutomationLayer";
import { useCollaborationLayer, type CollabFilter } from "@/hooks/useCollaborationLayer";
import { useLearningLayer } from "@/hooks/useLearningLayer";
import { Checkbox } from "@/components/ui/checkbox";
import { MiniActivityFeed } from "@/components/activity/ActivityFeed";
import { NotificationSummaryWidget } from "@/components/notifications/NotificationSummaryWidget";
import { FlowWidget } from "@/components/flow/FlowPanel";
import { DataIntegrityWidget } from "@/components/integrity/DataIntegrityWidget";
import { AutomationEngineWidget } from "@/components/automation/AutomationEngineWidget";
import { ScenarioForecastWidget } from "@/components/forecast/ScenarioForecastWidget";
import { PerformanceIntelligenceWidget } from "@/components/performance/PerformanceIntelligenceWidget";
import { GovernanceWidget } from "@/components/governance/GovernanceWidget";
import { MasterDataWidget } from "@/components/masterdata/MasterDataWidget";
import { IntegrationLayerWidget } from "@/components/integration/IntegrationLayerWidget";
import { OnboardingActivationWidget } from "@/components/onboarding/OnboardingActivationWidget";

// ── New command center components ──
import { ExecutiveStatusBar } from "@/components/command-center/ExecutiveStatusBar";
import {
  RegistrarBlock, AcompanharBlock, AnalisarBlock,
  PlanejarBlock, ResolverBlock, EstrategiaBlock,
} from "@/components/command-center/TaskBlocks";
import { WorkspaceModeSelector } from "@/components/command-center/WorkspaceModeSelector";
import { SetupPriorityWidget } from "@/components/smart-empty-states/SetupPriorityWidget";

// ── Searchable items for command palette ──
const SEARCHABLE_ITEMS = [
  { label: "Nova Receita", route: "/financeiro", module: "Registrar" },
  { label: "Nova Despesa", route: "/financeiro", module: "Registrar" },
  { label: "Nova Proposta", route: "/pedidos", module: "Registrar" },
  { label: "Novo Cliente", route: "/crm-comercial", module: "Registrar" },
  { label: "Importar OFX", route: "/financeiro", module: "Registrar" },
  { label: "Fluxo de Caixa", route: "/bi-dashboard", module: "Acompanhar" },
  { label: "Pipeline Vendas", route: "/crm-comercial", module: "Acompanhar" },
  { label: "Contas Vencendo", route: "/financeiro", module: "Acompanhar" },
  { label: "Metas do Mês", route: "/planning", module: "Acompanhar" },
  { label: "Produção Ativa", route: "/producao-operacoes", module: "Acompanhar" },
  { label: "DRE Gerencial", route: "/bi-dashboard", module: "Analisar" },
  { label: "Forecast Financeiro", route: "/bi-dashboard", module: "Analisar" },
  { label: "Indicadores Executivos", route: "/executive", module: "Analisar" },
  { label: "Relatórios", route: "/relatorios", module: "Analisar" },
  { label: "Benchmarks", route: "/benchmarking", module: "Analisar" },
  { label: "Criar Metas", route: "/planning", module: "Planejar" },
  { label: "Simular Cenários", route: "/planning", module: "Planejar" },
  { label: "Orçamento", route: "/planning", module: "Planejar" },
  { label: "Control Tower", route: "/control-tower", module: "Estratégia" },
  { label: "Decision Assistant", route: "/ai-decision", module: "Estratégia" },
  { label: "Pedidos", route: "/pedidos", module: "Operações" },
  { label: "Produção", route: "/producao-operacoes", module: "Operações" },
  { label: "Projetos", route: "/projetos", module: "Operações" },
  { label: "Estoque", route: "/estoque", module: "Cadastros" },
  { label: "Fornecedores", route: "/fornecedores", module: "Cadastros" },
  { label: "Clientes", route: "/crm-comercial", module: "Cadastros" },
  { label: "Plano de Contas", route: "/cadastros-financeiros", module: "Cadastros" },
  { label: "Tesouraria", route: "/financeiro", module: "Financeiro" },
  { label: "Conciliação", route: "/financeiro", module: "Financeiro" },
  { label: "Configurações", route: "/settings", module: "Sistema" },
  { label: "Usuários", route: "/settings/users", module: "Sistema" },
  { label: "Automações", route: "/automacoes", module: "Sistema" },
  { label: "Auditoria", route: "/auditoria", module: "Sistema" },
  { label: "RH", route: "/rh", module: "Pessoas" },
  { label: "Suprimentos", route: "/suprimentos", module: "Operações" },
  { label: "CRM", route: "/crm-comercial", module: "Vendas" },
  { label: "Leads", route: "/leads", module: "Vendas" },
  { label: "Clientes", route: "/clientes", module: "Vendas" },
  { label: "Catálogo", route: "/catalogo", module: "Vendas" },
];

// ── Severity helpers ──
const SEVERITY_STYLES = {
  red: "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30",
  yellow: "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30",
  green: "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30",
};
const SEVERITY_DOT = { red: "bg-red-500", yellow: "bg-amber-500", green: "bg-emerald-500" };

function addRecent(label: string, route: string) {
  try {
    const stored = localStorage.getItem("erp-home-recents");
    const recents: any[] = stored ? JSON.parse(stored) : [];
    const filtered = recents.filter((r: any) => r.label !== label);
    filtered.unshift({ label, route, time: new Date().toISOString() });
    localStorage.setItem("erp-home-recents", JSON.stringify(filtered.slice(0, 8)));
  } catch {}
}

export default function HomeLauncher() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: actionItems = [], isLoading: loadingActions } = useActionItems();
  const continueItems = useContinueItems();
  const userProfile = useUserProfile();
  const { data: suggestions = [], isLoading: loadingSuggestions } = useDecisionSuggestions();
  const { data: timeline = [] } = useOperationalTimeline();
  const [fabOpen, setFabOpen] = useState(false);
  const { data: predictive, isLoading: loadingPredictive } = usePredictiveLayer();
  const simulator = useSimulator();
  const [showSimulator, setShowSimulator] = useState(false);
  const { data: explainability, isLoading: loadingExplain, showBreakdown, setShowBreakdown } = useExplainabilityLayer();
  const { data: trust, isLoading: loadingTrust } = useTrustLayer();
  const [showTrustDetail, setShowTrustDetail] = useState(false);
  const actionLayer = useActionLayer();
  const { summary: autoSummary, suggestions: autoSuggestions, activeRules: autoRules, activateRule } = useAutomationLayer();
  const [showAutoPanel, setShowAutoPanel] = useState(false);
  const [collabFilter, setCollabFilter] = useState<CollabFilter>("mine");
  const { data: collab } = useCollaborationLayer(collabFilter);
  const [showCollabTimeline, setShowCollabTimeline] = useState(false);
  const learning = useLearningLayer();

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return SEARCHABLE_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.module.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search]);

  const handleNavigate = useCallback((label: string, route: string) => {
    addRecent(label, route);
    learning.recordNavigation(label, route);
    navigate(route);
  }, [navigate, learning]);

  const QUICK_ACTIONS = [
    { label: "Nova Receita", route: "/financeiro", color: "text-emerald-600 dark:text-emerald-400", icon: Plus },
    { label: "Nova Despesa", route: "/financeiro", color: "text-red-500 dark:text-red-400", icon: DollarSign },
    { label: "Nova Proposta", route: "/pedidos", color: "text-blue-600 dark:text-blue-400", icon: ListChecks },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        {/* ══ HEADER ══ */}
        <div className="text-center space-y-4 pt-4">
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          </div>
          {/* Workspace Mode Selector */}
          <div className="flex items-center justify-center gap-2">
            <WorkspaceModeSelector />
            <Button
              variant={actionLayer.rapidMode ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] gap-1 rounded-lg"
              onClick={() => actionLayer.setRapidMode((p: boolean) => !p)}
            >
              <Play className="h-3 w-3" />
              {actionLayer.rapidMode ? "Sair Execução" : "Execução Rápida"}
            </Button>
            {actionLayer.canUndo && (
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 rounded-lg" onClick={actionLayer.undoLast}>
                <Undo2 className="h-3 w-3" /> Desfazer
              </Button>
            )}
          </div>
          {/* Universal Search */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ação, módulo, relatório, cadastro... (Ctrl+K)"
              className="pl-10 h-11 bg-card border-border text-sm rounded-xl"
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

        {/* ══ EXECUTIVE STATUS BAR ══ */}
        <ExecutiveStatusBar />

        {/* ══ SETUP PRIORITY ══ */}
        <SetupPriorityWidget />

        {/* ══ HOJE VOCÊ PRECISA (dynamic) ══ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Hoje Você Precisa
            </h2>
            {actionItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant={actionLayer.batchMode ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[9px] gap-1 rounded-md"
                  onClick={() => { actionLayer.setBatchMode((p: boolean) => !p); if (actionLayer.batchMode) actionLayer.clearBatch(); }}
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
                        {alertActions.length > 0 && !actionLayer.batchMode && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {alertActions.map((a) => (
                              <Button key={a.id} variant="outline" size="sm" className="h-5 text-[9px] px-1.5 gap-0.5 rounded-md"
                                onClick={(e) => { e.stopPropagation(); handleNavigate(a.label, item.route); }}>
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

        {/* ══ TASK-BASED COMMAND BLOCKS ══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <RegistrarBlock />
          <AcompanharBlock />
          <AnalisarBlock />
          <PlanejarBlock />
          <ResolverBlock />
          <EstrategiaBlock />
        </div>

        {/* ══ DECISION SUGGESTIONS ══ */}
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

        {/* ══ OPERATIONAL TIMELINE (7 days) ══ */}
        {!actionLayer.rapidMode && timeline.length > 0 && (
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

        {/* ══ PREDICTIVE LAYER ══ */}
        {predictive && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Previsões
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[9px] gap-1 ${
                    predictive.riskLevel === "baixo" ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                    : predictive.riskLevel === "moderado" ? "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                    : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
                  }`}>
                    <ShieldAlert className="h-2.5 w-2.5" /> Risco {predictive.riskLevel}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] gap-1">
                    <Gauge className="h-2.5 w-2.5" /> Saúde {predictive.healthScore}pts
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
                    const SignalIcon = t.signal === "acelerando" ? ArrowUpRight
                      : t.signal === "desacelerando" ? ArrowDownRight
                      : t.signal === "comprimindo" ? TrendingDown : Minus;
                    const signalColor = t.signal === "acelerando" ? "text-emerald-600 dark:text-emerald-400"
                      : t.signal === "desacelerando" || t.signal === "comprimindo" ? "text-destructive" : "text-muted-foreground";
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className={`text-[10px] gap-1 cursor-help ${signalColor}`}>
                            <SignalIcon className="h-3 w-3" /> {t.metric}: {t.signal}
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
                    <div key={a.id} className={`rounded-lg border p-2.5 flex items-start gap-2.5 ${
                      a.severity === "danger" ? "border-destructive/40 bg-destructive/5 dark:bg-destructive/10" : "border-amber-300/60 bg-amber-50/50 dark:border-amber-700/40 dark:bg-amber-950/20"
                    }`}>
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
              <button onClick={() => setShowSimulator((p) => !p)} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <Calculator className="h-3.5 w-3.5" /> Simulador Rápido
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
                      const curRev = predictive.projections.monthResult.value > 0 ? predictive.projections.monthResult.value * 2 : 100000;
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

        {/* ══ EXPLAINABILITY ══ */}
        {explainability && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex items-start gap-2.5">
              <MessageSquareText className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-foreground">{explainability.naturalLanguage}</p>
            </div>
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
                        <Badge variant="outline" className={`text-[9px] px-1.5 mb-1 ${
                          imp.type === "negative" ? "text-destructive border-destructive/30"
                          : imp.type === "positive" ? "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                          : "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                        }`}>
                          {imp.type === "negative" ? "▼ Negativo" : imp.type === "positive" ? "▲ Positivo" : "⬤ Instável"}
                        </Badge>
                        <p className="text-[10px] font-semibold truncate">{imp.label}</p>
                        <p className="text-[10px] text-muted-foreground">{imp.formatted}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {explainability.drivers.length > 0 && (
              <div className="space-y-2">
                <button onClick={() => setShowBreakdown((p) => !p)} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  <BarChart className="h-3.5 w-3.5" /> Entender Resultado do Mês
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
                                <div className={`h-full rounded-full transition-all ${d.direction === "positive" ? "bg-emerald-500" : "bg-destructive"}`} style={{ width: `${Math.min(d.pctImpact, 100)}%` }} />
                              </div>
                            </div>
                            <span className="text-[9px] text-muted-foreground w-8 text-right">{d.pctImpact}%</span>
                          </div>
                        ))}
                      </div>
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
        {loadingExplain && <Skeleton className="h-16 rounded-xl" />}

        {/* ══ TRUST LAYER ══ */}
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
                      <div className={`h-full rounded-full transition-all ${m.level === "alta" ? "bg-emerald-500" : m.level === "média" ? "bg-amber-500" : "bg-destructive"}`} style={{ width: `${m.value}%` }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <button onClick={() => setShowTrustDetail((p) => !p)} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <Database className="h-3.5 w-3.5" /> Detalhes de Confiabilidade
              <ChevronRight className={`h-3 w-3 transition-transform ${showTrustDetail ? "rotate-90" : ""}`} />
            </button>
            {showTrustDetail && (
              <Card className="border-border/60">
                <CardContent className="p-3 space-y-4">
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

        {/* ══ ONBOARDING ══ */}
        <OnboardingActivationWidget />

        {/* ══ LEARNING LAYER ══ */}
        {!actionLayer.rapidMode && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" /> Inteligência Adaptativa
              </h2>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] h-5">
                  {learning.userMaturity === "iniciante" ? "Iniciante" : learning.userMaturity === "intermediario" ? "Intermediário" : "Avançado"}
                </Badge>
                {learning.companyOrientation !== "indefinido" && (
                  <Badge variant="secondary" className="text-[9px] h-5">Foco: {learning.companyOrientation}</Badge>
                )}
              </div>
            </div>
            {learning.workflowSuggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Próximos Passos Sugeridos</p>
                <div className="flex flex-wrap gap-2">
                  {learning.workflowSuggestions.map((wf) => (
                    <Button key={wf.id} variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg" onClick={() => handleNavigate(wf.label, wf.route)}>
                      <ArrowRight className="h-3 w-3 text-purple-500" /> {wf.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {learning.adaptiveFavorites.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Mais Acessados</p>
                <div className="flex flex-wrap gap-1.5">
                  {learning.adaptiveFavorites.map((f) => (
                    <Button key={f.route} variant="ghost" size="sm" className="h-7 text-[10px] gap-1 rounded-md px-2 bg-muted/50" onClick={() => handleNavigate(f.label, f.route)}>
                      {f.label}
                      <Badge variant="outline" className="text-[8px] h-4 ml-1">{f.count}x</Badge>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {learning.repetitivePatterns.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Padrões Detectados</p>
                <div className="space-y-1">
                  {learning.repetitivePatterns.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border p-2 text-xs bg-card/50">
                      <Repeat className="h-3 w-3 text-purple-500 shrink-0" />
                      <span className="flex-1 truncate text-muted-foreground">{p.sequence}</span>
                      <Badge variant="outline" className="text-[8px] h-4">{p.count}x</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {learning.peakHours.length > 0 && learning.totalInteractions > 30 && (
              <p className="text-[10px] text-muted-foreground">
                Horários de pico: {learning.peakHours.map((h) => `${h}h`).join(", ")}
              </p>
            )}
          </div>
        )}

        {/* ══ AUTOMATION LAYER ══ */}
        {!actionLayer.rapidMode && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-500" /> Automações
              </h2>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] h-5">{autoSummary.executedToday} hoje</Badge>
                {autoSummary.failed > 0 && <Badge variant="destructive" className="text-[9px] h-5">{autoSummary.failed} falha(s)</Badge>}
                {autoSummary.paused > 0 && <Badge variant="secondary" className="text-[9px] h-5">{autoSummary.paused} pausada(s)</Badge>}
                <Button variant="outline" size="sm" className="h-6 text-[9px] gap-1 rounded-md" onClick={() => setShowAutoPanel((p) => !p)}>
                  {showAutoPanel ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                  {showAutoPanel ? "Ocultar" : "Detalhes"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { val: autoSummary.executedToday, label: "Executadas hoje", color: "border-violet-200/60 dark:border-violet-800/40", bgColor: "bg-violet-500/10", icon: Play, iconColor: "text-violet-600 dark:text-violet-400" },
                { val: autoSummary.pending, label: "Pendentes", color: "border-amber-200/60 dark:border-amber-800/40", bgColor: "bg-amber-500/10", icon: Clock, iconColor: "text-amber-600 dark:text-amber-400" },
                { val: autoSummary.failed, label: "Falhas", color: "border-red-200/60 dark:border-red-800/40", bgColor: "bg-red-500/10", icon: AlertTriangle, iconColor: "text-red-600 dark:text-red-400" },
                { val: autoSummary.paused, label: "Pausadas", color: "border-muted", bgColor: "bg-muted", icon: Minus, iconColor: "text-muted-foreground" },
              ].map((c) => (
                <Card key={c.label} className={c.color}>
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg ${c.bgColor} flex items-center justify-center`}>
                      <c.icon className={`h-4 w-4 ${c.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-none">{c.val}</p>
                      <p className="text-[9px] text-muted-foreground">{c.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {autoSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sugestões de Automação</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {autoSuggestions.slice(0, 4).map((s) => (
                    <div key={s.id} className="rounded-xl border p-3 bg-card/50 hover:bg-muted/40 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Badge variant="outline" className="text-[8px] h-4 px-1 mb-1">
                            {s.type === "financeiro" ? "Financeiro" : "Operacional"}
                          </Badge>
                          <p className="text-xs font-semibold truncate">{s.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{s.description}</p>
                        </div>
                        <Button size="sm" className="h-6 text-[9px] gap-1 rounded-md shrink-0" onClick={async () => { await activateRule(s); }}>
                          <Zap className="h-2.5 w-2.5" /> Ativar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                        <Badge variant={ex.status === "falha" ? "destructive" : "outline"} className="text-[8px] h-4">{ex.status}</Badge>
                        <span className="text-[9px] text-muted-foreground shrink-0">
                          {new Date(ex.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {autoRules.length > 0 && (
                  <>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-3">Regras Ativas</p>
                    <div className="space-y-1">
                      {autoRules.filter((r: any) => r.active).slice(0, 6).map((r: any) => (
                        <div key={r.id} className="flex items-center gap-2 rounded-lg border p-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="font-medium flex-1 truncate">{r.name}</span>
                          <span className="text-[9px] text-muted-foreground">{r.execution_count || 0}x</span>
                          {(r.error_count || 0) > 0 && <Badge variant="destructive" className="text-[8px] h-4">{r.error_count} erro(s)</Badge>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ COLLABORATION ══ */}
        {!actionLayer.rapidMode && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-500" /> Colaboração
              </h2>
              <div className="flex items-center gap-1">
                {(["mine", "financeiro", "comercial", "operacional"] as CollabFilter[]).map((f) => (
                  <Button key={f} variant={collabFilter === f ? "default" : "ghost"} size="sm" className="h-6 text-[9px] px-2 rounded-md" onClick={() => setCollabFilter(f)}>
                    {f === "mine" ? "Minhas" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            {collab?.bottlenecks && collab.bottlenecks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {collab.bottlenecks.map((b) => (
                  <div key={b.type} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                    b.type === "overdue" ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                    : b.type === "unassigned" ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                    : "border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                  }`}>
                    {b.type === "overdue" && <AlertTriangle className="h-3 w-3" />}
                    {b.type === "unassigned" && <UserCheck className="h-3 w-3" />}
                    {b.type === "awaiting_approval" && <Clock className="h-3 w-3" />}
                    <span className="font-medium">{b.label}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Card className="border-sky-200/60 dark:border-sky-800/40">
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold leading-none">{collab?.assignedToMe?.length || 0}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Atribuídas a mim</p>
                </CardContent>
              </Card>
              <Card className="border-indigo-200/60 dark:border-indigo-800/40">
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold leading-none">{collab?.assignedByMe?.length || 0}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Delegadas por mim</p>
                </CardContent>
              </Card>
              <Card className="border-red-200/60 dark:border-red-800/40">
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold leading-none">{collab?.overdue?.length || 0}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Atrasadas</p>
                </CardContent>
              </Card>
            </div>
            {collab?.allTasks && collab.allTasks.length > 0 && (
              <div className="space-y-1">
                {collab.allTasks.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg border p-2 text-xs hover:bg-muted/40 transition-colors">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${t.isOverdue ? "bg-red-500" : t.priority === "critica" ? "bg-orange-500" : "bg-emerald-500"}`} />
                    <span className="font-medium flex-1 truncate">{t.title}</span>
                    {t.assigneeName ? (
                      <Badge variant="outline" className="text-[8px] h-4 shrink-0">@{t.assigneeName.split(" ")[0]}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[8px] h-4 shrink-0">Sem responsável</Badge>
                    )}
                    {t.module && <Badge variant="outline" className="text-[8px] h-4 shrink-0">{t.module}</Badge>}
                    {t.isOverdue && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <button onClick={() => setShowCollabTimeline((p) => !p)} className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                <MessageCircle className="h-3 w-3" /> Timeline Colaborativa
                <ChevronRight className={`h-3 w-3 transition-transform ${showCollabTimeline ? "rotate-90" : ""}`} />
              </button>
              {showCollabTimeline && collab?.events && (
                <div className="space-y-1 pl-1 border-l-2 border-muted ml-1.5">
                  {collab.events.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-3">Nenhum evento recente.</p>
                  ) : (
                    collab.events.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-2 pl-3 py-1 text-xs">
                        <div className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">
                            <span className="font-medium">{ev.actorName || "Sistema"}</span>{" "}
                            <span className="text-muted-foreground">{ev.description}</span>
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {new Date(ev.timestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ WIDGETS ══ */}
        {!actionLayer.rapidMode && (
          <>
            <NotificationSummaryWidget className="mt-2" />
            <div className="mt-2"><FlowWidget /></div>
            <div className="mt-2"><DataIntegrityWidget /></div>
            <div className="mt-2"><AutomationEngineWidget /></div>
            <div className="mt-2"><ScenarioForecastWidget /></div>
            <div className="mt-2"><PerformanceIntelligenceWidget /></div>
            <div className="mt-2"><GovernanceWidget /></div>
            <div className="mt-2"><MasterDataWidget /></div>
            <div className="mt-2"><IntegrationLayerWidget /></div>
            <MiniActivityFeed className="mt-2" />
          </>
        )}

        {/* ══ CONTINUE WHERE LEFT OFF ══ */}
        {!actionLayer.rapidMode && continueItems.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Continuar de Onde Parei
            </h2>
            <div className="flex flex-wrap gap-2">
              {continueItems.map((r, i) => (
                <Button key={i} variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg" onClick={() => handleNavigate(r.label, r.route)}>
                  <Clock className="h-3 w-3 text-muted-foreground" /> {r.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ FAB ══ */}
      <div className="fixed bottom-6 right-6 z-40">
        {fabOpen && (
          <div className="absolute bottom-14 right-0 mb-2 space-y-1.5 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {QUICK_ACTIONS.map((action) => (
              <Button key={action.label} size="sm" variant="secondary" className="w-full justify-start gap-2 text-xs shadow-md rounded-lg h-9"
                onClick={() => { setFabOpen(false); handleNavigate(action.label, action.route); }}>
                <action.icon className={`h-3.5 w-3.5 ${action.color}`} /> {action.label}
              </Button>
            ))}
          </div>
        )}
        <Button size="lg" className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all p-0" onClick={() => setFabOpen((p) => !p)}>
          <Plus className={`h-5 w-5 transition-transform duration-200 ${fabOpen ? "rotate-45" : ""}`} />
        </Button>
      </div>
    </DashboardLayout>
  );
}
