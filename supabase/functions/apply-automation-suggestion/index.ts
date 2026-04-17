// apply-automation-suggestion: materializes accepted suggestions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { suggestion_id, overrides = {} } = await req.json();
    if (!suggestion_id) throw new Error("suggestion_id obrigatório");

    const { data: sugg, error: sErr } = await sb
      .from("automation_suggestions")
      .select("*")
      .eq("id", suggestion_id)
      .maybeSingle();
    if (sErr || !sugg) throw new Error("Sugestão não encontrada");

    const action = { ...(sugg.proposed_action || {}), ...overrides };
    let appliedId: string | null = null;
    let appliedType: string | null = null;

    switch (action.type) {
      case "create_recurring_contract": {
        const { data, error } = await sb
          .from("fin_recurring_contracts")
          .insert({
            tenant_id: sugg.tenant_id,
            direction: action.direction,
            supplier_id: action.supplier_id ?? null,
            client_id: action.client_id ?? null,
            amount: action.amount,
            chart_account_id: action.chart_account_id ?? null,
            cost_center_id: action.cost_center_id ?? null,
            frequency: action.frequency || "monthly",
            active: true,
            description: sugg.title,
          } as any)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        appliedId = data?.id ?? null;
        appliedType = "fin_recurring_contracts";
        break;
      }
      case "create_classification_rule": {
        const { data, error } = await sb
          .from("fin_classification_rules")
          .insert({
            tenant_id: sugg.tenant_id,
            description_pattern: action.pattern,
            chart_account_id: action.chart_account_id,
            cost_center_id: action.cost_center_id ?? null,
            active: true,
          } as any)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        appliedId = data?.id ?? null;
        appliedType = "fin_classification_rules";
        break;
      }
      case "create_recurring_order": {
        // Soft-apply: just mark as accepted; UI navigates to pre-filled order form
        appliedType = "navigate_orders";
        break;
      }
      default:
        throw new Error(`Tipo de ação não suportado: ${action.type}`);
    }

    await sb
      .from("automation_suggestions")
      .update({
        status: "applied",
        reviewed_at: new Date().toISOString(),
        applied_resource_id: appliedId,
        applied_resource_type: appliedType,
      })
      .eq("id", suggestion_id);

    await sb.from("automation_suggestion_events").insert({
      tenant_id: sugg.tenant_id,
      suggestion_id,
      event_type: "applied",
      metadata: { applied_type: appliedType, applied_id: appliedId },
    } as any);

    return new Response(JSON.stringify({ ok: true, applied_id: appliedId, applied_type: appliedType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
