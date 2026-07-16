import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ResolvedEntitlement {
  code: string;
  name: string;
  entitlement_group: string;
  type: "module" | "feature" | "limit" | "addon";
  is_premium: boolean;
  enabled: boolean;
  source: "core" | "override" | "grant" | "billing_blocked" | "plan";
  limit_value: number;
  expires_at: string | null;
}

/** Carrega o mapa completo de entitlements do tenant atual (cache global). */
export function useTenantEntitlements() {
  const { profile } = useAuth() as any;
  // Tenant ATIVO (mesma regra do useActiveTenant): current_tenant_id tem precedência
  const tenantId = (profile?.current_tenant_id ?? profile?.tenant_id) as string | undefined;

  return useQuery({
    queryKey: ["entitlements", tenantId],
    queryFn: async (): Promise<ResolvedEntitlement[]> => {
      if (!tenantId) return [];
      const { data, error } = await (supabase as any).rpc("get_tenant_entitlements_resolved", {
        _tenant_id: tenantId,
      });
      if (error) throw error;
      return (data ?? []) as ResolvedEntitlement[];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

/** Hook ergonomico: useEntitlement('crm') -> { allowed, source, limit, expires } */
export function useEntitlement(code: string) {
  const { data, isLoading } = useTenantEntitlements();
  const found = data?.find((e) => e.code === code);
  return {
    allowed: found?.enabled ?? false,
    source: found?.source ?? "plan",
    limit: found?.limit_value ?? 0,
    expiresAt: found?.expires_at ?? null,
    isPremium: found?.is_premium ?? false,
    name: found?.name ?? code,
    isLoading,
  };
}

// ============================================================================
// OWNER MANAGEMENT HOOKS
// ============================================================================

export function useEntitlementCatalog() {
  return useQuery({
    queryKey: ["entitlement-catalog"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("entitlement_catalog")
        .select("*")
        .order("entitlement_group")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePlanEntitlements(planId?: string) {
  return useQuery({
    queryKey: ["plan-entitlements", planId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any).from("plan_entitlements").select("*, tenant_plans(name), entitlement_catalog(name, type, is_premium)");
      if (planId) q = q.eq("plan_id", planId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTenantOverrides(tenantId?: string) {
  return useQuery({
    queryKey: ["tenant-overrides", tenantId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("tenant_entitlement_overrides")
        .select("*, tenants(name), entitlement_catalog(name)")
        .order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTenantGrants(tenantId?: string) {
  return useQuery({
    queryKey: ["tenant-grants", tenantId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("tenant_entitlement_grants")
        .select("*, tenants(name), entitlement_catalog(name)")
        .order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEntitlementAnalytics() {
  return useQuery({
    queryKey: ["entitlement-analytics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_owner_entitlement_analytics");
      if (error) throw error;
      return data as any;
    },
  });
}

export function useUpsertOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      tenant_id: string;
      entitlement_code: string;
      enabled: boolean;
      reason?: string;
      expires_at?: string | null;
      limit_value?: number | null;
      source?: string;
    }) => {
      const { error } = await (supabase as any)
        .from("tenant_entitlement_overrides")
        .upsert({ ...payload, active: true, source: payload.source ?? "manual" }, { onConflict: "tenant_id,entitlement_code" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Override salvo");
      qc.invalidateQueries({ queryKey: ["tenant-overrides"] });
      qc.invalidateQueries({ queryKey: ["entitlements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      tenant_id: string;
      entitlement_code: string;
      grant_type: "trial" | "upgrade" | "campaign" | "manual" | "onboarding_bonus";
      duration_days: number;
      reason?: string;
    }) => {
      const expires_at = new Date(Date.now() + payload.duration_days * 86400000).toISOString();
      const { error } = await (supabase as any).from("tenant_entitlement_grants").insert({
        ...payload,
        expires_at,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grant criado");
      qc.invalidateQueries({ queryKey: ["tenant-grants"] });
      qc.invalidateQueries({ queryKey: ["entitlements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpsertPlanEntitlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { plan_id: string; entitlement_code: string; included: boolean; limit_value?: number | null }) => {
      const { error } = await (supabase as any)
        .from("plan_entitlements")
        .upsert(payload, { onConflict: "plan_id,entitlement_code" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano atualizado");
      qc.invalidateQueries({ queryKey: ["plan-entitlements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
