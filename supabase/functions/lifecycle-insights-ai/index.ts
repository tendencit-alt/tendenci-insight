import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: snap } = await admin
      .from("tenant_lifecycle_snapshots")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("snapshot_date", { ascending: false })
      .limit(7);

    const { data: tenant } = await admin.from("tenants").select("name").eq("id", tenant_id).maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ insight: null, reason: "AI not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é analista SaaS. Empresa: ${tenant?.name ?? tenant_id}.
Snapshots recentes (mais recente primeiro): ${JSON.stringify(snap ?? [])}.
Em 3 frases curtas em português: (1) diagnóstico atual, (2) maior risco, (3) ação recomendada para o time de Customer Success.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const aiJson = await aiRes.json();
    const insight = aiJson?.choices?.[0]?.message?.content ?? null;

    if (insight && snap?.[0]?.id) {
      await admin.from("tenant_lifecycle_snapshots").update({ ai_insight: insight }).eq("id", snap[0].id);
    }

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[lifecycle-insights-ai]", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
