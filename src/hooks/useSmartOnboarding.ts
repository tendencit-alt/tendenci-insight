import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { BusinessProfile } from "@/components/smart-onboarding/types";

export interface SmartOnboardingRow {
  id: string;
  tenant_id: string;
  setup_completed: boolean;
  first_import: boolean;
  first_reconciliation: boolean;
  first_dre: boolean;
  first_dashboard: boolean;
  progress_pct: number;
  segment: string | null;
  team_size: string | null;
  primary_goal: string | null;
  financial_maturity: string | null;
  chart_template: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export function useSmartOnboarding() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const onboarding = useQuery({
    queryKey: ["smart-onboarding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_onboarding")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SmartOnboardingRow | null;
    },
    enabled: !!user,
  });

  const upsertProfile = useMutation({
    mutationFn: async (profile: Partial<BusinessProfile>) => {
      const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
      if (!tenantId) throw new Error("Tenant não encontrado");
      const { error } = await supabase
        .from("customer_onboarding")
        .upsert(
          {
            tenant_id: tenantId,
            ...profile,
            started_at: onboarding.data?.started_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "tenant_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-onboarding"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar perfil"),
  });

  const markMilestone = useMutation({
    mutationFn: async (key: keyof SmartOnboardingRow) => {
      const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
      if (!tenantId) throw new Error("Tenant não encontrado");
      const patch: any = { tenant_id: tenantId };
      patch[key] = true;
      patch[`${key}_at`] = new Date().toISOString();
      const { error } = await supabase
        .from("customer_onboarding")
        .upsert(patch, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart-onboarding"] }),
  });

  const seedChartOfAccounts = useMutation({
    mutationFn: async (template: string) => {
      const { data, error } = await supabase.functions.invoke("seed-chart-of-accounts", {
        body: { template },
      });
      if (error) throw error;
      await upsertProfile.mutateAsync({ chart_template: template as any });
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Plano de contas aplicado (${data?.inserted ?? 0} contas adicionadas)`);
      qc.invalidateQueries({ queryKey: ["fin-chart-accounts"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao aplicar plano de contas"),
  });

  return { onboarding: onboarding.data, isLoading: onboarding.isLoading, upsertProfile, markMilestone, seedChartOfAccounts };
}
