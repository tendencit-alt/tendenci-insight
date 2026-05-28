import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Dois modos:
 *  - action="request": chamado pelo usuário logado → registra pedido + soft delete + agenda hard delete em 30d.
 *  - action="sweep":  chamado via cron com SERVICE_ROLE_KEY → executa hard delete dos pedidos vencidos.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { action = "request" } = await req.json().catch(() => ({}));

    if (action === "sweep") {
      // Cron sweep — só aceita se vier com service role key
      const auth = req.headers.get("Authorization") ?? "";
      if (!auth.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "___NONE___")) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
        });
      }
      const { data: due } = await supabaseAdmin
        .from("lgpd_deletion_requests")
        .select("id, user_id")
        .lte("scheduled_hard_delete_at", new Date().toISOString())
        .eq("status", "pending");

      let processed = 0;
      for (const row of due ?? []) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(row.user_id);
          await supabaseAdmin.from("lgpd_deletion_requests")
            .update({ status: "completed", processed_at: new Date().toISOString() })
            .eq("id", row.id);
          processed++;
        } catch (e) {
          await supabaseAdmin.from("lgpd_deletion_requests")
            .update({ status: "error", notes: String(e) })
            .eq("id", row.id);
        }
      }
      return new Response(JSON.stringify({ processed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // action="request"
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error("Usuário inválido");

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();

    const scheduled = new Date();
    scheduled.setDate(scheduled.getDate() + 30);
    const scheduledIso = scheduled.toISOString();

    await supabaseAdmin.from("lgpd_deletion_requests").insert({
      user_id: user.id,
      tenant_id: profile?.tenant_id ?? null,
      email: user.email ?? "",
      scheduled_hard_delete_at: scheduledIso,
      status: "pending",
    });

    // Soft delete: marca profile, mantém auth ativo até hard delete? Não — encerramos sessão.
    await supabaseAdmin.from("profiles").update({
      deleted_at: new Date().toISOString(),
      scheduled_hard_delete_at: scheduledIso,
    }).eq("id", user.id);

    return new Response(JSON.stringify({ success: true, scheduled_hard_delete_at: scheduledIso }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Erro" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
