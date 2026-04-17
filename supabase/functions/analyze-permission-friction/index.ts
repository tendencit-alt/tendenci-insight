// Owner-only: analyze-permission-friction
// Reads denials + recommendations and uses Lovable AI to enrich/explain.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: caller } = await admin
      .from("profiles")
      .select("profile_types!inner(name)")
      .eq("id", callerId)
      .single();
    if ((caller?.profile_types as { name: string } | null)?.name !== "owner") {
      return json({ error: "Owner only" }, 403);
    }

    // Refresh heuristic recommendations
    await admin.rpc("generate_permission_recommendations", { _since_days: 30 });

    // Top denials in last 30 days
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: denials } = await admin
      .from("rbac_permission_denials")
      .select("permission_key, module, user_id, tenant_id")
      .gte("attempted_at", since)
      .limit(2000);

    const counts: Record<string, { permission_key: string; module: string | null; n: number; users: Set<string> }> = {};
    (denials ?? []).forEach((d) => {
      const k = `${d.permission_key}|${d.module ?? ""}`;
      if (!counts[k]) counts[k] = { permission_key: d.permission_key, module: d.module, n: 0, users: new Set() };
      counts[k].n++;
      if (d.user_id) counts[k].users.add(d.user_id);
    });
    const top = Object.values(counts)
      .map((c) => ({ ...c, distinct_users: c.users.size }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8)
      .map(({ users, ...rest }) => rest);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    let aiInsights: string | null = null;
    if (apiKey && top.length > 0) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Você é um analista de governança de acessos em um ERP SaaS multi-tenant. Gere recomendações concisas (máx 6 bullets) sobre como reduzir fricção de permissões, em português, focando em ações práticas: ajustar mensagens, conceder leitura, revisar escopo, segregar funções.",
            },
            {
              role: "user",
              content:
                "Top tentativas negadas (últimos 30 dias):\n" +
                top
                  .map((t, i) => `${i + 1}. ${t.permission_key} (${t.module ?? "n/a"}) — ${t.n} negações, ${t.distinct_users} usuários`)
                  .join("\n"),
            },
          ],
        }),
      });
      if (resp.ok) {
        const j = await resp.json();
        aiInsights = j?.choices?.[0]?.message?.content ?? null;
      }
    }

    return json({ top_denials: top, ai_insights: aiInsights });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
