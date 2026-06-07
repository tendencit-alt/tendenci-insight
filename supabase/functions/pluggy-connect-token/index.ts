// Pluggy Connect Token — emite token efêmero pro widget Pluggy
// Auth: requer JWT do usuário; resolve tenant_id via RPC SECURITY DEFINER.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const PLUGGY_BASE_URL = Deno.env.get("PLUGGY_BASE_URL") ?? "https://api.pluggy.ai";
const PLUGGY_CLIENT_ID = Deno.env.get("PLUGGY_CLIENT_ID")!;
const PLUGGY_CLIENT_SECRET = Deno.env.get("PLUGGY_CLIENT_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: tenantId, error: tErr } = await supabase.rpc("get_user_tenant_id");
    if (tErr || !tenantId) {
      console.error("[pluggy-connect-token] tenant resolution failed", tErr);
      return json({ error: "Tenant não encontrado" }, 403);
    }

    // 1) auth → api_key
    const authRes = await fetch(`${PLUGGY_BASE_URL}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: PLUGGY_CLIENT_ID,
        clientSecret: PLUGGY_CLIENT_SECRET,
      }),
    });
    if (!authRes.ok) {
      const body = await authRes.text();
      console.error("[pluggy-connect-token] auth failed", authRes.status, body);
      return json({ error: "Falha ao autenticar no Pluggy" }, 500);
    }
    const { apiKey } = await authRes.json();

    // 2) connect_token vinculado ao tenant
    const ctRes = await fetch(`${PLUGGY_BASE_URL}/connect_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({ clientUserId: String(tenantId) }),
    });
    if (!ctRes.ok) {
      const body = await ctRes.text();
      console.error("[pluggy-connect-token] connect_token failed", ctRes.status, body);
      return json({ error: "Falha ao gerar connect token" }, 500);
    }
    const ct = await ctRes.json();

    return json({ accessToken: ct.accessToken, expiresIn: ct.expiresIn ?? 1800 });
  } catch (e) {
    console.error("[pluggy-connect-token] unexpected", e);
    return json({ error: "Erro inesperado" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
