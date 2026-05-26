import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import type { SimulationState } from "@/components/smart-permissions/types";

interface SimulationContextValue {
  state: SimulationState;
  effectivePermissions: Record<string, boolean> | null;
  effectiveProfileName: string | null;
  startSimulation: (target: {
    userId?: string;
    profileTypeId?: string;
    profileName?: string;
    userName?: string;
  }) => void;
  stopSimulation: () => void;
  isOwner: boolean;
}

const Ctx = createContext<SimulationContextValue | undefined>(undefined);
const STORAGE_KEY = "smart-permissions-simulation";

export function PermissionSimulationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isMaster, userLevel } = usePermissions();
  const isOwner = !!isMaster || userLevel === "system_owner" || userLevel === "tenant_owner";

  const [state, setState] = useState<SimulationState>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SimulationState) : { active: false };
    } catch {
      return { active: false };
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* no-op */
    }
  }, [state]);

  // Server-side simulation: ask edge function for the effective permission map
  const { data: simResult } = useQuery({
    queryKey: ["simulate-permissions", state],
    enabled: state.active && isOwner,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("simulate-permissions", {
        body: {
          target_user_id: state.targetUserId ?? null,
          target_profile_type_id: state.targetProfileTypeId ?? null,
        },
      });
      if (error) throw error;
      return data as {
        permissions: Record<string, boolean>;
        profile_name: string | null;
        user_name: string | null;
      };
    },
  });

  const startSimulation: SimulationContextValue["startSimulation"] = useCallback(
    (target) => {
      if (!isOwner) return;
      setState({
        active: true,
        targetUserId: target.userId,
        targetProfileTypeId: target.profileTypeId,
        targetProfileName: target.profileName,
        targetUserName: target.userName,
      });
    },
    [isOwner]
  );

  const stopSimulation = useCallback(() => {
    setState({ active: false });
  }, []);

  const value = useMemo<SimulationContextValue>(
    () => ({
      state,
      isOwner,
      effectivePermissions: state.active ? simResult?.permissions ?? null : null,
      effectiveProfileName:
        state.active
          ? simResult?.profile_name ?? state.targetProfileName ?? null
          : null,
      startSimulation,
      stopSimulation,
    }),
    [state, isOwner, simResult, startSimulation, stopSimulation]
  );

  // Track current user for context (no-op now, reserved for future audit)
  useEffect(() => void user, [user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const DEFAULT_CTX: SimulationContextValue = {
  state: { active: false },
  effectivePermissions: null,
  effectiveProfileName: null,
  startSimulation: () => {},
  stopSimulation: () => {},
  isOwner: false,
};

export function usePermissionSimulation() {
  const ctx = useContext(Ctx);
  return ctx ?? DEFAULT_CTX;
}
