import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ClassifyRequest {
  description: string;
  amount: number;
  type: string; // RECEITA or DESPESA
  date?: string;
  bank_account_id?: string;
  party_id?: string;
  party_name?: string;
  party_type?: string;
  origin?: string; // manual, ofx, reconciliation, order, payable, receivable
  tenant_id: string;
}

interface Suggestion {
  chart_account_id: string | null;
  chart_account_name?: string;
  cost_center_id: string | null;
  cost_center_name?: string;
  project_id: string | null;
  project_name?: string;
  nature: string | null;
  in_dre: boolean;
  in_cashflow: boolean;
  confidence: number;
  source: string;
  reason: string;
  rule_id?: string;
}

// Anti-error validation rules
const BLOCK_RULES = [
  { nature: "Capital", in_dre: true, msg: "Capital não pode participar da DRE" },
  { chart_code_prefix: "4", in_cashflow: true, msg: "Depreciação não participa do Fluxo de Caixa" },
];

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function validateSuggestion(suggestion: Suggestion, chartAccounts: any[]): string | null {
  // Check blocked combinations
  if (suggestion.nature === "Capital" && suggestion.in_dre) {
    return "Capital não pode participar da DRE";
  }
  
  // Find the chart account to check its code
  if (suggestion.chart_account_id) {
    const account = chartAccounts.find((a: any) => a.id === suggestion.chart_account_id);
    if (account) {
      const code = account.code || "";
      // Depreciação (root 4) cannot be in cashflow
      if (code.startsWith("4") && suggestion.in_cashflow) {
        return "Depreciação não deve participar do Fluxo de Caixa";
      }
      // Comissão should not be in Despesas Operacionais (root 3)
      if (code.startsWith("3") && normalizeDescription(suggestion.reason).includes("comissao")) {
        return "Comissão deve estar em Despesas sobre Vendas, não Operacionais";
      }
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ClassifyRequest = await req.json();
    const { description, amount, type, date, bank_account_id, party_id, party_name, party_type, origin, tenant_id } = body;
    
    if (!description || !tenant_id) {
      return new Response(JSON.stringify({ error: "description and tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const normalizedDesc = normalizeDescription(description);
    const suggestions: Suggestion[] = [];

    // Fetch chart accounts for validation
    const { data: chartAccounts } = await supabase
      .from("fin_chart_accounts")
      .select("id, code, name, nature, in_dre, in_cashflow, parent_id")
      .eq("tenant_id", tenant_id)
      .eq("active", true);

    const { data: costCenters } = await supabase
      .from("fin_cost_centers")
      .select("id, name")
      .eq("tenant_id", tenant_id)
      .eq("active", true);

    const { data: projects } = await supabase
      .from("fin_projects")
      .select("id, name")
      .eq("tenant_id", tenant_id);

    // ---- PRIORITY 1: Keyword rules ----
    const { data: keywordRules } = await supabase
      .from("fin_classification_rules")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("active", true)
      .eq("rule_type", "keyword")
      .order("priority", { ascending: true });

    if (keywordRules) {
      for (const rule of keywordRules) {
        let matched = false;
        const matchVal = rule.match_value.toLowerCase();
        
        if (rule.match_operator === "exact") {
          matched = normalizedDesc === normalizeDescription(matchVal);
        } else if (rule.match_operator === "contains") {
          matched = normalizedDesc.includes(normalizeDescription(matchVal));
        } else if (rule.match_operator === "regex") {
          try { matched = new RegExp(matchVal, "i").test(description); } catch {}
        }

        if (matched) {
          const acct = chartAccounts?.find((a: any) => a.id === rule.chart_account_id);
          const cc = costCenters?.find((c: any) => c.id === rule.cost_center_id);
          const proj = projects?.find((p: any) => p.id === rule.project_id);
          
          suggestions.push({
            chart_account_id: rule.chart_account_id,
            chart_account_name: acct?.name,
            cost_center_id: rule.cost_center_id,
            cost_center_name: cc?.name,
            project_id: rule.project_id,
            project_name: proj?.name,
            nature: rule.nature,
            in_dre: rule.in_dre ?? true,
            in_cashflow: rule.in_cashflow ?? true,
            confidence: Math.min(100, rule.confidence_base + (rule.confirmation_count || 0) * 2),
            source: "keyword_rule",
            reason: `Regra por palavra-chave: "${rule.match_value}"`,
            rule_id: rule.id,
          });
        }
      }
    }

    // ---- PRIORITY 2: Supplier/Client history ----
    if (party_id) {
      const { data: partyHistory } = await supabase
        .from("fin_classification_history")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("party_id", party_id)
        .order("confirmation_count", { ascending: false })
        .limit(5);

      if (partyHistory?.length) {
        const best = partyHistory[0];
        const acct = chartAccounts?.find((a: any) => a.id === best.chart_account_id);
        const cc = costCenters?.find((c: any) => c.id === best.cost_center_id);
        const proj = projects?.find((p: any) => p.id === best.project_id);
        
        const baseConf = best.strength === "strong" ? 95 : best.strength === "moderate" ? 85 : 70;
        suggestions.push({
          chart_account_id: best.chart_account_id,
          chart_account_name: acct?.name,
          cost_center_id: best.cost_center_id,
          cost_center_name: cc?.name,
          project_id: best.project_id,
          project_name: proj?.name,
          nature: best.nature,
          in_dre: best.in_dre ?? true,
          in_cashflow: best.in_cashflow ?? true,
          confidence: baseConf,
          source: "party_history",
          reason: `Baseado em ${best.confirmation_count} lançamento(s) anterior(es) de ${best.party_name || "mesmo fornecedor/cliente"}`,
        });
      }
    }

    // ---- PRIORITY 3: Description history (pattern matching) ----
    const { data: descHistory } = await supabase
      .from("fin_classification_history")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("normalized_description", normalizedDesc)
      .order("confirmation_count", { ascending: false })
      .limit(3);

    if (descHistory?.length) {
      const best = descHistory[0];
      const acct = chartAccounts?.find((a: any) => a.id === best.chart_account_id);
      const cc = costCenters?.find((c: any) => c.id === best.cost_center_id);
      
      // Only add if not already suggested with higher confidence
      const existingMax = suggestions.reduce((m, s) => Math.max(m, s.confidence), 0);
      const conf = best.strength === "strong" ? 92 : best.strength === "moderate" ? 78 : 65;
      
      if (conf > existingMax - 10) {
        suggestions.push({
          chart_account_id: best.chart_account_id,
          chart_account_name: acct?.name,
          cost_center_id: best.cost_center_id,
          cost_center_name: costCenters?.find((c: any) => c.id === best.cost_center_id)?.name,
          project_id: best.project_id,
          project_name: projects?.find((p: any) => p.id === best.project_id)?.name,
          nature: best.nature,
          in_dre: best.in_dre ?? true,
          in_cashflow: best.in_cashflow ?? true,
          confidence: conf,
          source: "description_history",
          reason: `Baseado em ${best.confirmation_count} lançamento(s) com descrição similar`,
        });
      }
    }

    // ---- PRIORITY 4: Origin-based rules ----
    if (origin) {
      const { data: originRules } = await supabase
        .from("fin_classification_rules")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("active", true)
        .eq("rule_type", "origin")
        .eq("match_value", origin);

      if (originRules?.length) {
        for (const rule of originRules) {
          const acct = chartAccounts?.find((a: any) => a.id === rule.chart_account_id);
          suggestions.push({
            chart_account_id: rule.chart_account_id,
            chart_account_name: acct?.name,
            cost_center_id: rule.cost_center_id,
            cost_center_name: costCenters?.find((c: any) => c.id === rule.cost_center_id)?.name,
            project_id: rule.project_id,
            project_name: projects?.find((p: any) => p.id === rule.project_id)?.name,
            nature: rule.nature,
            in_dre: rule.in_dre ?? true,
            in_cashflow: rule.in_cashflow ?? true,
            confidence: rule.confidence_base,
            source: "origin_rule",
            reason: `Baseado na origem: ${origin}`,
            rule_id: rule.id,
          });
        }
      }
    }

    // ---- PRIORITY 5: Built-in keyword heuristics ----
    if (suggestions.length === 0) {
      const heuristics: { keywords: string[]; accountCode: string; nature: string; reason: string }[] = [
        { keywords: ["aluguel", "locacao"], accountCode: "3", nature: "DESPESA", reason: "Palavra-chave detectada: aluguel" },
        { keywords: ["energia", "eletrica", "cemig", "cpfl", "enel"], accountCode: "3", nature: "DESPESA", reason: "Palavra-chave detectada: energia" },
        { keywords: ["internet", "fibra", "banda larga"], accountCode: "3", nature: "DESPESA", reason: "Palavra-chave detectada: internet" },
        { keywords: ["salario", "folha", "holerite"], accountCode: "3", nature: "DESPESA", reason: "Palavra-chave detectada: folha de pagamento" },
        { keywords: ["software", "licenca", "saas", "assinatura"], accountCode: "3", nature: "DESPESA", reason: "Palavra-chave detectada: tecnologia/software" },
        { keywords: ["contabilidade", "contador"], accountCode: "3", nature: "DESPESA", reason: "Palavra-chave detectada: contabilidade" },
        { keywords: ["tarifa", "taxa bancaria", "ted", "doc", "pix taxa"], accountCode: "3", nature: "DESPESA", reason: "Palavra-chave detectada: tarifa bancária" },
        { keywords: ["juros", "mora", "multa atraso"], accountCode: "5", nature: "RESULTADO", reason: "Palavra-chave detectada: despesa financeira" },
        { keywords: ["rendimento", "aplicacao", "cdb", "poupanca"], accountCode: "5", nature: "RESULTADO", reason: "Palavra-chave detectada: receita financeira" },
        { keywords: ["emprestimo", "financiamento"], accountCode: "6", nature: "CAPITAL", reason: "Palavra-chave detectada: capital/empréstimo" },
        { keywords: ["comissao"], accountCode: "2", nature: "DESPESA", reason: "Palavra-chave detectada: comissão sobre venda" },
        { keywords: ["frete"], accountCode: "2", nature: "DESPESA", reason: "Palavra-chave detectada: frete" },
        { keywords: ["imposto", "icms", "pis", "cofins", "iss", "irpj", "csll", "simples nacional"], accountCode: "2", nature: "DESPESA", reason: "Palavra-chave detectada: imposto" },
      ];

      for (const h of heuristics) {
        if (h.keywords.some(kw => normalizedDesc.includes(normalizeDescription(kw)))) {
          // Find a matching chart account by code prefix
          const acct = chartAccounts?.find((a: any) => a.code?.startsWith(h.accountCode) && !a.parent_id?.startsWith("="));
          if (acct) {
            suggestions.push({
              chart_account_id: acct.id,
              chart_account_name: acct.name,
              cost_center_id: null,
              project_id: null,
              nature: h.nature,
              in_dre: h.accountCode !== "6",
              in_cashflow: h.accountCode !== "4",
              confidence: 55,
              source: "heuristic",
              reason: h.reason,
            });
          }
          break;
        }
      }
    }

    // Validate all suggestions
    const validSuggestions = suggestions
      .filter(s => {
        const err = validateSuggestion(s, chartAccounts || []);
        return !err;
      })
      .sort((a, b) => b.confidence - a.confidence);

    // Determine best suggestion and status
    const best = validSuggestions[0] || null;
    let status = "pending";
    if (best) {
      if (best.confidence >= 90) status = "auto_classified";
      else if (best.confidence >= 70) status = "suggested";
      else status = "pending";
    }

    return new Response(JSON.stringify({
      suggestions: validSuggestions,
      best_suggestion: best,
      status,
      total_suggestions: validSuggestions.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("classify-entry error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
