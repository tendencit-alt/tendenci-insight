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
  const activeTenantId = profile?.current_tenant_id ?? homeTenantId;

  const load = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_tenants")
      .select("tenant_id, role, tenants:tenant_id(id, name)")
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed loading memberships", error);
      setMemberships([]);
    } else {
      setMemberships(
        (data ?? []).map((row: any) => ({
          tenant_id: row.tenant_id,
          role: row.role,
          name: row.tenants?.name ?? "(sem nome)",
          is_active: row.tenant_id === activeTenantId,
          is_home: row.tenant_id === homeTenantId,
        }))
      );
    }
    setLoading(false);
  }, [user, activeTenantId, homeTenantId]);

  useEffect(() => {
    load();
  }, [load]);

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
      // Notify other tabs that the active tenant changed.
      try {
        const payload = { tenantId: targetTenantId, ts: Date.now() };
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("active-tenant");
          bc.postMessage(payload);
          bc.close();
        }
        // Storage event fallback (fires in OTHER tabs only).
        localStorage.setItem("active-tenant-switch", JSON.stringify(payload));
      } catch {
        /* noop */
      }
      // Soft refresh: refetch profile (carries new current_tenant_id) and
      // invalidate every cached query so RLS-scoped data is re-pulled.
      await refreshProfile();
      await queryClient.invalidateQueries();
      toast.success("Empresa ativa atualizada");
      return true;
    } catch (err: any) {
      toast.error("Não foi possível trocar de empresa.", {
        description: err?.message,
      });
      return false;
    } finally {
      setSwitching(false);
    }
  }, [refreshProfile, queryClient]);

  // Listen for tenant switches triggered in other tabs and reload to re-fetch
  // everything under the new RLS context.
  useEffect(() => {
    if (!user) return;
    let bc: BroadcastChannel | null = null;
    const reload = () => window.location.reload();

    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("active-tenant");
      bc.onmessage = (ev) => {
        const next = ev.data?.tenantId;
        if (next && next !== activeTenantId) reload();
      };
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== "active-tenant-switch" || !e.newValue) return;
      try {
        const { tenantId } = JSON.parse(e.newValue);
        if (tenantId && tenantId !== activeTenantId) reload();
      } catch {
        /* noop */
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      bc?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [user, activeTenantId]);

  return {
    memberships,
    activeTenantId,
    homeTenantId,
    loading,
    switching,
    switchTenant,
    reload: load,
  };
}
