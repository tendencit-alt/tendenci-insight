import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error("Usuário inválido");

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("*").eq("id", user.id).maybeSingle();

    const tenantId = profile?.tenant_id ?? null;

    // Coleta dados ligados ao usuário (RLS-scoped via service role mas filtrados por user.id)
    const [crmDeals, contatos, leads, tarefas, notifications] = await Promise.all([
      supabaseAdmin.from("crm_deals").select("*").eq("owner_id", user.id).limit(1000),
      supabaseAdmin.from("contatos").select("*").eq("tenant_id", tenantId).limit(500),
      supabaseAdmin.from("leads").select("*").eq("tenant_id", tenantId).limit(500),
      supabaseAdmin.from("tasks").select("*").eq("assigned_to", user.id).limit(500),
      supabaseAdmin.from("notifications").select("*").eq("user_id", user.id).limit(500),
    ].map(p => p.catch(() => ({ data: null }))));

    const payload = {
      generated_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
      profile,
      data: {
        crm_deals: crmDeals?.data ?? [],
        contatos: contatos?.data ?? [],
        leads: leads?.data ?? [],
        tarefas: tarefas?.data ?? [],
        notificacoes: notifications?.data ?? [],
      },
    };

    // Audit log
    await supabaseAdmin.from("lgpd_export_log").insert({
      user_id: user.id,
      tenant_id: tenantId,
      ip: req.headers.get("x-forwarded-for") ?? null,
    });

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Erro" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
