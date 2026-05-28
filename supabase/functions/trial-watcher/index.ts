import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * trial-watcher: roda diariamente.
 * - 7d / 3d / 1d antes do trial_ends_at envia email correspondente (idempotente via metadata.notified_*).
 * - Após trial_ends_at sem pagamento -> status = past_due + email.
 * - 7 dias em past_due -> status = canceled.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = Date.now();
  const result: Record<string, number> = {
    notified_7d: 0, notified_3d: 0, notified_1d: 0,
    moved_to_past_due: 0, moved_to_canceled: 0,
  };

  // 1) trialing
  const { data: trialing } = await admin
    .from("tenant_subscriptions")
    .select("*, tenants!inner(id, name, contact_email)")
    .eq("status", "trialing");

  for (const s of trialing ?? []) {
    const meta = (s.metadata ?? {}) as Record<string, any>;
    const tenant = (s as any).tenants;
    const email = tenant?.contact_email;
    const empresa = tenant?.name;

    if (!s.trial_ends_at) continue;
    const endsAt = new Date(s.trial_ends_at).getTime();
    const diffDays = Math.ceil((endsAt - now) / 86400000);

    if (diffDays <= 0) {
      await admin.from("tenant_subscriptions").update({
        status: "past_due",
        metadata: { ...meta, past_due_since: new Date().toISOString() },
      }).eq("id", s.id);
      result.moved_to_past_due++;
      if (email) await sendMail(admin, "trial_ending", email, s.tenant_id, { empresa });
      continue;
    }

    for (const d of [7, 3, 1]) {
      if (diffDays === d && !meta[`notified_${d}d`]) {
        if (email) await sendMail(admin, `trial_ending_${d}d`, email, s.tenant_id, { empresa, dias: d });
        await admin.from("tenant_subscriptions").update({
          metadata: { ...meta, [`notified_${d}d`]: new Date().toISOString() },
        }).eq("id", s.id);
        (result as any)[`notified_${d}d`]++;
      }
    }
  }

  // 2) past_due -> canceled após 7d
  const { data: pastDue } = await admin
    .from("tenant_subscriptions")
    .select("*")
    .eq("status", "past_due");

  for (const s of pastDue ?? []) {
    const meta = (s.metadata ?? {}) as Record<string, any>;
    const since = meta.past_due_since ? new Date(meta.past_due_since).getTime() : null;
    if (since && (now - since) > 7 * 86400000) {
      await admin.from("tenant_subscriptions").update({ status: "canceled" }).eq("id", s.id);
      result.moved_to_canceled++;
    }
  }

  return new Response(JSON.stringify({ ok: true, ...result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function sendMail(admin: any, template_id: string, to: string, tenant_id: string, variables: Record<string, any>) {
  try {
    await admin.functions.invoke("send-email", { body: { template_id, to, tenant_id, variables } });
  } catch (e) {
    console.warn("send-email failed", e);
  }
}
