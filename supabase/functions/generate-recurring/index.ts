import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tenant_id, contract_id, generate_until } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generateUntilDate = generate_until || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

    // Fetch active contracts
    let query = supabase
      .from("fin_recurring_contracts")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("status", "active")
      .eq("auto_generate", true)
      .lte("next_generation_date", generateUntilDate);

    if (contract_id) query = query.eq("id", contract_id);

    const { data: contracts, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;
    if (!contracts?.length) {
      return new Response(JSON.stringify({ generated: 0, message: "No contracts due" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalGenerated = 0;
    const results: any[] = [];

    for (const contract of contracts) {
      let currentDate = new Date(contract.next_generation_date);
      const endDate = contract.end_date ? new Date(contract.end_date) : null;
      const untilDate = new Date(generateUntilDate);
      let generated = 0;

      while (currentDate <= untilDate) {
        // Stop if past end_date
        if (endDate && currentDate > endDate) break;
        // Stop if installment mode and limit reached
        if (contract.contract_mode === "installment" && contract.total_installments) {
          if ((contract.generated_count + generated) >= contract.total_installments) break;
        }

        const competenceDate = currentDate.toISOString().slice(0, 10);
        const amount = Number(contract.amount);
        const installmentNum = contract.generated_count + generated + 1;

        // Create ledger entry
        const entryType = contract.entry_type === "RECEITA" ? "RECEITA" : "DESPESA";
        const desc = `${contract.contract_name || contract.description} - Parcela ${installmentNum}`;

        const { data: entry, error: entryErr } = await supabase
          .from("fin_ledger_entries")
          .insert({
            type: entryType,
            description: desc,
            amount,
            competence_date: competenceDate,
            bank_account_id: contract.bank_account_id,
            chart_account_id: contract.chart_account_id,
            cost_center_id: contract.cost_center_id,
            project_id: contract.project_id,
            status: "ABERTO",
            is_recurring: true,
            installment_number: installmentNum,
            total_installments: contract.total_installments,
            parent_entry_id: null,
            tenant_id: contract.tenant_id,
            origem: "recorrente",
          })
          .select("id")
          .single();

        if (entryErr) {
          console.error(`Error creating entry for contract ${contract.id}:`, entryErr);
          break;
        }

        // Create linked payable or receivable
        if (entryType === "DESPESA") {
          await supabase.from("fin_payables").insert({
            description: desc,
            amount,
            due_date: competenceDate,
            competence_date: competenceDate,
            status: "ABERTO",
            supplier_id: contract.party_type === "supplier" ? contract.party_id : null,
            ledger_entry_id: entry.id,
            bank_account_id: contract.bank_account_id,
            chart_account_id: contract.chart_account_id,
            cost_center_id: contract.cost_center_id,
            project_id: contract.project_id,
            tenant_id: contract.tenant_id,
          });
        } else {
          await supabase.from("fin_receivables").insert({
            description: desc,
            amount,
            due_date: competenceDate,
            competence_date: competenceDate,
            status: "ABERTO",
            client_id: contract.party_type === "client" ? contract.party_id : null,
            ledger_entry_id: entry.id,
            bank_account_id: contract.bank_account_id,
            chart_account_id: contract.chart_account_id,
            cost_center_id: contract.cost_center_id,
            project_id: contract.project_id,
            tenant_id: contract.tenant_id,
          });
        }

        generated++;
        currentDate = advanceDate(currentDate, contract.frequency);
      }

      if (generated > 0) {
        // Update contract next_generation_date and generated_count
        const newCount = contract.generated_count + generated;
        const updates: any = {
          next_generation_date: currentDate.toISOString().slice(0, 10),
          generated_count: newCount,
        };

        // Auto-end installment contracts
        if (contract.contract_mode === "installment" && contract.total_installments && newCount >= contract.total_installments) {
          updates.status = "ended";
        }

        await supabase.from("fin_recurring_contracts").update(updates).eq("id", contract.id);

        totalGenerated += generated;
        results.push({
          contract_id: contract.id,
          contract_name: contract.contract_name || contract.description,
          entries_generated: generated,
          next_date: currentDate.toISOString().slice(0, 10),
        });
      }
    }

    return new Response(JSON.stringify({ generated: totalGenerated, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-recurring error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function advanceDate(date: Date, frequency: string): Date {
  const d = new Date(date);
  switch (frequency) {
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "biweekly": d.setDate(d.getDate() + 14); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "semiannual": d.setMonth(d.getMonth() + 6); break;
    case "annual": d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1);
  }
  return d;
}
