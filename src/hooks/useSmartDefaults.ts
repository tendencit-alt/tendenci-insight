import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

// ── Smart Default Definitions per module ──
export interface SmartDefaultRule {
  field: string;
  /** Resolver: returns the default value or undefined */
  resolve: (ctx: SmartDefaultContext) => any;
}

export interface SmartDefaultContext {
  userId?: string;
  tenantId?: string;
  today: string;
  currentMonth: string;
  currentYear: string;
}

// ── Module default configs ──
const DESPESA_DEFAULTS: SmartDefaultRule[] = [
  { field: "data_competencia", resolve: (ctx) => ctx.today },
  { field: "data_vencimento", resolve: (ctx) => ctx.today },
  { field: "status", resolve: () => "pendente" },
  { field: "tipo", resolve: () => "fixa" },
];

const RECEITA_DEFAULTS: SmartDefaultRule[] = [
  { field: "data_competencia", resolve: (ctx) => ctx.today },
  { field: "data_vencimento", resolve: (ctx) => ctx.today },
  { field: "status", resolve: () => "pendente" },
];

const PEDIDO_DEFAULTS: SmartDefaultRule[] = [
  { field: "data_pedido", resolve: (ctx) => ctx.today },
  { field: "status", resolve: () => "rascunho" },
];

const PROJETO_DEFAULTS: SmartDefaultRule[] = [
  { field: "data_inicio", resolve: (ctx) => ctx.today },
  { field: "status", resolve: () => "planejamento" },
];

const META_DEFAULTS: SmartDefaultRule[] = [
  { field: "periodo", resolve: (ctx) => `${ctx.currentYear}-${ctx.currentMonth}` },
  { field: "status", resolve: () => "ativa" },
];

const MODULE_DEFAULTS: Record<string, SmartDefaultRule[]> = {
  despesa: DESPESA_DEFAULTS,
  receita: RECEITA_DEFAULTS,
  pedido: PEDIDO_DEFAULTS,
  projeto: PROJETO_DEFAULTS,
  meta: META_DEFAULTS,
};

export function useSmartDefaults(moduleKey: string) {
  const { user, tenantId } = useAuth();

  const context = useMemo<SmartDefaultContext>(() => {
    const now = new Date();
    return {
      userId: user?.id,
      tenantId: undefined,
      today: now.toISOString().split("T")[0],
      currentMonth: String(now.getMonth() + 1).padStart(2, "0"),
      currentYear: String(now.getFullYear()),
    };
  }, [user?.id]);

  const getDefaults = useCallback((): Record<string, any> => {
    const rules = MODULE_DEFAULTS[moduleKey] || [];
    const defaults: Record<string, any> = {};
    for (const rule of rules) {
      const val = rule.resolve(context);
      if (val !== undefined) {
        defaults[rule.field] = val;
      }
    }
    return defaults;
  }, [moduleKey, context]);

  /** Apply defaults to existing values (only fill empty fields) */
  const applyDefaults = useCallback(
    (currentValues: Record<string, any>): Record<string, any> => {
      const defaults = getDefaults();
      const merged = { ...currentValues };
      for (const [key, val] of Object.entries(defaults)) {
        if (
          merged[key] === undefined ||
          merged[key] === null ||
          merged[key] === ""
        ) {
          merged[key] = val;
        }
      }
      return merged;
    },
    [getDefaults]
  );

  return { getDefaults, applyDefaults, context };
}
