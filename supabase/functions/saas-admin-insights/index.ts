import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin.from("profiles").select("is_owner").eq("id", user.id).maybeSingle();
    if (!profile?.is_owner) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenant_id } = await req.json();
    if (!tenant_id) throw new Error("tenant_id required");

    const { data: overview } = await admin.rpc("get_saas_company_overview", { _tenant_id: tenant_id });
    const tenant = overview?.[0];
    if (!tenant) throw new Error("Tenant not found");

    const { data: limits } = await admin.rpc("get_saas_tenant_limits", { _tenant_id: tenant_id });

    if (!lovableKey) {
      return new Response(JSON.stringify({
        insights: "AI insights not configured. Showing raw data only.",
        tenant,
        limits,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um analista SaaS sênior. Em português, em até 4 bullets curtos, explique a saúde do tenant, principais riscos e ações recomendadas. Seja objetivo, sem floreios.",
          },
          {
            role: "user",
            content: `Empresa: ${tenant.tenant_name}
Plano: ${tenant.plan_name ?? "N/A"} (R$ ${tenant.plan_price ?? 0})
Status assinatura: ${tenant.subscription_status ?? "N/A"}
Health score: ${tenant.health_score ?? "N/A"} (${tenant.health_classification ?? "N/A"})
Usuários ativos: ${tenant.active_users}/${tenant.max_users}
Faturas em atraso: ${tenant.overdue_invoices}
Módulos ativos: ${tenant.active_modules}
Último login: ${tenant.last_user_login ?? "nunca"}
Limites: ${JSON.stringify(limits)}`,
          },
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const insights = aiData.choices?.[0]?.message?.content ?? "Sem insights disponíveis.";

    return new Response(JSON.stringify({ insights, tenant, limits }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("saas-admin-insights error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
