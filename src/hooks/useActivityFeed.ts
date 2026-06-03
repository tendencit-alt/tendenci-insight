import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
// Activity feed types and queries

// ── Types ──
export type ActivitySector = "financeiro" | "comercial" | "operacoes" | "controladoria" | "sistema" | "all";
export type ActivityScope = "mine" | "team" | "company";

export interface ActivityEvent {
  id: string;
  created_at: string;
  user_id: string | null;
  table_name: string;
  record_id: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  event_type: string;
  event_source: string;
  metadata: any;
  /** Derived fields */
  sector: ActivitySector;
  label: string;
  isCritical: boolean;
  financialImpact: number | null;
}

// ── Table → Sector mapping ──
const TABLE_SECTOR: Record<string, ActivitySector> = {
  orders: "comercial",
  clients: "comercial",
  crm_deals: "comercial",
  quotes: "comercial",
  contracts: "comercial",
  fin_payables: "financeiro",
  fin_receivables: "financeiro",
  fin_ledger_entries: "financeiro",
  fin_bank_accounts: "financeiro",
  fin_chart_accounts: "controladoria",
  fin_financial_goals: "controladoria",
  production_orders: "operacoes",
  order_items: "comercial",
  profiles: "sistema",
  company_settings: "sistema",
  automation_rules: "sistema",
  
};

// ── Critical event detection ──
const CRITICAL_TABLES = new Set([
  "fin_chart_accounts", "fin_financial_goals", "profiles",
  "company_settings", "automation_rules",
]);
const CRITICAL_FIELDS = new Set([
  "status", "role", "is_owner", "active", "amount", "total_value",
]);

// ── Human-readable labels ──
function buildLabel(event: { event_type: string; table_name: string; field_name: string | null; new_value: string | null }): string {
  const tableLabels: Record<string, string> = {
    orders: "Pedido",
    clients: "Cliente",
    fin_payables: "Conta a Pagar",
    fin_receivables: "Conta a Receber",
    fin_ledger_entries: "Lançamento",
    production_orders: "Ordem Produção",
    fin_chart_accounts: "Plano de Contas",
    fin_financial_goals: "Meta Financeira",
    profiles: "Usuário",
    company_settings: "Configuração",
    automation_rules: "Automação",
    contracts: "Contrato",
    
  };
  const eventLabels: Record<string, string> = {
    CREATE: "criado",
    UPDATE: "alterado",
    DELETE: "excluído",
    DELETE_LOGICO: "desativado",
    APPROVE: "aprovado",
    LOGIN: "fez login",
    EXPORT: "exportou",
  };
  const table = tableLabels[event.table_name] || event.table_name;
  const action = eventLabels[event.event_type] || event.event_type;

  if (event.event_type === "UPDATE" && event.field_name === "status" && event.new_value) {
    return `${table} → ${event.new_value}`;
  }
  return `${table} ${action}`;
}

// ── Extract financial impact from metadata ──
function extractFinancialImpact(event: { metadata: any; table_name: string; new_value: string | null; field_name: string | null }): number | null {
  if (event.metadata?.amount) return Number(event.metadata.amount);
  if (event.field_name === "amount" || event.field_name === "total_value" || event.field_name === "value") {
    const val = Number(event.new_value);
    return isNaN(val) ? null : val;
  }
  return null;
}

// ── Hook ──
export function useActivityFeed(options?: {
  sector?: ActivitySector;
  scope?: ActivityScope;
  limit?: number;
}) {
  const { user } = useAuth();
  const sector = options?.sector || "all";
  const scope = options?.scope || "company";
  const limit = options?.limit || 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["activity-feed", user?.id, sector, scope, limit],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      // Scope filter
      if (scope === "mine") {
        query = query.eq("user_id", user.id);
      }

      // Sector filter by table names
      if (sector !== "all") {
        const tables = Object.entries(TABLE_SECTOR)
          .filter(([, s]) => s === sector)
          .map(([t]) => t);
        if (tables.length > 0) {
          query = query.in("table_name", tables);
        }
      }

      const { data: rows, error } = await query;
      if (error) throw error;

      return (rows || []).map((row): ActivityEvent => ({
        ...row,
        sector: TABLE_SECTOR[row.table_name] || "sistema",
        label: buildLabel(row),
        isCritical: CRITICAL_TABLES.has(row.table_name) || (row.field_name ? CRITICAL_FIELDS.has(row.field_name) : false),
        financialImpact: extractFinancialImpact(row),
      }));
    },
    enabled: !!user,
    refetchInterval: 60_000, // 1 min
    staleTime: 30_000,
  });

  return { events: data || [], isLoading, refetch };
}
