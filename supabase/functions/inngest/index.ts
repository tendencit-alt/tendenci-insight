// Inngest serve endpoint: scheduled pattern detection
import { Inngest } from "npm:inngest@3.27.0";
import { serve } from "npm:inngest@3.27.0/edge";

const inngest = new Inngest({ id: "tendenci-erp" });

const detectPatternsCron = inngest.createFunction(
  { id: "detect-automation-patterns-cron" },
  { cron: "0 3 * * *" }, // 03:00 UTC daily
  async ({ step }) => {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/detect-automation-patterns`;
    const result = await step.run("invoke-detect", async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({}),
      });
      return await res.json();
    });
    return result;
  },
);

const onDemandDetect = inngest.createFunction(
  { id: "detect-automation-patterns-on-demand" },
  { event: "automation/detect.requested" },
  async ({ event, step }) => {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/detect-automation-patterns`;
    const result = await step.run("invoke", async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ tenant_id: event.data?.tenant_id }),
      });
      return await res.json();
    });
    return result;
  },
);

const reconcileIntegrationHealthCron = inngest.createFunction(
  { id: "reconcile-integration-health-cron" },
  { cron: "*/15 * * * *" }, // a cada 15 minutos
  async ({ step }) => {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/reconcile-integration-health`;
    const result = await step.run("invoke-reconcile", async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({}),
      });
      return await res.json();
    });
    return result;
  },
);

const handler = serve({
  client: inngest,
  functions: [detectPatternsCron, onDemandDetect, reconcileIntegrationHealthCron],
});

Deno.serve((req) => handler(req));
