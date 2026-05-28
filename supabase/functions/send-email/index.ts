import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { TEMPLATES } from "./templates.ts";

// TODO: usuário plugga em Supabase Dashboard > Edge Functions > Secrets > RESEND_API_KEY
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const FROM_ADDRESS = Deno.env.get("EMAIL_FROM") || "Tendenci <onboarding@resend.dev>";
// TODO: trocar para "Tendenci <noreply@tendencitech.com.br>" após validar SPF/DKIM no Resend.

function renderVars(html: string, vars: Record<string, unknown>): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    if (v === undefined || v === null) return "";
    return String(v).replace(/[<>]/g, (c) => ({ "<": "&lt;", ">": "&gt;" }[c]!));
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const template_id: string = (body.template_id || "").toString();
  const to: string = (body.to || "").toString().trim().toLowerCase();
  const tenant_id: string | null = body.tenant_id ?? null;
  const user_id: string | null = body.user_id ?? null;
  const variables: Record<string, unknown> = body.variables || {};

  if (!template_id || !TEMPLATES[template_id]) {
    return json({ error: "Template inválido" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return json({ error: "Email destinatário inválido" }, 400);
  }

  const tpl = TEMPLATES[template_id];
  const html = renderVars(tpl.html, variables);
  const subject = renderVars(tpl.subject, variables);

  // --- Sem credencial → registra skipped e devolve 200 (não bloqueia caller) ---
  if (!RESEND_API_KEY) {
    await admin.from("email_log").insert({
      tenant_id, user_id, template_id, to_email: to,
      status: "skipped_no_credential",
      error_message: "RESEND_API_KEY ausente. Configure em Edge Functions > Secrets.",
      variables,
    });
    return json({ success: true, skipped: true, reason: "no_credential" });
  }

  // --- Envia via Resend ---
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
    });
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      await admin.from("email_log").insert({
        tenant_id, user_id, template_id, to_email: to,
        status: "failed",
        error_message: (data?.message || data?.error || `HTTP ${resp.status}`).toString().slice(0, 500),
        variables,
      });
      return json({ success: false, error: data?.message || "Falha ao enviar" }, 502);
    }

    await admin.from("email_log").insert({
      tenant_id, user_id, template_id, to_email: to,
      status: "sent",
      provider_id: data?.id ?? null,
      variables,
    });
    return json({ success: true, provider_id: data?.id ?? null });
  } catch (e: any) {
    await admin.from("email_log").insert({
      tenant_id, user_id, template_id, to_email: to,
      status: "failed",
      error_message: (e?.message || "Erro desconhecido").toString().slice(0, 500),
      variables,
    });
    return json({ success: false, error: e?.message || "Erro" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
