import { useEffect, useState, useCallback } from "react";
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
  const { user, profile } = useAuth();
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

  const switchTenant = useCallback(async (targetTenantId: string) => {
    setSwitching(true);
    try {
      const { error } = await supabase.rpc("set_active_tenant", {
        target_tenant_id: targetTenantId,
      });
      if (error) throw error;
      // Hard reload to flush all cached queries / RLS-scoped data.
      window.location.reload();
    } finally {
      setSwitching(false);
    }
  }, []);

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
