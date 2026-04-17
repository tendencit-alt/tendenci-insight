import { Inngest } from "npm:inngest@3.27.0";
import { serve } from "npm:inngest@3.27.0/deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const inngest = new Inngest({ id: "tendenci-billing-ops" });

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, service);

// Daily dunning escalation
const dunningEscalation = inngest.createFunction(
  { id: "billing-dunning-escalation" },
  { cron: "0 9 * * *" }, // every day at 09:00 UTC
  async ({ step }) => {
    const detected = await step.run("detect-dunning", async () => {
      const { data, error } = await admin.rpc("detect_billing_dunning");
      if (error) throw error;
      return data as number;
    });

    const executed = await step.run("execute-pending-actions", async () => {
      const { data: pending } = await admin
        .from("billing_dunning_steps")
        .select("id, tenant_id, step_level")
        .eq("status", "pending")
        .lte("triggered_at", new Date().toISOString());
      let count = 0;
      for (const p of pending ?? []) {
        // For now, just mark as executed (notifications would hook here)
        if (p.step_level === "full_suspension") {
          await admin.from("subscriptions").update({ status: "suspended" }).eq("tenant_id", p.tenant_id);
        }
        await admin.from("billing_dunning_steps").update({
          status: "executed",
          executed_at: new Date().toISOString(),
        }).eq("id", p.id);
        count++;
      }
      return count;
    });

    return { detected, executed };
  }
);

// Daily upgrade signals scan
const upgradeSignalsScan = inngest.createFunction(
  { id: "billing-upgrade-signals-scan" },
  { cron: "0 10 * * *" }, // every day at 10:00 UTC
  async ({ step }) => {
    const detected = await step.run("detect-signals", async () => {
      const { data, error } = await admin.rpc("detect_upgrade_signals");
      if (error) throw error;
      return data as number;
    });
    return { detected };
  }
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = serve({
  client: inngest,
  functions: [dunningEscalation, upgradeSignalsScan],
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return handler(req);
});
