import { supabase } from "@/integrations/supabase/client";

export type AuditEvent =
  | "create"
  | "update"
  | "delete"
  | "reallocate"
  | "bulk_update";

interface LogParams {
  table_name: string;
  record_id: string;
  event_type: AuditEvent;
  event_source?: string;
  field_name?: string;
  old_value?: string | null;
  new_value?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Insert a row into the universal audit_log.
 * Silent: errors are logged but never thrown — auditing must never break business flows.
 */
export async function logAudit(params: LogParams) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id ?? null;

    const payload = {
      user_id,
      table_name: params.table_name,
      record_id: params.record_id,
      event_type: params.event_type,
      event_source: params.event_source ?? "ui:categories_manager",
      field_name: params.field_name ?? null,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
      metadata: params.metadata ?? null,
    };

    const { error } = await supabase.from("audit_log").insert(payload as any);
    if (error) console.warn("[audit_log] insert failed", error);
  } catch (e) {
    console.warn("[audit_log] unexpected error", e);
  }
}
