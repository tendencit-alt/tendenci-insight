import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TenantMembership {
  tenant_id: string;
  role: string;
  name: string;
  is_active: boolean;
  is_home: boolean;
}

export function useActiveTenant() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const homeTenantId = profile?.tenant_id ?? null;
  const currentTenantId = profile?.current_tenant_id ?? null;
  const activeTenantId = currentTenantId ?? homeTenantId;
  const isOwner = profile?.is_owner === true;
  // Owner is in "acting-as-tenant" mode when current_tenant_id points to a tenant
  // other than their home tenant.
  const isImpersonating = isOwner && !!currentTenantId && currentTenantId !== homeTenantId;

  const load = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    let rows: TenantMembership[] = [];

    if (isOwner) {
      // Owner sees ALL tenants and can enter any of them.
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) {
        console.error("Failed loading tenants for owner", error);
      } else {
        rows = (data ?? []).map((t: any) => ({
          tenant_id: t.id,
          role: "owner",
          name: t.name ?? "(sem nome)",
          is_active: t.id === activeTenantId,
          is_home: t.id === homeTenantId,
        }));
      }
    } else {
      const { data, error } = await supabase
        .from("user_tenants")
        .select("tenant_id, role, tenants:tenant_id(id, name)")
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed loading memberships", error);
      } else {
        rows = (data ?? []).map((row: any) => ({
          tenant_id: row.tenant_id,
          role: row.role,
          name: row.tenants?.name ?? "(sem nome)",
          is_active: row.tenant_id === activeTenantId,
          is_home: row.tenant_id === homeTenantId,
        }));
      }
    }

    setMemberships(rows);
    setLoading(false);
  }, [user, activeTenantId, homeTenantId, isOwner]);

  useEffect(() => {
    load();
  }, [load]);

  const broadcastChange = useCallback((tenantId: string | null) => {
    try {
      const payload = { tenantId, ts: Date.now() };
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("active-tenant");
        bc.postMessage(payload);
        bc.close();
      }
      localStorage.setItem("active-tenant-switch", JSON.stringify(payload));
    } catch {
      /* noop */
    }
  }, []);

  const switchTenant = useCallback(async (targetTenantId: string): Promise<boolean> => {
    setSwitching(true);
    try {
      const { error } = await supabase.rpc("set_active_tenant", {
        target_tenant_id: targetTenantId,
      });
      if (error) {
        const msg = (error.message ?? "").toLowerCase();
        const isPermission =
          msg.includes("not a member") ||
          msg.includes("permission") ||
          msg.includes("not allowed") ||
          msg.includes("forbidden") ||
          msg.includes("access") ||
          error.code === "42501" ||
          error.code === "P0001";
        toast.error(
          isPermission
            ? "Você não tem permissão para acessar essa empresa."
            : "Não foi possível trocar de empresa.",
          { description: error.message }
        );
        setSwitching(false);
        return false;
      }
      broadcastChange(targetTenantId);
      await refreshProfile();
      await queryClient.invalidateQueries();
      toast.success("Empresa ativa atualizada");
      return true;
    } catch (err: any) {
      toast.error("Não foi possível trocar de empresa.", { description: err?.message });
      return false;
    } finally {
      setSwitching(false);
    }
  }, [refreshProfile, queryClient, broadcastChange]);

  // Owner-only: leave impersonation and return to Owner mode (current_tenant_id = NULL).
  const exitToOwnerMode = useCallback(async (): Promise<boolean> => {
    setSwitching(true);
    try {
      const { error } = await supabase.rpc("clear_active_tenant" as any);
      if (error) {
        toast.error("Não foi possível voltar ao modo Owner.", { description: error.message });
        return false;
      }
      broadcastChange(null);
      await refreshProfile();
      await queryClient.invalidateQueries();
      toast.success("Modo Owner restaurado");
      return true;
    } finally {
      setSwitching(false);
    }
  }, [refreshProfile, queryClient, broadcastChange]);

  useEffect(() => {
    if (!user) return;
    let bc: BroadcastChannel | null = null;
    const softRefresh = async () => {
      await refreshProfile();
      await queryClient.invalidateQueries();
    };

    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("active-tenant");
      bc.onmessage = (ev) => {
        const next = ev.data?.tenantId ?? null;
        if (next !== activeTenantId) softRefresh();
      };
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== "active-tenant-switch" || !e.newValue) return;
      try {
        const { tenantId } = JSON.parse(e.newValue);
        if (tenantId !== activeTenantId) softRefresh();
      } catch {
        /* noop */
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      bc?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [user, activeTenantId, refreshProfile, queryClient]);

  const activeTenantName =
    memberships.find((m) => m.tenant_id === activeTenantId)?.name ?? null;

  return {
    memberships,
    activeTenantId,
    homeTenantId,
    currentTenantId,
    activeTenantName,
    isOwner,
    isImpersonating,
    loading,
    switching,
    switchTenant,
    exitToOwnerMode,
    reload: load,
  };
}
