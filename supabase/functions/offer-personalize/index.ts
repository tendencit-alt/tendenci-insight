import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tenant_id, offer_code, base_message, context } = await req.json();
    if (!tenant_id || !offer_code) {
      return new Response(JSON.stringify({ error: "tenant_id and offer_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, segment, porte")
      .eq("id", tenant_id)
      .maybeSingle();

    const systemPrompt = `Você é um copywriter especialista em SaaS B2B. Reescreva a mensagem de oferta abaixo de forma curta (máx 2 frases), persuasiva, contextual ao perfil do tenant. Evite clichês. Tom profissional e direto.`;
    const userPrompt = `Oferta: ${offer_code}
Mensagem base: ${base_message}
Tenant: ${tenant?.name ?? "Cliente"} | Segmento: ${tenant?.segment ?? "-"} | Porte: ${tenant?.porte ?? "-"}
Contexto adicional: ${JSON.stringify(context ?? {})}

Reescreva apenas a mensagem final, sem explicações.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos AI esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const personalized = aiData.choices?.[0]?.message?.content?.trim() ?? base_message;

    return new Response(JSON.stringify({ personalized_message: personalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("offer-personalize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
