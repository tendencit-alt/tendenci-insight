import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Lightbulb, ArrowRight, CheckCircle2, Circle,
  Play, Eye, BookOpen, Sparkles,
} from "lucide-react";
import * as LucideIcons from "lucide-react";

// ── Types ──
export interface EmptyStateAction {
  label: string;
  description?: string;
  route?: string;
  onClick?: () => void;
  icon: string;
  primary?: boolean;
}

export interface EmptyStateCheckItem {
  id: string;
  label: string;
  completed: boolean;
  route?: string;
}

export interface SmartEmptyStateConfig {
  module: string;
  title: string;
  description: string;
  benefit: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  actions: EmptyStateAction[];
  checklist?: EmptyStateCheckItem[];
  tutorialLabel?: string;
  tutorialRoute?: string;
}

// ── Module configs ──
export const EMPTY_STATE_CONFIGS: Record<string, SmartEmptyStateConfig> = {
  financeiro: {
    module: "financeiro",
    title: "Configure seu Financeiro",
    description: "O módulo financeiro centraliza todo o controle de receitas, despesas, fluxo de caixa e conciliação bancária da sua empresa.",
    benefit: "Empresas que usam o financeiro completo reduzem em média 40% do tempo de gestão de caixa.",
    icon: "Wallet",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200/60 dark:border-emerald-800/40",
    actions: [
      { label: "Importar OFX", description: "Importe seu extrato bancário automaticamente", route: "/financeiro?tab=reconciliation", icon: "ArrowLeftRight", primary: true },
      { label: "Cadastrar Receita", description: "Registre sua primeira receita", route: "/financeiro?tab=receivables", icon: "Plus" },
      { label: "Cadastrar Despesa", description: "Registre sua primeira despesa", route: "/financeiro?tab=payables", icon: "CreditCard" },
      { label: "Criar Previsão de Caixa", description: "Projete seu fluxo de caixa futuro", route: "/bi-dashboard", icon: "TrendingUp" },
    ],
    checklist: [
      { id: "bank", label: "Cadastrar conta bancária", completed: false, route: "/financeiro?tab=treasury" },
      { id: "chart", label: "Configurar plano de contas", completed: false, route: "/cadastros-financeiros?tab=chart" },
      { id: "cost-center", label: "Criar centros de custo", completed: false, route: "/cadastros-financeiros?tab=cost-centers" },
      { id: "first-entry", label: "Lançar primeira movimentação", completed: false, route: "/financeiro" },
      { id: "ofx", label: "Importar primeiro extrato OFX", completed: false, route: "/financeiro?tab=reconciliation" },
    ],
    tutorialLabel: "Como configurar o Financeiro",
    tutorialRoute: "/education",
  },
  comercial: {
    module: "comercial",
    title: "Comece a Vender",
    description: "O CRM integrado permite gerenciar todo o pipeline comercial, desde a prospecção até o fechamento.",
    benefit: "Empresas com pipeline estruturado aumentam a taxa de conversão em até 30%.",
    icon: "ShoppingCart",
    iconColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50/50 dark:bg-blue-950/20",
    borderColor: "border-blue-200/60 dark:border-blue-800/40",
    actions: [
      { label: "Criar Primeira Proposta", description: "Registre sua primeira proposta comercial", route: "/pedidos", icon: "FileText", primary: true },
      { label: "Cadastrar Cliente", description: "Adicione seu primeiro cliente", route: "/crm-comercial", icon: "UserPlus" },
      { label: "Registrar Oportunidade", description: "Crie um deal no pipeline", route: "/crm-comercial", icon: "Target" },
      { label: "Importar Leads", description: "Importe sua base de contatos", route: "/crm-comercial", icon: "Upload" },
    ],
    checklist: [
      { id: "client", label: "Cadastrar primeiro cliente", completed: false, route: "/crm-comercial" },
      { id: "deal", label: "Criar primeira oportunidade", completed: false, route: "/crm-comercial" },
      { id: "proposal", label: "Gerar primeira proposta", completed: false, route: "/pedidos" },
      { id: "pipeline", label: "Configurar etapas do pipeline", completed: false, route: "/crm-comercial" },
    ],
    tutorialLabel: "Como usar o CRM",
  },
  operacional: {
    module: "operacional",
    title: "Organize suas Operações",
    description: "Gerencie projetos, produção e tarefas com controle completo de prazos e responsáveis.",
    benefit: "Controle operacional reduz atrasos em entregas em até 25%.",
    icon: "Factory",
    iconColor: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50/50 dark:bg-orange-950/20",
    borderColor: "border-orange-200/60 dark:border-orange-800/40",
    actions: [
      { label: "Criar Primeiro Projeto", description: "Inicie seu primeiro projeto operacional", route: "/projetos", icon: "FolderKanban", primary: true },
      { label: "Criar Primeira Tarefa", description: "Registre uma tarefa de acompanhamento", route: "/tarefas", icon: "ListChecks" },
      { label: "Criar Checklist Padrão", description: "Defina um processo operacional padrão", route: "/producao-operacoes", icon: "ClipboardCheck" },
    ],
    checklist: [
      { id: "project", label: "Criar primeiro projeto", completed: false, route: "/projetos" },
      { id: "task", label: "Criar primeira tarefa", completed: false, route: "/tarefas" },
      { id: "production", label: "Configurar produção", completed: false, route: "/producao-operacoes" },
    ],
    tutorialLabel: "Como organizar operações",
  },
  estrategico: {
    module: "estrategico",
    title: "Ative sua Inteligência Estratégica",
    description: "O DRE gerencial e os indicadores executivos transformam dados em decisões estratégicas.",
    benefit: "Gestores com DRE gerencial tomam decisões 3x mais rápidas.",
    icon: "BarChart3",
    iconColor: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50/50 dark:bg-violet-950/20",
    borderColor: "border-violet-200/60 dark:border-violet-800/40",
    actions: [
      { label: "Cadastrar Contas", description: "Configure o plano de contas financeiro", route: "/cadastros-financeiros?tab=chart", icon: "BookOpen", primary: true },
      { label: "Importar OFX", description: "Importe dados bancários para o DRE", route: "/financeiro?tab=reconciliation", icon: "ArrowLeftRight" },
      { label: "Estrutura Automática DRE", description: "Gere a estrutura inicial do DRE automaticamente", route: "/cadastros-financeiros?tab=chart", icon: "Sparkles" },
    ],
    checklist: [
      { id: "chart", label: "Configurar plano de contas", completed: false, route: "/cadastros-financeiros?tab=chart" },
      { id: "entries", label: "Ter lançamentos financeiros", completed: false, route: "/financeiro" },
      { id: "cost-centers", label: "Criar centros de custo", completed: false, route: "/cadastros-financeiros?tab=cost-centers" },
    ],
    tutorialLabel: "Como usar o DRE Gerencial",
  },
  integracoes: {
    module: "integracoes",
    title: "Conecte seus Sistemas",
    description: "Integrações automatizam a entrada de dados e eliminam retrabalho manual.",
    benefit: "Empresas integradas economizam em média 8 horas por semana em digitação.",
    icon: "Plug",
    iconColor: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-50/50 dark:bg-sky-950/20",
    borderColor: "border-sky-200/60 dark:border-sky-800/40",
    actions: [
      { label: "Conectar Banco", description: "Importe extratos automaticamente", route: "/financeiro?tab=reconciliation", icon: "Landmark", primary: true },
      { label: "Importar OFX", description: "Faça upload do extrato bancário", route: "/financeiro?tab=reconciliation", icon: "ArrowLeftRight" },
      { label: "Ativar WhatsApp", description: "Conecte notificações via WhatsApp", route: "/settings", icon: "MessageCircle" },
      { label: "Ativar API Pública", description: "Habilite integrações externas", route: "/settings", icon: "Globe" },
    ],
    checklist: [
      { id: "bank", label: "Conectar conta bancária", completed: false, route: "/financeiro?tab=treasury" },
      { id: "ofx", label: "Importar primeiro OFX", completed: false, route: "/financeiro?tab=reconciliation" },
    ],
    tutorialLabel: "Como configurar integrações",
  },
};

// ── Component ──
interface SmartEmptyStateProps {
  moduleKey: string;
  /** Override default config */
  config?: Partial<SmartEmptyStateConfig>;
  /** If true, shows demo data toggle */
  showDemoMode?: boolean;
  /** Callback when demo mode toggled */
  onDemoModeToggle?: (active: boolean) => void;
  /** Extra class */
  className?: string;
}

export function SmartEmptyState({
  moduleKey,
  config: overrides,
  showDemoMode = false,
  onDemoModeToggle,
  className = "",
}: SmartEmptyStateProps) {
  const navigate = useNavigate();
  const [demoMode, setDemoMode] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);

  const cfg = useMemo(() => {
    const base = EMPTY_STATE_CONFIGS[moduleKey];
    if (!base) return null;
    return overrides ? { ...base, ...overrides } : base;
  }, [moduleKey, overrides]);

  if (!cfg) return null;

  const IconComp = (LucideIcons as any)[cfg.icon] || LucideIcons.HelpCircle;

  const completedCount = cfg.checklist?.filter((c) => c.completed).length || 0;
  const totalCount = cfg.checklist?.length || 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleDemoToggle = () => {
    const next = !demoMode;
    setDemoMode(next);
    onDemoModeToggle?.(next);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main card */}
      <Card className={`${cfg.borderColor} overflow-hidden`}>
        <CardContent className="p-0">
          {/* Header */}
          <div className={`${cfg.bgColor} px-5 py-4 flex items-start gap-4`}>
            <div className={`h-12 w-12 rounded-xl bg-background/80 flex items-center justify-center shrink-0`}>
              <IconComp className={`h-6 w-6 ${cfg.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold">{cfg.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cfg.description}</p>
            </div>
          </div>

          {/* Benefit badge */}
          <div className="px-5 pt-3">
            <div className="flex items-start gap-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30 p-2.5">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">{cfg.benefit}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
              Comece por aqui
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cfg.actions.map((action) => {
                const AIcon = (LucideIcons as any)[action.icon] || LucideIcons.Zap;
                return (
                  <button
                    key={action.label}
                    onClick={() => {
                      if (action.onClick) action.onClick();
                      else if (action.route) navigate(action.route);
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 text-left ${
                      action.primary
                        ? `${cfg.borderColor} ${cfg.bgColor}`
                        : "border-border/60 bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      action.primary ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <AIcon className={`h-4 w-4 ${action.primary ? cfg.iconColor : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{action.label}</p>
                      {action.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{action.description}</p>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer: tutorial + demo */}
          <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
            {cfg.tutorialLabel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] gap-1 rounded-md"
                onClick={() => cfg.tutorialRoute && navigate(cfg.tutorialRoute)}
              >
                <BookOpen className="h-3 w-3" />
                {cfg.tutorialLabel}
              </Button>
            )}
            {showDemoMode && (
              <Button
                variant={demoMode ? "default" : "outline"}
                size="sm"
                className="h-7 text-[10px] gap-1 rounded-md"
                onClick={handleDemoToggle}
              >
                <Eye className="h-3 w-3" />
                {demoMode ? "Sair Demo" : "Ver com Dados Exemplo"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      {cfg.checklist && cfg.checklist.length > 0 && (
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowChecklist((p) => !p)}
                className="flex items-center gap-2 text-xs font-semibold hover:text-primary transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Checklist de Configuração
                <Badge variant="outline" className="text-[9px] h-4 ml-1">
                  {completedCount}/{totalCount}
                </Badge>
              </button>
              <span className="text-[10px] text-muted-foreground">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5 mb-3" />
            {showChecklist && (
              <div className="space-y-1">
                {cfg.checklist.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.route && navigate(item.route)}
                    className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors text-left"
                  >
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={`text-xs ${item.completed ? "text-muted-foreground line-through" : "font-medium"}`}>
                      {item.label}
                    </span>
                    {!item.completed && item.route && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Compact inline version for table empty states ──
interface InlineEmptyStateProps {
  moduleKey: string;
  message?: string;
  colSpan?: number;
}

export function InlineEmptyState({ moduleKey, message }: InlineEmptyStateProps) {
  const navigate = useNavigate();
  const cfg = EMPTY_STATE_CONFIGS[moduleKey];

  if (!cfg) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-sm">{message || "Nenhum registro encontrado"}</p>
      </div>
    );
  }

  const IconComp = (LucideIcons as any)[cfg.icon] || LucideIcons.HelpCircle;
  const primaryAction = cfg.actions.find((a) => a.primary) || cfg.actions[0];

  return (
    <div className="text-center py-10 px-4">
      <div className={`h-12 w-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${cfg.bgColor}`}>
        <IconComp className={`h-6 w-6 ${cfg.iconColor}`} />
      </div>
      <h4 className="text-sm font-semibold mb-1">{cfg.title}</h4>
      <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">{cfg.description}</p>
      {primaryAction && (
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 rounded-lg"
          onClick={() => primaryAction.route && navigate(primaryAction.route)}
        >
          <Play className="h-3 w-3" />
          {primaryAction.label}
        </Button>
      )}
    </div>
  );
}

// ── Setup priority detector ──
export function useSetupPriority(): { unconfigured: string[]; topPriority: string | null } {
  // This would ideally check real data; for now it provides the framework
  return useMemo(() => {
    const priorities = ["financeiro", "comercial", "operacional", "estrategico", "integracoes"];
    // In production, check actual data counts per module
    return {
      unconfigured: priorities,
      topPriority: priorities[0] || null,
    };
  }, []);
}
