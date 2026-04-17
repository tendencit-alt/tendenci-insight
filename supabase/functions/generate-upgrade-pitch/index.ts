import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, service);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isOwner } = await userClient.rpc("is_owner");
    if (!isOwner) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { signalId } = await req.json();
    if (!signalId) return new Response(JSON.stringify({ error: "signalId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: signal } = await admin
      .from("upgrade_signals")
      .select("*, tenants(name), current_plan:tenant_plans!upgrade_signals_current_plan_id_fkey(name, price)")
      .eq("id", signalId).maybeSingle();
    if (!signal) return new Response(JSON.stringify({ error: "signal not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Suggest next bigger plan by price
    const { data: plans } = await admin.from("tenant_plans")
      .select("id, name, price")
      .gt("price", signal.current_plan?.price ?? 0)
      .order("price", { ascending: true }).limit(1);
    const suggested = plans?.[0];

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Você é um especialista em customer success de SaaS. Crie um pitch curto (máx 3 frases, em português) para sugerir upgrade de plano.

Empresa: ${signal.tenants?.name ?? "—"}
Plano atual: ${signal.current_plan?.name ?? "—"} (R$ ${signal.current_plan?.price ?? 0})
Métrica em atenção: ${signal.metric_key}
Uso atual: ${signal.current_usage} / ${signal.limit_value} (${Number(signal.usage_percent).toFixed(1)}%)
Plano sugerido: ${suggested?.name ?? "Plano superior"} (R$ ${suggested?.price ?? "—"})

Foque no benefício prático e remova a fricção. Tom consultivo, direto, sem clichês.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você gera pitches de upgrade de plano SaaS, em português, curtos e consultivos." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos AI esgotados. Adicione fundos em Lovable AI workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiJson = await aiResp.json();
    const pitch = aiJson.choices?.[0]?.message?.content ?? "Considere fazer upgrade para o próximo plano.";

    await admin.from("upgrade_signals").update({
      ai_pitch: pitch,
      ai_generated_at: new Date().toISOString(),
      suggested_plan_id: suggested?.id ?? null,
    }).eq("id", signalId);

    return new Response(JSON.stringify({ pitch, suggested_plan: suggested }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-upgrade-pitch error", e);
    return new Response(JSON.stringify({ error: e.message ?? "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
