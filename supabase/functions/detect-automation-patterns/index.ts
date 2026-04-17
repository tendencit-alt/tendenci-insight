// detect-automation-patterns: scans recent ops and creates suggestions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Suggestion = {
  tenant_id: string;
  suggestion_type: string;
  module: string;
  title: string;
  description: string;
  evidence: any;
  impact_preview: any;
  proposed_action: any;
  confidence: number;
  occurrences: number;
  expires_at?: string;
};

function monthsBetween(dates: string[]) {
  const sorted = dates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) diffs.push((sorted[i] - sorted[i - 1]) / 86400000);
  return diffs;
}

function isMonthlyPattern(diffs: number[]) {
  if (diffs.length < 2) return false;
  return diffs.every(d => d >= 25 && d <= 35);
}

async function detectRecurringPayables(sb: any, tenant_id: string): Promise<Suggestion[]> {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString();
  const { data } = await sb
    .from("fin_payables")
    .select("supplier_id, supplier_name, amount, due_date, chart_account_id, cost_center_id")
    .eq("tenant_id", tenant_id)
    .gte("due_date", since.split("T")[0])
    .limit(2000);

  const groups: Record<string, any[]> = {};
  (data || []).forEach((r: any) => {
    if (!r.supplier_id) return;
    const bucket = Math.round(Number(r.amount || 0) / 10) * 10;
    const k = `${r.supplier_id}:${bucket}`;
    (groups[k] ||= []).push(r);
  });

  const out: Suggestion[] = [];
  for (const [k, rows] of Object.entries(groups)) {
    if (rows.length < 3) continue;
    const dates = rows.map(r => r.due_date).filter(Boolean);
    if (!isMonthlyPattern(monthsBetween(dates))) continue;
    const sample = rows[0];
    out.push({
      tenant_id,
      suggestion_type: "recurring_payable",
      module: "financeiro",
      title: `Despesa recorrente: ${sample.supplier_name || "Fornecedor"}`,
      description: `Detectamos ${rows.length} lançamentos mensais similares. Criar contrato recorrente?`,
      evidence: { occurrences: rows.length, supplier: sample.supplier_name, avg_amount: rows.reduce((s, r) => s + Number(r.amount), 0) / rows.length },
      impact_preview: { runs: "Mensalmente", action: "Cria contas a pagar automaticamente", category: sample.chart_account_id, cost_center: sample.cost_center_id },
      proposed_action: { type: "create_recurring_contract", direction: "payable", supplier_id: sample.supplier_id, amount: sample.amount, chart_account_id: sample.chart_account_id, cost_center_id: sample.cost_center_id },
      confidence: Math.min(0.95, 0.5 + rows.length * 0.1),
      occurrences: rows.length,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    });
  }
  return out;
}

async function detectRecurringReceivables(sb: any, tenant_id: string): Promise<Suggestion[]> {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString();
  const { data } = await sb
    .from("fin_receivables")
    .select("client_id, client_name, amount, due_date, chart_account_id")
    .eq("tenant_id", tenant_id)
    .gte("due_date", since.split("T")[0])
    .limit(2000);

  const groups: Record<string, any[]> = {};
  (data || []).forEach((r: any) => {
    if (!r.client_id) return;
    const bucket = Math.round(Number(r.amount || 0) / 10) * 10;
    (groups[`${r.client_id}:${bucket}`] ||= []).push(r);
  });

  const out: Suggestion[] = [];
  for (const rows of Object.values(groups)) {
    if (rows.length < 3) continue;
    const dates = rows.map(r => r.due_date).filter(Boolean);
    if (!isMonthlyPattern(monthsBetween(dates))) continue;
    const sample = rows[0];
    out.push({
      tenant_id,
      suggestion_type: "recurring_receivable",
      module: "financeiro",
      title: `Receita recorrente: ${sample.client_name || "Cliente"}`,
      description: `${rows.length} recebimentos mensais similares.`,
      evidence: { occurrences: rows.length, client: sample.client_name },
      impact_preview: { runs: "Mensalmente", action: "Cria contas a receber automaticamente" },
      proposed_action: { type: "create_recurring_contract", direction: "receivable", client_id: sample.client_id, amount: sample.amount, chart_account_id: sample.chart_account_id },
      confidence: Math.min(0.95, 0.5 + rows.length * 0.1),
      occurrences: rows.length,
    });
  }
  return out;
}

async function detectAutoCategory(sb: any, tenant_id: string): Promise<Suggestion[]> {
  const { data } = await sb
    .from("fin_classification_history")
    .select("description_pattern, chart_account_id, cost_center_id")
    .eq("tenant_id", tenant_id)
    .limit(1000);

  const groups: Record<string, any[]> = {};
  (data || []).forEach((r: any) => {
    if (!r.description_pattern || !r.chart_account_id) return;
    const k = `${r.description_pattern.toLowerCase().slice(0, 30)}:${r.chart_account_id}`;
    (groups[k] ||= []).push(r);
  });

  return Object.values(groups)
    .filter(rows => rows.length >= 3)
    .map(rows => {
      const sample = rows[0];
      return {
        tenant_id,
        suggestion_type: "auto_category",
        module: "financeiro",
        title: `Categoria automática para "${sample.description_pattern.slice(0, 30)}"`,
        description: `Você categorizou ${rows.length}× manualmente. Criar regra automática?`,
        evidence: { occurrences: rows.length, pattern: sample.description_pattern },
        impact_preview: { action: "Aplica categoria automaticamente em futuros lançamentos" },
        proposed_action: { type: "create_classification_rule", pattern: sample.description_pattern, chart_account_id: sample.chart_account_id, cost_center_id: sample.cost_center_id },
        confidence: 0.8,
        occurrences: rows.length,
      } as Suggestion;
    });
}

async function detectFrequentClient(sb: any, tenant_id: string): Promise<Suggestion[]> {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString();
  const { data } = await sb
    .from("orders")
    .select("client_id, client_name, total_amount, created_at")
    .eq("tenant_id", tenant_id)
    .gte("created_at", since)
    .limit(2000);

  const groups: Record<string, any[]> = {};
  (data || []).forEach((r: any) => {
    if (!r.client_id) return;
    (groups[r.client_id] ||= []).push(r);
  });

  return Object.values(groups)
    .filter(rows => rows.length >= 3)
    .map(rows => ({
      tenant_id,
      suggestion_type: "frequent_client_order",
      module: "pedidos",
      title: `Cliente frequente: ${rows[0].client_name}`,
      description: `${rows.length} pedidos nos últimos 90 dias. Criar pedido recorrente?`,
      evidence: { occurrences: rows.length, avg_amount: rows.reduce((s, r) => s + Number(r.total_amount || 0), 0) / rows.length },
      impact_preview: { action: "Pré-preenche novo pedido com base no padrão" },
      proposed_action: { type: "create_recurring_order", client_id: rows[0].client_id },
      confidence: 0.7,
      occurrences: rows.length,
    } as Suggestion));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    let tenants: string[] = [];
    if (body.tenant_id) tenants = [body.tenant_id];
    else {
      const { data } = await sb.from("tenants").select("id").eq("active", true).limit(500);
      tenants = (data || []).map((t: any) => t.id);
    }

    let total = 0;
    for (const tenant_id of tenants) {
      const [a, b, c, d] = await Promise.all([
        detectRecurringPayables(sb, tenant_id).catch(() => []),
        detectRecurringReceivables(sb, tenant_id).catch(() => []),
        detectAutoCategory(sb, tenant_id).catch(() => []),
        detectFrequentClient(sb, tenant_id).catch(() => []),
      ]);
      const all = [...a, ...b, ...c, ...d];
      for (const s of all) {
        // skip if already pending
        const { data: dup } = await sb
          .from("automation_suggestions")
          .select("id")
          .eq("tenant_id", tenant_id)
          .eq("suggestion_type", s.suggestion_type)
          .eq("status", "pending")
          .contains("evidence", { occurrences: s.evidence.occurrences });
        if (dup && dup.length) continue;
        const { error } = await sb.from("automation_suggestions").insert(s);
        if (!error) total++;
      }
    }

    return new Response(JSON.stringify({ ok: true, created: total, tenants: tenants.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
