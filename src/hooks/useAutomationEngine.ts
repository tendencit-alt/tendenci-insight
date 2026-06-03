import { useCallback, useState } from "react";
import { auditStub } from "@/lib/audit-stub";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AutomationEvent, AutomationCondition, AutomationAction } from "@/lib/automation-engine/types";

function evaluateConditions(conditions: AutomationCondition[], payload: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => {
    const val = payload[c.field];
    switch (c.operator) {
      case "eq": return val === c.value;
      case "neq": return val !== c.value;
      case "gt": return val > c.value;
      case "gte": return val >= c.value;
      case "lt": return val < c.value;
      case "lte": return val <= c.value;
      case "in": return Array.isArray(c.value) && c.value.includes(val);
      case "not_in": return Array.isArray(c.value) && !c.value.includes(val);
      case "contains": return typeof val === "string" && val.includes(c.value);
      case "is_null": return val == null;
      case "is_not_null": return val != null;
      default: return true;
    }
  });
}

export function useAutomationEngine() {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const fireEvent = useCallback(async (event: AutomationEvent) => {
    setProcessing(true);
    const startTime = Date.now();
    const results: { ruleId: string; ruleName: string; actions: AutomationAction[]; status: string; error?: string }[] = [];

    try {
      // Fetch active rules for this event, ordered by priority
      const { data: rules, error } = await (supabase
        .from("automation_rules" as any)
        .select("*")
        .eq("event_type", event.type)
        .eq("active", true)
        .order("priority", { ascending: true }) as any);

      if (error) throw error;
      if (!rules?.length) return results;

      for (const rule of rules) {
        const conditions = (rule.conditions || []) as AutomationCondition[];
        const actions = (rule.actions || []) as AutomationAction[];

        // Evaluate conditions
        if (!evaluateConditions(conditions, event.payload)) continue;

        const logStatus = event.simulate ? "simulacao" : "sucesso";
        let logError: string | undefined;

        if (!event.simulate) {
          try {
            // Execute actions (notification-based for now; heavy actions handled by edge function)
            for (const action of actions) {
              if (action.type === "criar_notificacao" || action.type === "notificar_usuario" || action.type === "enviar_alerta") {
                await (supabase.from("erp_notifications" as any).insert({
                  title: `Automação: ${rule.name}`,
                  message: `Evento "${event.type}" disparou a regra "${rule.name}"`,
                  module: event.module,
                  category: "automacao",
                  user_id: event.triggeredBy,
                  entity_id: event.sourceId,
                  entity_table: event.sourceTable,
                  link_path: `/${event.sourceTable}/${event.sourceId}`,
                } as any) as any);
              }

              if (action.type === "criar_tarefa") {
                await (supabase.from("erp_tasks" as any).insert({
                  title: action.params?.title || `Tarefa automática: ${rule.name}`,
                  description: action.params?.description || `Gerada pela automação "${rule.name}"`,
                  assignee_id: event.triggeredBy,
                  category: "automacao",
                  status: "pendente",
                  entity_id: event.sourceId,
                  entity_table: event.sourceTable,
                  module: event.module,
                } as any) as any);
              }

              if (action.type === "registrar_auditoria") {
                await auditStub().insert({
                  table_name: event.sourceTable,
                  record_id: event.sourceId,
                  event_type: "AUTOMATION",
                  event_source: "automation_engine",
                  user_id: event.triggeredBy,
                  metadata: { rule_id: rule.id, rule_name: rule.name, event_type: event.type },
                } as any);
              }
            }

            // Update rule stats
            await (supabase.from("automation_rules" as any)
              .update({
                last_executed_at: new Date().toISOString(),
                execution_count: (rule.execution_count || 0) + 1,
              })
              .eq("id", rule.id) as any);
          } catch (execErr: any) {
            logError = execErr.message;
            await (supabase.from("automation_rules" as any)
              .update({ error_count: (rule.error_count || 0) + 1 })
              .eq("id", rule.id) as any);
          }
        }

        // Log execution
        await (supabase.from("automation_execution_logs" as any).insert({
          rule_id: rule.id,
          rule_name: rule.name,
          event_type: event.type,
          event_payload: event.payload,
          source_table: event.sourceTable,
          source_id: event.sourceId,
          actions_executed: actions,
          status: logError ? "falha" : logStatus,
          error_message: logError || null,
          execution_time_ms: Date.now() - startTime,
          triggered_by: event.triggeredBy,
        } as any) as any);

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actions,
          status: logError ? "falha" : logStatus,
          error: logError,
        });
      }

      if (!event.simulate && results.length > 0) {
        const failures = results.filter((r) => r.status === "falha").length;
        if (failures > 0) {
          toast({ title: `${results.length} automações executadas (${failures} com erro)`, variant: "destructive" });
        }
      }

      return results;
    } catch (err: any) {
      toast({ title: "Erro no motor de automações", description: err.message, variant: "destructive" });
      return results;
    } finally {
      setProcessing(false);
    }
  }, [toast]);

  return { fireEvent, processing };
}
