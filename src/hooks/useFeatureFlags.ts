import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string | null;
  status: string; // disabled | owner_only | pilot | rollout | enabled
  rollout_percentage: number;
  pilot_tenant_ids: string[];
  metadata: Record<string, unknown>;
}

interface FlagOverride {
  flag_id: string;
  enabled: boolean;
}

/**
 * Check feature availability for the current user/tenant.
 * Evaluates: disabled → owner_only → pilot list → rollout % → enabled.
 */
export function useFeatureFlags() {
  const { user, profile } = useAuth() as any;
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [overrides, setOverrides] = useState<FlagOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchFlags = async () => {
      const [{ data: flagData }, { data: overData }] = await Promise.all([
        (supabase as any).from("feature_flags").select("*"),
        (supabase as any).from("feature_flag_overrides").select("flag_id, enabled"),
      ]);
      setFlags(flagData || []);
      setOverrides(overData || []);
      setLoading(false);
    };

    fetchFlags();
  }, [user]);

  const tenantId = profile?.tenant_id as string | undefined;
  const isOwner = profile?.is_owner === true;

  /** Deterministic hash of tenant id for rollout bucketing */
  const tenantBucket = useMemo(() => {
    if (!tenantId) return 100;
    let hash = 0;
    for (let i = 0; i < tenantId.length; i++) {
      hash = ((hash << 5) - hash + tenantId.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 100;
  }, [tenantId]);

  const isEnabled = useCallback(
    (flagKey: string): boolean => {
      const flag = flags.find((f) => f.key === flagKey);
      if (!flag) return false;

      // Check tenant-specific override first
      const override = overrides.find((o) => o.flag_id === flag.id);
      if (override) return override.enabled;

      switch (flag.status) {
        case "enabled":
          return true;
        case "disabled":
          return false;
        case "owner_only":
          return isOwner;
        case "pilot":
          return isOwner || (!!tenantId && flag.pilot_tenant_ids?.includes(tenantId));
        case "rollout":
          return isOwner || tenantBucket < (flag.rollout_percentage || 0);
        default:
          return false;
      }
    },
    [flags, overrides, isOwner, tenantId, tenantBucket]
  );

  return { isEnabled, flags, loading };
}
