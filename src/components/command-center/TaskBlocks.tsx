import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, CreditCard, FileText, UserPlus, ListChecks, Target,
  Wallet, TrendingUp, AlertTriangle, Factory, BarChart3,
  LineChart, PieChart, Calculator, Landmark, Brain,
  Telescope, Zap, ArrowLeftRight, FileBarChart
} from "lucide-react";

// ── Block type ──
interface TaskAction {
  label: string;
  icon: any;
  route: string;
  color: string;
}

interface TaskBlockProps {
  title: string;
  icon: any;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  actions: TaskAction[];
}

function TaskBlock({ title, icon: Icon, iconColor, borderColor, bgColor, actions }: TaskBlockProps) {
  const navigate = useNavigate();
  return (
    <Card className={`${borderColor} overflow-hidden`}>
      <CardContent className="p-0">
        <div className={`${bgColor} px-3 py-2 flex items-center gap-2`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        </div>
        <div className="p-2 space-y-0.5">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.route)}
              className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-muted/60 transition-colors group"
            >
              <action.icon className={`h-3.5 w-3.5 ${action.color} shrink-0`} />
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── REGISTRAR ──
export function RegistrarBlock() {
  return (
    <TaskBlock
      title="Registrar"
      icon={Plus}
      iconColor="text-emerald-600 dark:text-emerald-400"
      borderColor="border-emerald-200/60 dark:border-emerald-800/40"
      bgColor="bg-emerald-50/50 dark:bg-emerald-950/20"
      actions={[
        { label: "Nova Receita", icon: Plus, route: "/financeiro", color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Nova Despesa", icon: CreditCard, route: "/financeiro", color: "text-red-500 dark:text-red-400" },
        { label: "Nova Proposta", icon: FileText, route: "/pedidos", color: "text-blue-600 dark:text-blue-400" },
        { label: "Novo Cliente", icon: UserPlus, route: "/crm-comercial", color: "text-sky-600 dark:text-sky-400" },
        { label: "Nova Tarefa", icon: ListChecks, route: "/tarefas", color: "text-purple-600 dark:text-purple-400" },
        { label: "Importar OFX", icon: ArrowLeftRight, route: "/financeiro", color: "text-violet-600 dark:text-violet-400" },
      ]}
    />
  );
}

// ── ACOMPANHAR ──
export function AcompanharBlock() {
  return (
    <TaskBlock
      title="Acompanhar"
      icon={TrendingUp}
      iconColor="text-blue-600 dark:text-blue-400"
      borderColor="border-blue-200/60 dark:border-blue-800/40"
      bgColor="bg-blue-50/50 dark:bg-blue-950/20"
      actions={[
        { label: "Fluxo de Caixa Hoje", icon: Wallet, route: "/bi-dashboard", color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Pipeline Vendas", icon: Target, route: "/crm-comercial", color: "text-blue-600 dark:text-blue-400" },
        { label: "Contas Vencendo", icon: AlertTriangle, route: "/financeiro", color: "text-amber-600 dark:text-amber-400" },
        { label: "Metas do Mês", icon: Target, route: "/planning", color: "text-violet-600 dark:text-violet-400" },
        { label: "Produção Ativa", icon: Factory, route: "/producao-operacoes", color: "text-orange-600 dark:text-orange-400" },
      ]}
    />
  );
}

// ── ANALISAR ──
export function AnalisarBlock() {
  return (
    <TaskBlock
      title="Analisar"
      icon={BarChart3}
      iconColor="text-violet-600 dark:text-violet-400"
      borderColor="border-violet-200/60 dark:border-violet-800/40"
      bgColor="bg-violet-50/50 dark:bg-violet-950/20"
      actions={[
        { label: "DRE Gerencial", icon: LineChart, route: "/bi-dashboard", color: "text-violet-600 dark:text-violet-400" },
        { label: "Forecast Financeiro", icon: Calculator, route: "/bi-dashboard", color: "text-blue-600 dark:text-blue-400" },
        { label: "Indicadores Executivos", icon: BarChart3, route: "/executive", color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Comparativos", icon: PieChart, route: "/benchmarking", color: "text-sky-600 dark:text-sky-400" },
        { label: "KPI's Executivos", icon: FileBarChart, route: "/relatorios", color: "text-amber-600 dark:text-amber-400" },
      ]}
    />
  );
}

// ── PLANEJAR ──
export function PlanejarBlock() {
  return (
    <TaskBlock
      title="Planejar"
      icon={Target}
      iconColor="text-amber-600 dark:text-amber-400"
      borderColor="border-amber-200/60 dark:border-amber-800/40"
      bgColor="bg-amber-50/50 dark:bg-amber-950/20"
      actions={[
        { label: "Criar Metas", icon: Target, route: "/planning", color: "text-amber-600 dark:text-amber-400" },
        { label: "Simular Cenários", icon: Calculator, route: "/planning", color: "text-violet-600 dark:text-violet-400" },
        { label: "Planejar Orçamento", icon: Wallet, route: "/planning", color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Planejar Vendas", icon: TrendingUp, route: "/crm-comercial", color: "text-blue-600 dark:text-blue-400" },
        { label: "Planejar Caixa", icon: Landmark, route: "/bi-dashboard", color: "text-sky-600 dark:text-sky-400" },
      ]}
    />
  );
}

// ── RESOLVER ──
export function ResolverBlock() {
  return (
    <TaskBlock
      title="Resolver"
      icon={AlertTriangle}
      iconColor="text-red-600 dark:text-red-400"
      borderColor="border-red-200/60 dark:border-red-800/40"
      bgColor="bg-red-50/50 dark:bg-red-950/20"
      actions={[
        { label: "Alertas Críticos", icon: AlertTriangle, route: "/control-tower", color: "text-red-600 dark:text-red-400" },
        { label: "Pendências Financeiras", icon: CreditCard, route: "/financeiro", color: "text-amber-600 dark:text-amber-400" },
        { label: "Pendências Operacionais", icon: Factory, route: "/producao-operacoes", color: "text-orange-600 dark:text-orange-400" },
        { label: "Integrações com Erro", icon: Zap, route: "/settings", color: "text-violet-600 dark:text-violet-400" },
        { label: "Automações Paradas", icon: Zap, route: "/automacoes", color: "text-muted-foreground" },
      ]}
    />
  );
}

// ── ESTRATÉGIA ──
export function EstrategiaBlock() {
  return (
    <TaskBlock
      title="Estratégia"
      icon={Telescope}
      iconColor="text-indigo-600 dark:text-indigo-400"
      borderColor="border-indigo-200/60 dark:border-indigo-800/40"
      bgColor="bg-indigo-50/50 dark:bg-indigo-950/20"
      actions={[
        { label: "Control Tower", icon: Landmark, route: "/control-tower", color: "text-indigo-600 dark:text-indigo-400" },
        { label: "Decision Assistant", icon: Brain, route: "/ai-decision", color: "text-purple-600 dark:text-purple-400" },
        { label: "Benchmarks", icon: PieChart, route: "/benchmarking", color: "text-sky-600 dark:text-sky-400" },
        { label: "Prioridades Semana", icon: ListChecks, route: "/control-tower", color: "text-amber-600 dark:text-amber-400" },
        { label: "Simulações Estratégicas", icon: Calculator, route: "/planning", color: "text-emerald-600 dark:text-emerald-400" },
      ]}
    />
  );
}
