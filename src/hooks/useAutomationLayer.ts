import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AutomationSummary {
  executedToday: number;
  paused: number;
  pending: number;
  failed: number;
  recentExecutions: { id: string; ruleName: string; status: string; time: string }[];
}

export interface AutomationSuggestion {
  id: string;
  label: string;
  description: string;
  type: "financeiro" | "operacional";
  ruleTemplate: {
    name: string;
    event_type: string;
    event_module: string;
    conditions: any[];
    actions: any[];
  };
}

const STANDARD_SUGGESTIONS: AutomationSuggestion[] = [
  // ── Pedido Aprovado (full cascade) ──
  {
    id: "auto-order-approved-receivables",
    label: "Pedido aprovado → Contas a Receber",
    description: "Gera automaticamente contas a receber quando pedido é aprovado",
    type: "operacional",
    ruleTemplate: {
      name: "Pedido aprovado gera contas a receber",
      event_type: "order_approved",
      event_module: "operacoes",
      conditions: [{ field: "status", operator: "eq", value: "aprovado" }],
      actions: [{ type: "criar_contas_receber", params: {} }],
    },
  },
  {
    id: "auto-order-approved-commission",
    label: "Pedido aprovado → Comissão Vendedor",
    description: "Gera automaticamente comissão do vendedor ao aprovar pedido",
    type: "operacional",
    ruleTemplate: {
      name: "Pedido aprovado gera comissão vendedor",
      event_type: "order_approved",
      event_module: "operacoes",
      conditions: [{ field: "comissao_vendedor_valor", operator: "gt", value: 0 }],
      actions: [{ type: "gerar_comissao", params: { tipo: "vendedor" } }],
    },
  },
  {
    id: "auto-order-approved-assembly",
    label: "Pedido aprovado → Custo Montagem",
    description: "Gera automaticamente custo de montagem ao aprovar pedido",
    type: "operacional",
    ruleTemplate: {
      name: "Pedido aprovado gera custo montagem",
      event_type: "order_approved",
      event_module: "operacoes",
      conditions: [],
      actions: [{ type: "gerar_custo_montagem", params: {} }],
    },
  },
  {
    id: "auto-order-approved-costcenter",
    label: "Pedido aprovado → Vincular Centro Custo",
    description: "Vincula automaticamente centro de custo e projeto ao pedido aprovado",
    type: "operacional",
    ruleTemplate: {
      name: "Pedido aprovado vincula centro custo e projeto",
      event_type: "order_approved",
      event_module: "operacoes",
      conditions: [],
      actions: [
        { type: "vincular_centro_custo", params: {} },
        { type: "vincular_projeto", params: {} },
      ],
    },
  },

  // ── Classificação automática despesa produção ──
  {
    id: "auto-classify-production",
    label: "Despesa produção → Centro custo Produção",
    description: "Atribui automaticamente centro de custo 'Produção' para despesas da categoria produção",
    type: "financeiro",
    ruleTemplate: {
      name: "Classificação automática despesa produção",
      event_type: "ledger_entry_created",
      event_module: "financeiro",
      conditions: [{ field: "category_name", operator: "contains", value: "produção" }],
      actions: [{ type: "atribuir_centro_custo", params: { centro_custo: "Produção" } }],
    },
  },

  // ── Antecipação cartão ──
  {
    id: "auto-card-anticipation",
    label: "Cartão antecipado → Custo variável venda",
    description: "Classifica automaticamente custo de antecipação de cartão como custo variável de venda",
    type: "financeiro",
    ruleTemplate: {
      name: "Antecipação cartão classificação automática",
      event_type: "ledger_entry_created",
      event_module: "financeiro",
      conditions: [{ field: "description", operator: "contains", value: "antecipação" }],
      actions: [{ type: "classificar_categoria", params: { categoria: "Antecipação de Recebíveis" } }],
    },
  },

  // ── Classificação recorrente ──
  {
    id: "auto-classify-recurring",
    label: "Classificar despesas recorrentes",
    description: "Categoriza automaticamente lançamentos com descrições repetidas de fornecedores recorrentes",
    type: "financeiro",
    ruleTemplate: {
      name: "Classificação automática despesas recorrentes",
      event_type: "ledger_entry_created",
      event_module: "financeiro",
      conditions: [{ field: "classification_status", operator: "eq", value: "pending" }],
      actions: [{ type: "classificar_automatico", params: {} }],
    },
  },

  // ── Fechamento mensal checklist ──
  {
    id: "auto-monthly-closing-check",
    label: "Verificação automática fechamento mensal",
    description: "Executa checklist de integridade: conciliação, órfãos, centro custo, projeto ausente",
    type: "financeiro",
    ruleTemplate: {
      name: "Checklist fechamento mensal",
      event_type: "monthly_closing_triggered",
      event_module: "controladoria",
      conditions: [],
      actions: [
        { type: "verificar_conciliacao_pendente", params: {} },
        { type: "verificar_lancamentos_orfaos", params: {} },
        { type: "verificar_centro_custo_ausente", params: {} },
        { type: "verificar_projeto_ausente", params: {} },
        { type: "gerar_relatorio_inconsistencias", params: {} },
      ],
    },
  },

  // ── Atraso financeiro ──
  {
    id: "alert-overdue",
    label: "Alerta contas vencidas",
    description: "Alerta automático quando contas ultrapassam vencimento configurado",
    type: "financeiro",
    ruleTemplate: {
      name: "Alerta contas vencidas",
      event_type: "payable_overdue",
      event_module: "financeiro",
      conditions: [{ field: "status", operator: "in", value: ["ABERTO", "VENCIDO"] }],
      actions: [{ type: "enviar_alerta", params: { destinatario: "gestor" } }],
    },
  },

  // ── Classificação automática fornecedor ──
  {
    id: "auto-supplier-classify",
    label: "Fornecedor recorrente → Sugestão categoria",
    description: "Sugere categoria financeira automaticamente para fornecedores recorrentes",
    type: "financeiro",
    ruleTemplate: {
      name: "Classificação automática fornecedor recorrente",
      event_type: "ledger_entry_created",
      event_module: "financeiro",
      conditions: [{ field: "supplier_match_count", operator: "gte", value: 3 }],
      actions: [{ type: "sugerir_categoria_fornecedor", params: {} }],
    },
  },

  // ── Desvio orçamento ──
  {
    id: "alert-budget-deviation",
    label: "Alerta desvio orçamento",
    description: "Notifica quando despesa ultrapassa meta orçamentária do período",
    type: "financeiro",
    ruleTemplate: {
      name: "Alerta desvio orçamento",
      event_type: "goal_check",
      event_module: "planejamento",
      conditions: [{ field: "achievement_pct", operator: "gt", value: 100 }],
      actions: [{ type: "enviar_alerta", params: { message: "Despesa acima da meta orçamentária" } }],
    },
  },

  // ── Fluxo negativo ──
  {
    id: "alert-negative-flow",
    label: "Alerta fluxo negativo previsto",
    description: "Notifica quando projeção de caixa indica saldo negativo",
    type: "financeiro",
    ruleTemplate: {
      name: "Alerta fluxo de caixa negativo",
      event_type: "cash_forecast_updated",
      event_module: "financeiro",
      conditions: [{ field: "projected_balance", operator: "lt", value: 0 }],
      actions: [{ type: "enviar_alerta", params: { message: "Fluxo de caixa negativo previsto" } }],
    },
  },

  // ── Meta não atingida ──
  {
    id: "alert-goal-miss",
    label: "Alerta meta não atingida",
    description: "Notifica quando realizado está abaixo de 80% da meta",
    type: "financeiro",
    ruleTemplate: {
      name: "Alerta meta mensal abaixo do esperado",
      event_type: "goal_check",
      event_module: "planejamento",
      conditions: [{ field: "achievement_pct", operator: "lt", value: 80 }],
      actions: [{ type: "enviar_alerta", params: { message: "Meta mensal abaixo de 80%" } }],
    },
  },

  // ── Pagamento → fluxo ──
  {
    id: "auto-payment-cashflow",
    label: "Pagamento confirmado atualiza fluxo",
    description: "Atualiza automaticamente o fluxo de caixa ao confirmar pagamento",
    type: "operacional",
    ruleTemplate: {
      name: "Pagamento confirmado atualiza fluxo",
      event_type: "payment_confirmed",
      event_module: "financeiro",
      conditions: [],
      actions: [{ type: "atualizar_fluxo", params: {} }],
    },
  },

  // ── Cliente inadimplente ──
  {
    id: "alert-client-overdue",
    label: "Cliente atrasado gera alerta",
    description: "Alerta automático quando cliente tem recebíveis vencidos",
    type: "operacional",
    ruleTemplate: {
      name: "Alerta cliente inadimplente",
      event_type: "receivable_overdue",
      event_module: "financeiro",
      conditions: [],
      actions: [{ type: "enviar_alerta", params: { message: "Cliente com recebíveis vencidos" } }],
    },
  },
];

export function useAutomationLayer() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["automation-layer", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      // Fetch active rules
      const { data: rules } = await supabase
        .from("automation_rules")
        .select("id, name, active, event_type, execution_count, error_count, last_executed_at")
        .order("priority", { ascending: true });

      const allRules = (rules || []) as any[];
      const activeCount = allRules.filter((r) => r.active).length;
      const pausedCount = allRules.filter((r) => !r.active).length;

      // Fetch today's execution logs
      const { data: logs } = await supabase
        .from("automation_execution_logs")
        .select("id, rule_name, status, created_at")
        .gte("created_at", `${today}T00:00:00`)
        .order("created_at", { ascending: false })
        .limit(20);

      const todayLogs = (logs || []) as any[];
      const executedToday = todayLogs.length;
      const failed = todayLogs.filter((l) => l.status === "falha").length;
      const pending = todayLogs.filter((l) => l.status === "pendente").length;

      // Find which standard suggestions are already created as rules
      const existingEventTypes = new Set(allRules.map((r) => r.event_type));
      const suggestions = STANDARD_SUGGESTIONS.filter(
        (s) => !existingEventTypes.has(s.ruleTemplate.event_type)
      );

      const summary: AutomationSummary = {
        executedToday,
        paused: pausedCount,
        pending,
        failed,
        recentExecutions: todayLogs.slice(0, 5).map((l) => ({
          id: l.id,
          ruleName: l.rule_name || "Regra",
          status: l.status || "sucesso",
          time: l.created_at,
        })),
      };

      return { summary, suggestions, activeRules: allRules };
    },
    refetchInterval: 60000,
  });

  const activateRule = async (suggestion: AutomationSuggestion) => {
    const { error } = await supabase.from("automation_rules").insert({
      name: suggestion.ruleTemplate.name,
      event_type: suggestion.ruleTemplate.event_type,
      event_module: suggestion.ruleTemplate.event_module,
      conditions: suggestion.ruleTemplate.conditions,
      actions: suggestion.ruleTemplate.actions,
      active: true,
      is_system: true,
      priority: 10,
    } as any);
    return !error;
  };

  return {
    summary: data?.summary || { executedToday: 0, paused: 0, pending: 0, failed: 0, recentExecutions: [] },
    suggestions: data?.suggestions || [],
    activeRules: data?.activeRules || [],
    isLoading,
    activateRule,
  };
}
