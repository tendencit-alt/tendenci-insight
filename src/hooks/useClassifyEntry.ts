import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClassificationSuggestion {
  chart_account_id: string | null;
  chart_account_name?: string;
  cost_center_id: string | null;
  cost_center_name?: string;
  project_id: string | null;
  project_name?: string;
  nature: string | null;
  in_dre: boolean;
  in_cashflow: boolean;
  confidence: number;
  source: string;
  reason: string;
  rule_id?: string;
}

export interface ClassificationResult {
  suggestions: ClassificationSuggestion[];
  best_suggestion: ClassificationSuggestion | null;
  status: "auto_classified" | "suggested" | "pending";
  total_suggestions: number;
}

export function useClassifyEntry() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);

  const classify = useCallback(async (params: {
    description: string;
    amount: number;
    type: string;
    date?: string;
    bank_account_id?: string;
    party_id?: string;
    party_name?: string;
    party_type?: string;
    origin?: string;
  }) => {
    if (!params.description || params.description.length < 3) return null;

    setLoading(true);
    try {
      // Get tenant_id from profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return null;

      const { data, error } = await supabase.functions.invoke("classify-entry", {
        body: { ...params, tenant_id: profile.tenant_id },
      });

      if (error) throw error;
      
      setResult(data as ClassificationResult);
      return data as ClassificationResult;
    } catch (e) {
      console.error("Classification error:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmClassification = useCallback(async (
    entryId: string,
    suggestion: ClassificationSuggestion,
    originalDescription: string,
    partyId?: string,
    partyName?: string,
    partyType?: string,
    origin?: string,
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return;

      const normalizedDesc = originalDescription
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim();

      // Update ledger entry with classification metadata
      await supabase
        .from("fin_ledger_entries")
        .update({
          chart_account_id: suggestion.chart_account_id,
          cost_center_id: suggestion.cost_center_id,
          project_id: suggestion.project_id,
          classification_status: "classified",
          classification_score: suggestion.confidence,
          classification_source: suggestion.source,
          classification_rule_id: suggestion.rule_id || null,
        } as any)
        .eq("id", entryId);

      // Upsert learning history
      const { data: existing } = await supabase
        .from("fin_classification_history" as any)
        .select("id, confirmation_count")
        .eq("tenant_id", profile.tenant_id)
        .eq("normalized_description", normalizedDesc)
        .eq("chart_account_id", suggestion.chart_account_id)
        .maybeSingle();

      if (existing) {
        const newCount = (existing.confirmation_count || 0) + 1;
        const strength = newCount >= 5 ? "strong" : newCount >= 3 ? "moderate" : "weak";
        
        await supabase
          .from("fin_classification_history" as any)
          .update({
            confirmation_count: newCount,
            strength,
            last_confirmed_by: user.id,
            last_confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        // Auto-promote to rule at 5 confirmations
        if (newCount >= 5) {
          const { data: existingRule } = await supabase
            .from("fin_classification_rules" as any)
            .select("id")
            .eq("tenant_id", profile.tenant_id)
            .eq("match_value", normalizedDesc)
            .eq("rule_type", "keyword")
            .maybeSingle();

          if (!existingRule) {
            await supabase
              .from("fin_classification_rules" as any)
              .insert({
                tenant_id: profile.tenant_id,
                rule_type: "keyword",
                priority: 1,
                match_field: "description",
                match_value: normalizedDesc,
                match_operator: "exact",
                chart_account_id: suggestion.chart_account_id,
                cost_center_id: suggestion.cost_center_id,
                project_id: suggestion.project_id,
                nature: suggestion.nature,
                in_dre: suggestion.in_dre,
                in_cashflow: suggestion.in_cashflow,
                confidence_base: 95,
                confirmation_count: newCount,
                auto_promoted: true,
                created_by: user.id,
              });
          }
        }
      } else {
        await supabase
          .from("fin_classification_history" as any)
          .insert({
            tenant_id: profile.tenant_id,
            original_description: originalDescription,
            normalized_description: normalizedDesc,
            party_id: partyId || null,
            party_name: partyName || null,
            party_type: partyType || null,
            origin: origin || "manual",
            chart_account_id: suggestion.chart_account_id,
            cost_center_id: suggestion.cost_center_id,
            project_id: suggestion.project_id,
            nature: suggestion.nature,
            in_dre: suggestion.in_dre,
            in_cashflow: suggestion.in_cashflow,
            confirmation_count: 1,
            strength: "weak",
            last_confirmed_by: user.id,
          });
      }

      toast.success("Classificação confirmada e aprendida");
    } catch (e) {
      console.error("Confirm classification error:", e);
      toast.error("Erro ao confirmar classificação");
    }
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  return { classify, confirmClassification, result, loading, clearResult };
}
