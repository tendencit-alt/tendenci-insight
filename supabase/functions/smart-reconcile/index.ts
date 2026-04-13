import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 100;
  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? Math.round((intersection / union) * 100) : 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { transaction_ids, tenant_id } = await req.json();
    if (!transaction_ids?.length || !tenant_id) {
      return new Response(JSON.stringify({ error: "transaction_ids and tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Fetch transactions to reconcile
    const { data: transactions } = await supabase
      .from("fin_bank_transactions")
      .select("*")
      .in("id", transaction_ids);

    if (!transactions?.length) {
      return new Response(JSON.stringify({ error: "No transactions found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Fetch internal data for matching
    const dateMin = transactions.reduce((m, t) => t.date < m ? t.date : m, transactions[0].date);
    const dateMax = transactions.reduce((m, t) => t.date > m ? t.date : m, transactions[0].date);

    // Widen date window by 10 days for fuzzy matching
    const dMin = new Date(dateMin); dMin.setDate(dMin.getDate() - 10);
    const dMax = new Date(dateMax); dMax.setDate(dMax.getDate() + 10);

    const [ledgerResult, payablesResult, receivablesResult, historyResult, chartResult] = await Promise.all([
      supabase.from("fin_ledger_entries").select("*, chart_account:fin_chart_accounts(id, name, code, nature, in_dre, in_cashflow), cost_center:fin_cost_centers(id, name), project:fin_projects(id, name)")
        .eq("tenant_id", tenant_id).eq("reconciled", false)
        .gte("competence_date", dMin.toISOString().slice(0, 10))
        .lte("competence_date", dMax.toISOString().slice(0, 10)),
      supabase.from("fin_payables").select("*, supplier:suppliers(id, name)")
        .eq("tenant_id", tenant_id).in("status", ["ABERTO", "VENCIDO"])
        .gte("due_date", dMin.toISOString().slice(0, 10))
        .lte("due_date", dMax.toISOString().slice(0, 10)),
      supabase.from("fin_receivables").select("*, client:clients(id, name)")
        .eq("tenant_id", tenant_id).in("status", ["ABERTO", "VENCIDO"])
        .gte("due_date", dMin.toISOString().slice(0, 10))
        .lte("due_date", dMax.toISOString().slice(0, 10)),
      supabase.from("fin_classification_history")
        .select("*").eq("tenant_id", tenant_id)
        .order("confirmation_count", { ascending: false }).limit(200),
      supabase.from("fin_chart_accounts")
        .select("id, code, name, nature, in_dre, in_cashflow, parent_id")
        .eq("tenant_id", tenant_id).eq("active", true),
    ]);

    const ledgerEntries = ledgerResult.data || [];
    const payables = payablesResult.data || [];
    const receivables = receivablesResult.data || [];
    const classHistory = historyResult.data || [];
    const chartAccounts = chartResult.data || [];

    // ========== STEP 1: DUPLICATE CHECK ==========
    const existingIds = new Set<string>();
    for (const tx of transactions) {
      const { data: dupes } = await supabase
        .from("fin_bank_transactions")
        .select("id")
        .eq("bank_account_id", tx.bank_account_id)
        .eq("bank_transaction_id", tx.bank_transaction_id)
        .neq("id", tx.id)
        .limit(1);
      
      if (dupes?.length) {
        existingIds.add(tx.id);
        await supabase.from("fin_bank_transactions").update({
          is_duplicate: true,
          duplicate_of_id: dupes[0].id,
          status: "DUPLICADA",
        }).eq("id", tx.id);
      }
    }

    const results: any[] = [];

    for (const tx of transactions) {
      if (existingIds.has(tx.id)) {
        results.push({
          transaction_id: tx.id,
          status: "duplicate",
          reconciliation_score: 0,
          classification_score: 0,
          message: "Transação duplicada detectada",
        });
        continue;
      }

      const txAmount = Math.abs(Number(tx.amount));
      const txDate = tx.date;
      const txMemo = tx.bank_memo || "";
      const txDirection = tx.direction; // IN or OUT
      let bestMatch: any = null;
      let bestScore = 0;
      let matchSource = "";
      let matchedEntry: any = null;

      // ========== PRIORITY 1: Match with payables/receivables ==========
      if (txDirection === "OUT") {
        for (const p of payables) {
          const pAmount = Math.abs(Number(p.amount));
          const amountMatch = Math.abs(pAmount - txAmount) < 0.01 ? 40 : Math.abs(pAmount - txAmount) / pAmount < 0.05 ? 25 : 0;
          if (amountMatch === 0) continue;
          
          const daysDiff = Math.abs((new Date(txDate).getTime() - new Date(p.due_date).getTime()) / 86400000);
          const dateMatch = daysDiff === 0 ? 30 : daysDiff <= 3 ? 20 : daysDiff <= 7 ? 10 : 0;
          const descMatch = similarity(txMemo, p.description || "") > 50 ? 20 : similarity(txMemo, p.supplier?.name || "") > 60 ? 15 : 0;
          const score = amountMatch + dateMatch + descMatch + 10; // +10 bonus for internal match

          if (score > bestScore) {
            bestScore = score;
            bestMatch = { type: "payable", id: p.id, ledger_entry_id: p.ledger_entry_id };
            matchSource = `Conta a Pagar: ${p.description || p.supplier?.name || ""}`;
            matchedEntry = p.ledger_entry_id ? ledgerEntries.find(e => e.id === p.ledger_entry_id) : null;
          }
        }
      } else {
        for (const r of receivables) {
          const rAmount = Math.abs(Number(r.amount));
          const amountMatch = Math.abs(rAmount - txAmount) < 0.01 ? 40 : Math.abs(rAmount - txAmount) / rAmount < 0.05 ? 25 : 0;
          if (amountMatch === 0) continue;
          
          const daysDiff = Math.abs((new Date(txDate).getTime() - new Date(r.due_date).getTime()) / 86400000);
          const dateMatch = daysDiff === 0 ? 30 : daysDiff <= 3 ? 20 : daysDiff <= 7 ? 10 : 0;
          const descMatch = similarity(txMemo, r.description || "") > 50 ? 20 : similarity(txMemo, r.client?.name || "") > 60 ? 15 : 0;
          const score = amountMatch + dateMatch + descMatch + 10;

          if (score > bestScore) {
            bestScore = score;
            bestMatch = { type: "receivable", id: r.id, ledger_entry_id: r.ledger_entry_id };
            matchSource = `Conta a Receber: ${r.description || r.client?.name || ""}`;
            matchedEntry = r.ledger_entry_id ? ledgerEntries.find(e => e.id === r.ledger_entry_id) : null;
          }
        }
      }

      // ========== PRIORITY 2: Exact match with ledger entries ==========
      for (const entry of ledgerEntries) {
        const eAmount = Math.abs(Number(entry.amount));
        const isMatchingType = (txDirection === "OUT" && (entry.type === "DESPESA" || entry.type === "TRANSFERENCIA")) ||
                              (txDirection === "IN" && (entry.type === "RECEITA" || entry.type === "TRANSFERENCIA"));
        if (!isMatchingType) continue;

        const amountMatch = Math.abs(eAmount - txAmount) < 0.01 ? 40 : 0;
        if (amountMatch === 0) continue;

        const entryDate = entry.cash_date || entry.competence_date;
        const daysDiff = Math.abs((new Date(txDate).getTime() - new Date(entryDate).getTime()) / 86400000);
        const dateMatch = daysDiff === 0 ? 30 : daysDiff <= 3 ? 20 : daysDiff <= 7 ? 10 : 0;
        const descMatch = similarity(txMemo, entry.description) > 40 ? 20 : 0;
        const sameAccount = entry.bank_account_id === tx.bank_account_id ? 5 : 0;
        const score = amountMatch + dateMatch + descMatch + sameAccount;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = { type: "ledger", id: entry.id };
          matchSource = `Lançamento: ${entry.description}`;
          matchedEntry = entry;
        }
      }

      // ========== STEP: Determine reconciliation status ==========
      const reconScore = bestScore;
      let reconStatus = "PENDENTE";
      let reconMethod = "none";

      if (reconScore >= 90) {
        reconStatus = "CONCILIADA";
        reconMethod = "auto";
      } else if (reconScore >= 70) {
        reconStatus = "SUGERIDA";
        reconMethod = "auto";
      }

      // ========== STEP: Classification ==========
      let classScore = 0;
      let classStatus = "pending";
      let classReason = "";
      let suggestedChartId: string | null = null;
      let suggestedCCId: string | null = null;
      let suggestedProjId: string | null = null;

      // If reconciled, inherit classification from matched entry
      if (matchedEntry && reconScore >= 70) {
        suggestedChartId = matchedEntry.chart_account_id || matchedEntry.chart_account?.id;
        suggestedCCId = matchedEntry.cost_center_id || matchedEntry.cost_center?.id;
        suggestedProjId = matchedEntry.project_id || matchedEntry.project?.id;
        classScore = Math.min(100, reconScore + 5);
        classStatus = classScore >= 90 ? "auto_classified" : "suggested";
        classReason = `Herdado do ${matchSource}`;
      } else {
        // Use classification engine
        const normalizedMemo = normalize(txMemo);

        // Check classification history
        for (const h of classHistory) {
          if (normalize(h.normalized_description) === normalizedMemo || 
              (h.party_name && normalize(h.party_name).length > 3 && normalizedMemo.includes(normalize(h.party_name)))) {
            suggestedChartId = h.chart_account_id;
            suggestedCCId = h.cost_center_id;
            suggestedProjId = h.project_id;
            classScore = h.strength === "strong" ? 92 : h.strength === "moderate" ? 78 : 60;
            classStatus = classScore >= 90 ? "auto_classified" : "suggested";
            classReason = `Baseado em ${h.confirmation_count} lançamento(s) anterior(es) com descrição similar`;
            break;
          }
        }

        // Heuristic fallback
        if (!suggestedChartId) {
          const heuristics = [
            { kws: ["aluguel", "locacao"], code: "3", reason: "Aluguel detectado" },
            { kws: ["energia", "eletrica", "cemig", "cpfl"], code: "3", reason: "Energia detectada" },
            { kws: ["salario", "folha", "holerite"], code: "3", reason: "Folha de pagamento" },
            { kws: ["tarifa", "taxa bancaria", "manutencao conta"], code: "3", reason: "Tarifa bancária" },
            { kws: ["juros", "iof", "multa atraso"], code: "5", reason: "Despesa financeira" },
            { kws: ["rendimento", "aplicacao"], code: "5", reason: "Receita financeira" },
            { kws: ["emprestimo", "financiamento"], code: "6", reason: "Empréstimo/Capital" },
          ];

          for (const h of heuristics) {
            if (h.kws.some(kw => normalizedMemo.includes(kw))) {
              const acct = chartAccounts.find(a => a.code?.startsWith(h.code));
              if (acct) {
                suggestedChartId = acct.id;
                classScore = 55;
                classStatus = "suggested";
                classReason = h.reason;
              }
              break;
            }
          }
        }
      }

      // ========== ANTI-ERROR VALIDATION ==========
      if (suggestedChartId) {
        const acct = chartAccounts.find(a => a.id === suggestedChartId);
        if (acct) {
          if (acct.code?.startsWith("6") && acct.in_dre) {
            classReason += " ⚠️ Capital não deve participar da DRE";
          }
          if (acct.code?.startsWith("4") && acct.in_cashflow) {
            classReason += " ⚠️ Depreciação não deve participar do Fluxo";
          }
        }
      }

      // ========== UPDATE TRANSACTION ==========
      await supabase.from("fin_bank_transactions").update({
        status: reconStatus,
        reconciliation_score: reconScore,
        reconciliation_method: reconMethod,
        classification_score: classScore,
        classification_status: classStatus,
        classification_reason: classReason,
        suggested_chart_account_id: suggestedChartId,
        suggested_cost_center_id: suggestedCCId,
        suggested_project_id: suggestedProjId,
        tenant_id,
      }).eq("id", tx.id);

      // ========== CREATE RECONCILIATION LINK if high confidence ==========
      if (bestMatch && reconScore >= 70) {
        await supabase.from("fin_reconciliation_links").insert({
          bank_transaction_id: tx.id,
          ledger_entry_id: bestMatch.type === "ledger" ? bestMatch.id : bestMatch.ledger_entry_id,
          match_type: bestMatch.type,
          score: reconScore,
          payable_id: bestMatch.type === "payable" ? bestMatch.id : null,
          receivable_id: bestMatch.type === "receivable" ? bestMatch.id : null,
          reconciliation_status: reconScore >= 90 ? "active" : "pending",
          notes: matchSource,
        });

        // If auto-reconciled, mark the ledger entry as reconciled
        if (reconScore >= 90 && (bestMatch.type === "ledger" || bestMatch.ledger_entry_id)) {
          const entryId = bestMatch.type === "ledger" ? bestMatch.id : bestMatch.ledger_entry_id;
          if (entryId) {
            await supabase.from("fin_ledger_entries").update({
              reconciled: true,
              cash_date: txDate,
              status: "PAGO_RECEBIDO",
              classification_status: classStatus,
              classification_score: classScore,
              classification_source: "reconciliation",
            }).eq("id", entryId);
          }
        }
      }

      results.push({
        transaction_id: tx.id,
        status: reconStatus.toLowerCase(),
        reconciliation_score: reconScore,
        reconciliation_method: reconMethod,
        classification_score: classScore,
        classification_status: classStatus,
        classification_reason: classReason,
        match: bestMatch ? { type: bestMatch.type, source: matchSource } : null,
        suggested: {
          chart_account_id: suggestedChartId,
          cost_center_id: suggestedCCId,
          project_id: suggestedProjId,
        },
      });
    }

    const summary = {
      total: results.length,
      auto_reconciled: results.filter(r => r.reconciliation_score >= 90).length,
      suggested: results.filter(r => r.reconciliation_score >= 70 && r.reconciliation_score < 90).length,
      pending: results.filter(r => r.reconciliation_score < 70).length,
      duplicates: results.filter(r => r.status === "duplicate").length,
      auto_classified: results.filter(r => r.classification_score >= 90).length,
      classification_suggested: results.filter(r => r.classification_score >= 70 && r.classification_score < 90).length,
    };

    return new Response(JSON.stringify({ results, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("smart-reconcile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
