// Hooks de dados para a aba RH / PJ do módulo Financeiro.
// Tenant-safe via RLS. Mostra erros via sonner.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ────────────────────────────────────────────────────────────
// Permissão sensível (salário/CPF): admin do inquilino OU Owner
// OU usuário com módulo Financeiro com can_admin/can_edit.
// O backend já valida (gatilho); aqui ajustamos só a UI.
// ────────────────────────────────────────────────────────────
export function useCanViewHrPii() {
  return useQuery({
    queryKey: ["can-view-hr-pii"],
    queryFn: async () => {
      const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
      if (!tenantId) return false;
      const { data, error } = await supabase.rpc("can_view_hr_pii", { _tenant: tenantId });
      if (error) return false;
      return !!data;
    },
    staleTime: 60_000,
  });
}

// ── Employees (estende o já existente) ──
export function useRhEmployees() {
  return useQuery({
    queryKey: ["rh-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_employees")
        .select("*, hr_positions(title), hr_departments(name)")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      if (id) {
        const { error } = await supabase.from("hr_employees").update(values).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_employees").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rh-employees"] });
      toast.success("Colaborador salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rh-employees"] }); toast.success("Colaborador removido"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Time records (ponto) ──
export function useTimeRecords(employeeId?: string, month?: string) {
  return useQuery({
    queryKey: ["hr-time-records", employeeId, month],
    queryFn: async () => {
      let q = supabase.from("hr_time_records").select("*").order("work_date", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      if (month) q = q.gte("work_date", `${month}-01`).lte("work_date", `${month}-31`);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!employeeId,
  });
}

export function useCreateTimeRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("hr_time_records").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-time-records"] });
      toast.success("Ponto registrado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Absences ──
export function useAbsences(employeeId?: string) {
  return useQuery({
    queryKey: ["hr-absences", employeeId],
    queryFn: async () => {
      let q = supabase.from("hr_absences").select("*").order("absence_date", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!employeeId,
  });
}

export function useCreateAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("hr_absences").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-absences"] }); toast.success("Ocorrência registrada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Medical certificates ──
export function useMedicalCertificates(employeeId?: string) {
  return useQuery({
    queryKey: ["hr-medical-certificates", employeeId],
    queryFn: async () => {
      let q = supabase.from("hr_medical_certificates").select("*").order("start_date", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!employeeId,
  });
}

export function useCreateMedicalCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, ...values }: any) => {
      let file_path: string | null = null;
      if (file) {
        const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
        const ext = file.name.split(".").pop();
        const key = `${tenantId}/${values.employee_id}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("hr-medical-certificates").upload(key, file);
        if (up.error) throw up.error;
        file_path = up.data.path;
      }
      const { error } = await supabase.from("hr_medical_certificates").insert({ ...values, file_path });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-medical-certificates"] }); toast.success("Atestado registrado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Monthly summary ──
export function useEmployeeMonthSummary(employeeId?: string, month?: string) {
  return useQuery({
    queryKey: ["hr-summary", employeeId, month],
    queryFn: async () => {
      if (!employeeId || !month) return null;
      const start = `${month}-01`;
      const end = `${month}-31`;
      const [times, abs, certs] = await Promise.all([
        supabase.from("hr_time_records").select("worked_hours").eq("employee_id", employeeId).gte("work_date", start).lte("work_date", end),
        supabase.from("hr_absences").select("absence_type").eq("employee_id", employeeId).gte("absence_date", start).lte("absence_date", end),
        supabase.from("hr_medical_certificates").select("days_count").eq("employee_id", employeeId).gte("start_date", start).lte("start_date", end),
      ]);
      const totalHours = (times.data ?? []).reduce((s: number, r: any) => s + Number(r.worked_hours || 0), 0);
      const faltas = (abs.data ?? []).filter((a: any) => a.absence_type === "falta").length;
      const atrasos = (abs.data ?? []).filter((a: any) => a.absence_type === "atraso").length;
      const atestadoDias = (certs.data ?? []).reduce((s: number, r: any) => s + Number(r.days_count || 0), 0);
      return { totalHours, faltas, atrasos, atestadoDias };
    },
    enabled: !!employeeId && !!month,
  });
}

// ── Service Providers (PJ) ──
export function useServiceProviders() {
  return useQuery({
    queryKey: ["service-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_providers").select("*").order("legal_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveServiceProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      if (id) {
        const { error } = await supabase.from("service_providers").update(values).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_providers").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-providers"] }); toast.success("Prestador salvo"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteServiceProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-providers"] }); toast.success("Prestador removido"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useServiceProviderDocs(providerId?: string) {
  return useQuery({
    queryKey: ["service-provider-docs", providerId],
    queryFn: async () => {
      if (!providerId) return [];
      const { data, error } = await supabase
        .from("service_provider_documents")
        .select("*")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!providerId,
  });
}

export function useUploadProviderDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider_id, file, doc_type, description }: any) => {
      const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
      const ext = file.name.split(".").pop();
      const key = `${tenantId}/${provider_id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("service-provider-documents").upload(key, file);
      if (up.error) throw up.error;
      const { error } = await supabase.from("service_provider_documents").insert({
        provider_id, doc_type, description, file_path: up.data.path,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-provider-docs"] }); toast.success("Documento enviado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export async function getSignedUrl(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

// ── Plano de contas (despesas) para apontamento de folha ──
export function useExpenseChartAccounts() {
  return useQuery({
    queryKey: ["fin-chart-accounts-expense-rhpj"],
    queryFn: async () => {
      const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
      let q = supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature, active, tenant_id")
        .eq("active", true)
        .order("code");
      if (tenantId) q = q.eq("tenant_id", tenantId as string);
      const { data, error } = await q;
      if (error) throw error;
      const filtered = (data ?? []).filter((c: any) =>
        !c.nature || /desp|custo|expense/i.test(c.nature)
      );
      // Dedup defensivo por (code, name) — evita repetição caso o usuário (ex.: Owner) enxergue múltiplos tenants.
      const seen = new Set<string>();
      return filtered.filter((c: any) => {
        const k = `${c.code}|${c.name}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    },
    staleTime: 5 * 60_000,
  });
}

// ── HR Settings (encargos + geofence) ──
export function useHrSettings() {
  return useQuery({
    queryKey: ["hr-settings"],
    queryFn: async () => {
      const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
      if (!tenantId) return null;
      const { data, error } = await supabase.rpc("get_hr_settings", { _tenant: tenantId });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    staleTime: 60_000,
  });
}

export function useSaveHrSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
      if (!tenantId) throw new Error("Tenant não identificado");
      const payload = { ...values, tenant_id: tenantId };
      const { error } = await supabase
        .from("hr_settings")
        .upsert(payload, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-settings"] }); toast.success("Configurações salvas"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Locais de trabalho (geofence) ──
export function useWorkLocations() {
  return useQuery({
    queryKey: ["hr-work-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_work_locations").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useSaveWorkLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      if (id) {
        const { error } = await supabase.from("hr_work_locations").update(values).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_work_locations").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-work-locations"] }); toast.success("Local salvo"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteWorkLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_work_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-work-locations"] }); toast.success("Local removido"); },
    onError: (e: any) => toast.error(e.message),
  });
}

