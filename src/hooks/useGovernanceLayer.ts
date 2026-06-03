import { useQuery } from "@tanstack/react-query";
import { auditStub } from "@/lib/audit-stub";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { format, subDays } from "date-fns";

// ─── Types ───
export type PermissionLevel = "owner" | "admin" | "gestor" | "operador" | "visualizacao";

export interface AuditEntry {
  id: string;
  user_id: string | null;
  table_name: string;
  event_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  record_id: string;
}

export interface StructuralLock {
  id: string;
  entity: string;
  reason: string;
  locked: boolean;
  canOverride: boolean;
}

export interface GovernanceStats {
  totalAuditEntries7d: number;
  criticalChanges7d: number;
  activeStructuralLocks: number;
}

export interface GovernanceData {
  stats: GovernanceStats;
  recentAudit: AuditEntry[];
  structuralLocks: StructuralLock[];
  userLevel: PermissionLevel;
}

function resolveLevel(userLevel: string): PermissionLevel {
  if (userLevel === "system_owner") return "owner";
  if (userLevel === "tenant_owner") return "admin";
  if (userLevel === "admin") return "admin";
  if (userLevel === "manager") return "gestor";
  if (userLevel === "viewer") return "visualizacao";
  return "operador";
}

// Permission matrix: what each level can do
export const PERMISSION_MATRIX: Record<PermissionLevel, Record<string, boolean>> = {
  owner: {
    alterar_dre: true, fechar_mes: true, excluir_lancamento: true,
    editar_metas: true, alterar_plano_contas: true, alterar_centro_custo: true,
    override_lock: true, aprovar_alteracoes: true, ver_auditoria: true,
    editar_valor_financeiro: true, editar_descricao: true,
  },
  admin: {
    alterar_dre: true, fechar_mes: true, excluir_lancamento: true,
    editar_metas: true, alterar_plano_contas: true, alterar_centro_custo: true,
    override_lock: false, aprovar_alteracoes: true, ver_auditoria: true,
    editar_valor_financeiro: true, editar_descricao: true,
  },
  gestor: {
    alterar_dre: false, fechar_mes: false, excluir_lancamento: false,
    editar_metas: true, alterar_plano_contas: false, alterar_centro_custo: false,
    override_lock: false, aprovar_alteracoes: true, ver_auditoria: true,
    editar_valor_financeiro: false, editar_descricao: true,
  },
  operador: {
    alterar_dre: false, fechar_mes: false, excluir_lancamento: false,
    editar_metas: false, alterar_plano_contas: false, alterar_centro_custo: false,
    override_lock: false, aprovar_alteracoes: false, ver_auditoria: false,
    editar_valor_financeiro: false, editar_descricao: true,
  },
  visualizacao: {
    alterar_dre: false, fechar_mes: false, excluir_lancamento: false,
    editar_metas: false, alterar_plano_contas: false, alterar_centro_custo: false,
    override_lock: false, aprovar_alteracoes: false, ver_auditoria: false,
    editar_valor_financeiro: false, editar_descricao: false,
  },
};

export const PERMISSION_LABELS: Record<string, string> = {
  alterar_dre: "Alterar DRE",
  fechar_mes: "Fechar Mês",
  excluir_lancamento: "Excluir Lançamento",
  editar_metas: "Editar Metas",
  alterar_plano_contas: "Alterar Plano de Contas",
  alterar_centro_custo: "Alterar Centro de Custo",
  override_lock: "Destravar Bloqueio",
  aprovar_alteracoes: "Aprovar Alterações",
  ver_auditoria: "Ver Auditoria",
  editar_valor_financeiro: "Editar Valor Financeiro",
  editar_descricao: "Editar Descrição",
};

export function useGovernanceLayer() {
  const { user } = useAuth();
  const { userLevel } = usePermissions();
  const level = resolveLevel(userLevel);

  return useQuery({
    queryKey: ["governance-layer", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<GovernanceData> => {
      const d7 = format(subDays(new Date(), 7), "yyyy-MM-dd");

      const [auditRes, auditCountRes] = await Promise.all([auditStub().select("*")
          .gte("created_at", d7)
          .order("created_at", { ascending: false })
          .limit(20),auditStub().select("id", { count: "exact", head: true })
          .gte("created_at", d7),
      ]);

      const recentAudit: AuditEntry[] = (auditRes.data || []).map((r: any) => ({
        id: r.id, user_id: r.user_id, table_name: r.table_name,
        event_type: r.event_type, field_name: r.field_name,
        old_value: r.old_value, new_value: r.new_value,
        created_at: r.created_at, record_id: r.record_id,
      }));

      const criticalTables = new Set(["fin_ledger_entries", "fin_chart_accounts", "fin_cost_centers", "company_settings", "orders"]);
      const criticalChanges7d = recentAudit.filter(a => criticalTables.has(a.table_name)).length;

      // Structural locks (derived from system state)
      const structuralLocks: StructuralLock[] = [
        { id: "lock-conciliados", entity: "Lançamentos Conciliados", reason: "Lançamentos conciliados não podem ser alterados", locked: true, canOverride: level === "owner" },
        { id: "lock-faturados", entity: "Pedidos Faturados", reason: "Pedidos faturados têm alteração restrita", locked: true, canOverride: level === "owner" || level === "admin" },
        { id: "lock-mes-fechado", entity: "Mês Fechado", reason: "Alterações retroativas bloqueadas após fechamento", locked: true, canOverride: level === "owner" },
      ];

      return {
        stats: {
          totalAuditEntries7d: auditCountRes.count || 0,
          criticalChanges7d,
          activeStructuralLocks: structuralLocks.filter(l => l.locked).length,
        },
        recentAudit,
        structuralLocks,
        userLevel: level,
      };
    },
    refetchInterval: 300000,
    staleTime: 120000,
  });
}

// Helper to check if current user can perform action
export function useCanPerform(action: string): boolean {
  const { userLevel } = usePermissions();
  const level = resolveLevel(userLevel);
  return PERMISSION_MATRIX[level]?.[action] ?? false;
}
