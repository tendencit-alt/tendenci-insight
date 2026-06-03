import { useState, useMemo, useCallback } from "react";
import { auditStub } from "@/lib/audit-stub";
import { StatusMachine } from "@/lib/status-machine/engine";
import { getConfigForEntity } from "@/lib/status-machine/config";
import type { StatusKey, StatusTransition, StatusMachineConfig } from "@/lib/status-machine/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseStatusMachineOptions {
  entityType: string;
  recordId?: string;
  currentStatus: StatusKey;
  tableName?: string;
  statusColumn?: string;
  customConfig?: StatusMachineConfig;
  onTransition?: (transition: StatusTransition) => void | Promise<void>;
}

export function useStatusMachine({
  entityType,
  recordId,
  currentStatus,
  tableName,
  statusColumn = "status",
  customConfig,
  onTransition,
}: UseStatusMachineOptions) {
  const { toast } = useToast();
  const [transitioning, setTransitioning] = useState(false);
  const [transitionLog, setTransitionLog] = useState<StatusTransition[]>([]);

  const machine = useMemo(
    () => new StatusMachine(customConfig || getConfigForEntity(entityType)),
    [entityType, customConfig]
  );

  const status = machine.getStatus(currentStatus);
  const availableTransitions = machine.getAvailableTransitions(currentStatus);
  const isEditable = machine.isEditable(currentStatus);
  const events = machine.getEventsForStatus(currentStatus);

  const transition = useCallback(
    async (to: StatusKey, userId: string, userName?: string, reason?: string) => {
      const record = machine.createTransition(currentStatus, to, userId, userName, reason);
      if (!record) {
        toast({ title: "Transição não permitida", variant: "destructive" });
        return false;
      }

      setTransitioning(true);
      try {
        // Persist to DB if table provided
        if (tableName && recordId) {
          const { error } = await (supabase.from(tableName as any) as any)
            .update({ [statusColumn]: to, updated_at: new Date().toISOString() })
            .eq("id", recordId);
          if (error) throw error;

          // Log transition to audit
          await auditStub().insert({
            table_name: tableName,
            record_id: recordId,
            event_type: "STATUS_CHANGE",
            event_source: "status_machine",
            field_name: statusColumn,
            old_value: currentStatus,
            new_value: to,
            user_id: userId,
            metadata: { reason },
          } as any);
        }

        setTransitionLog((prev) => [...prev, record]);
        await onTransition?.(record);

        toast({ title: `Status alterado para ${machine.getStatus(to)?.label || to}` });
        return true;
      } catch (err: any) {
        toast({ title: "Erro ao alterar status", description: err.message, variant: "destructive" });
        return false;
      } finally {
        setTransitioning(false);
      }
    },
    [currentStatus, machine, tableName, recordId, statusColumn, onTransition, toast]
  );

  return {
    machine,
    status,
    availableTransitions,
    isEditable,
    events,
    transition,
    transitioning,
    transitionLog,
  };
}
