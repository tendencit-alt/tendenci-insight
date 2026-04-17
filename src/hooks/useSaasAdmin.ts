import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompanyOverview {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  active: boolean;
  plan_id: string | null;
  plan_name: string | null;
  plan_price: number | null;
  subscription_status: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  health_score: number | null;
  health_classification: string | null;
  active_users: number;
  max_users: number;
  last_user_login: string | null;
  overdue_invoices: number;
  active_modules: number;
  created_at: string;
}

export interface TenantLimit {
  limit_key: string;
  limit_name: string;
  limit_value: number;
  current_usage: number;
  pct_used: number;
}

export interface AdminAnalytics {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  trial_tenants: number;
  past_due_tenants: number;
  total_users: number;
  tenants_at_risk: number;
  tenants_healthy: number;
  avg_health_score: number;
  tenants_by_plan: Record<string, number>;
  top_active_modules: Array<{ module: string; count: number }>;
  overdue_by_plan: Record<string, number>;
}

export function useCompanyOverview(tenantId?: string) {
  return useQuery({
    queryKey: ["saas-admin", "company-overview", tenantId ?? "all"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_saas_company_overview", {
        _tenant_id: tenantId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as CompanyOverview[];
    },
  });
}

export function useTenantLimits(tenantId?: string) {
  return useQuery({
    queryKey: ["saas-admin", "tenant-limits", tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as TenantLimit[];
      const { data, error } = await supabase.rpc("get_saas_tenant_limits", { _tenant_id: tenantId });
      if (error) throw error;
      return (data ?? []) as TenantLimit[];
    },
    enabled: !!tenantId,
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["saas-admin", "analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_saas_admin_analytics");
      if (error) throw error;
      return data as unknown as AdminAnalytics;
    },
  });
}

export function useTenantUsers(tenantId?: string) {
  return useQuery({
    queryKey: ["saas-admin", "tenant-users", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, is_owner, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export function useAllPlans() {
  return useQuery({
    queryKey: ["saas-admin", "all-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_plans")
        .select("id, name, price, max_users, max_projects, max_orders, max_storage_mb, active")
        .eq("active", true)
        .order("price");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFeatureFlagsWithOverrides(tenantId?: string) {
  return useQuery({
    queryKey: ["saas-admin", "feature-flags", tenantId],
    queryFn: async () => {
      const { data: flags, error } = await supabase
        .from("feature_flags")
        .select("id, flag_key, flag_name, description, default_enabled, category");
      if (error) throw error;
      let overrides: Array<{ flag_id: string; enabled: boolean }> = [];
      if (tenantId) {
        const { data: ovs } = await supabase
          .from("feature_flag_overrides")
          .select("flag_id, enabled")
          .eq("tenant_id", tenantId);
        overrides = ovs ?? [];
      }
      return (flags ?? []).map((f) => ({
        ...f,
        override_enabled: overrides.find((o) => o.flag_id === f.id)?.enabled ?? null,
        effective_enabled: overrides.find((o) => o.flag_id === f.id)?.enabled ?? f.default_enabled,
      }));
    },
  });
}

export function useAdminActionLog(tenantId?: string) {
  return useQuery({
    queryKey: ["saas-admin", "action-log", tenantId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("saas_admin_action_log")
        .select("id, actor_id, target_tenant_id, target_user_id, action_type, action_category, reason, before_state, after_state, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (tenantId) q = q.eq("target_tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

interface AdminActionPayload {
  action: string;
  target_tenant_id?: string;
  target_user_id?: string;
  reason: string;
  payload?: Record<string, unknown>;
}

export function useAdminAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AdminActionPayload) => {
      const { data, error } = await supabase.functions.invoke("saas-admin-action", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Ação executada e registrada");
      qc.invalidateQueries({ queryKey: ["saas-admin"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Falha ao executar ação");
    },
  });
}

export function useTenantInsights() {
  return useMutation({
    mutationFn: async (tenant_id: string) => {
      const { data, error } = await supabase.functions.invoke("saas-admin-insights", { body: { tenant_id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { insights: string; tenant: CompanyOverview; limits: TenantLimit[] };
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
