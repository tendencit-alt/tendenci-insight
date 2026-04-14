import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { event_type, source_table, source_id, event_data, tenant_id, user_id } = await req.json();

    if (!event_type || !source_table || !source_id || !tenant_id) {
      return new Response(JSON.stringify({ error: "event_type, source_table, source_id, tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the event
    const { data: evt, error: evtErr } = await supabase.from("fin_business_events").insert({
      event_type, source_table, source_id, event_data: event_data || {},
      tenant_id, created_by: user_id, processing_status: "processing",
    }).select("id").single();

    if (evtErr) throw evtErr;
    const eventId = evt.id;

    let result: any = {};

    // ============ PROCESS BY EVENT TYPE ============

    switch (event_type) {

      // ---- EVENT 3: payment_received (client receipt with interest/penalty separation) ----
      case "payment_received": {
        const { receivable_id, paid_amount, paid_date, interest_amount = 0, penalty_amount = 0, bank_account_id } = event_data;
        
        const { data: recv } = await supabase.from("fin_receivables").select("*, client:clients(name)").eq("id", receivable_id).single();
        if (!recv) throw new Error("Receivable not found");

        const principalAmount = paid_amount - interest_amount - penalty_amount;

        // Update receivable
        await supabase.from("fin_receivables").update({
          status: "RECEBIDO", received_amount: paid_amount, received_date: paid_date,
        }).eq("id", receivable_id);

        // Update linked ledger entry
        if (recv.ledger_entry_id) {
          await supabase.from("fin_ledger_entries").update({
            status: "PAGO_RECEBIDO", cash_date: paid_date, reconciled: true,
          }).eq("id", recv.ledger_entry_id);
        }

        // Update bank balance
        if (bank_account_id) {
          await supabase.rpc("update_bank_balance_on_payment", {
            p_bank_account_id: bank_account_id, p_amount: principalAmount, p_direction: "IN",
          }).catch(() => {
            // Fallback: direct update
            supabase.from("fin_bank_accounts").select("current_balance").eq("id", bank_account_id).single()
              .then(({ data }) => {
                if (data) supabase.from("fin_bank_accounts").update({
                  current_balance: Number(data.current_balance || 0) + principalAmount,
                }).eq("id", bank_account_id);
              });
          });
        }

        // Generate financial interest/penalty entries if any
        if (interest_amount > 0) {
          const finAcct = await resolveChartAccount(supabase, tenant_id, "5");
          await supabase.from("fin_ledger_entries").insert({
            tenant_id, description: `Juros recebidos - ${recv.description || recv.client?.name || ""}`,
            amount: interest_amount, type: "RECEITA", status: "PAGO_RECEBIDO",
            competence_date: paid_date, cash_date: paid_date,
            chart_account_id: finAcct?.id, bank_account_id, reconciled: true,
            origin: "business_event", origin_id: eventId,
          });
        }

        if (penalty_amount > 0) {
          const finAcct = await resolveChartAccount(supabase, tenant_id, "5");
          await supabase.from("fin_ledger_entries").insert({
            tenant_id, description: `Multa recebida - ${recv.description || recv.client?.name || ""}`,
            amount: penalty_amount, type: "RECEITA", status: "PAGO_RECEBIDO",
            competence_date: paid_date, cash_date: paid_date,
            chart_account_id: finAcct?.id, bank_account_id, reconciled: true,
            origin: "business_event", origin_id: eventId,
          });
        }

        result = { principal: principalAmount, interest: interest_amount, penalty: penalty_amount };
        break;
      }

      // ---- EVENT 6: recurring_generate (generate entries from recurring contracts) ----
      case "recurring_generate": {
        const today = new Date().toISOString().slice(0, 10);
        const { data: contracts } = await supabase.from("fin_recurring_contracts")
          .select("*").eq("tenant_id", tenant_id).eq("status", "active").eq("auto_generate", true)
          .lte("next_generation_date", today);

        if (!contracts?.length) { result = { generated: 0 }; break; }

        let generated = 0;
        for (const c of contracts) {
          const isReceivable = c.party_type === "client";
          const table = isReceivable ? "fin_receivables" : "fin_payables";

          // Create the entry
          const entryData: any = {
            tenant_id, description: c.description, amount: c.amount,
            due_date: c.next_generation_date, status: "ABERTO",
            chart_account_id: c.chart_account_id, cost_center_id: c.cost_center_id,
            project_id: c.project_id, bank_account_id: c.bank_account_id,
          };
          if (isReceivable) entryData.client_id = c.party_id;
          else entryData.supplier_id = c.party_id;

          await supabase.from(table).insert(entryData);

          // Ledger entry
          await supabase.from("fin_ledger_entries").insert({
            tenant_id, description: `[Recorrente] ${c.description}`,
            amount: c.amount, type: isReceivable ? "RECEITA" : "DESPESA",
            status: "ABERTO", competence_date: c.next_generation_date,
            chart_account_id: c.chart_account_id, cost_center_id: c.cost_center_id,
            project_id: c.project_id, bank_account_id: c.bank_account_id,
            origin: "recurring_contract", origin_id: c.id,
          });

          // Calculate next generation date
          const next = new Date(c.next_generation_date);
          if (c.frequency === "monthly") next.setMonth(next.getMonth() + 1);
          else if (c.frequency === "quarterly") next.setMonth(next.getMonth() + 3);
          else if (c.frequency === "yearly") next.setFullYear(next.getFullYear() + 1);

          const updates: any = { next_generation_date: next.toISOString().slice(0, 10) };
          if (c.end_date && next.toISOString().slice(0, 10) > c.end_date) {
            updates.status = "ended";
          }
          await supabase.from("fin_recurring_contracts").update(updates).eq("id", c.id);
          generated++;
        }
        result = { generated };
        break;
      }

      // ---- EVENT 7: loan_contracted ----
      case "loan_contracted": {
        const { loan_id } = event_data;
        const { data: loan } = await supabase.from("fin_loan_contracts").select("*").eq("id", loan_id).single();
        if (!loan) throw new Error("Loan not found");

        // Capital entry (cash inflow)
        const capitalAcct = await resolveChartAccount(supabase, tenant_id, "6");
        await supabase.from("fin_ledger_entries").insert({
          tenant_id, description: `Empréstimo contratado - ${loan.bank_name || ""} #${loan.contract_number || ""}`,
          amount: loan.principal_amount, type: "RECEITA", status: "PAGO_RECEBIDO",
          competence_date: loan.start_date, cash_date: loan.start_date,
          chart_account_id: capitalAcct?.id, reconciled: true,
          origin: "loan_contract", origin_id: loan.id,
        });

        // Generate installment schedule (simple linear amortization)
        const n = loan.installments || 12;
        const principal = Number(loan.principal_amount);
        const rate = Number(loan.interest_rate || 0) / 100;
        const monthlyPrincipal = principal / n;
        let remainingBalance = principal;
        const installments = [];

        for (let i = 1; i <= n; i++) {
          const interest = remainingBalance * rate;
          const total = monthlyPrincipal + interest;
          const dueDate = new Date(loan.start_date);
          dueDate.setMonth(dueDate.getMonth() + i);

          installments.push({
            tenant_id, loan_id: loan.id, installment_number: i,
            due_date: dueDate.toISOString().slice(0, 10),
            principal_amount: Math.round(monthlyPrincipal * 100) / 100,
            interest_amount: Math.round(interest * 100) / 100,
            total_amount: Math.round(total * 100) / 100,
            status: "pending",
          });

          remainingBalance -= monthlyPrincipal;
        }

        await supabase.from("fin_loan_installments").insert(installments);

        // Generate payables for each installment
        const finAcct = await resolveChartAccount(supabase, tenant_id, "5");
        for (const inst of installments) {
          const { data: payable } = await supabase.from("fin_payables").insert({
            tenant_id, description: `Parcela ${inst.installment_number}/${n} - ${loan.bank_name || "Empréstimo"}`,
            amount: inst.total_amount, due_date: inst.due_date, status: "ABERTO",
            chart_account_id: capitalAcct?.id,
          }).select("id").single();

          if (payable) {
            await supabase.from("fin_loan_installments").update({ payable_id: payable.id })
              .eq("loan_id", loan.id).eq("installment_number", inst.installment_number);
          }
        }

        result = { installments_created: n };
        break;
      }

      // ---- EVENT 8: loan_installment_paid ----
      case "loan_installment_paid": {
        const { installment_id, paid_date, paid_amount, bank_account_id: bankId } = event_data;
        const { data: inst } = await supabase.from("fin_loan_installments")
          .select("*, loan:fin_loan_contracts(*)").eq("id", installment_id).single();
        if (!inst) throw new Error("Installment not found");

        const capitalAcct = await resolveChartAccount(supabase, tenant_id, "6");
        const finAcct = await resolveChartAccount(supabase, tenant_id, "5");

        // Principal entry (Capital)
        const { data: principalEntry } = await supabase.from("fin_ledger_entries").insert({
          tenant_id, description: `Amortização principal - ${inst.loan?.bank_name || ""} Parc ${inst.installment_number}`,
          amount: inst.principal_amount, type: "DESPESA", status: "PAGO_RECEBIDO",
          competence_date: inst.due_date, cash_date: paid_date,
          chart_account_id: capitalAcct?.id, bank_account_id: bankId,
          reconciled: true, origin: "loan_installment", origin_id: inst.id,
        }).select("id").single();

        // Interest entry (Financial Result)
        let interestEntryId = null;
        if (inst.interest_amount > 0) {
          const { data: intEntry } = await supabase.from("fin_ledger_entries").insert({
            tenant_id, description: `Juros empréstimo - ${inst.loan?.bank_name || ""} Parc ${inst.installment_number}`,
            amount: inst.interest_amount, type: "DESPESA", status: "PAGO_RECEBIDO",
            competence_date: inst.due_date, cash_date: paid_date,
            chart_account_id: finAcct?.id, bank_account_id: bankId,
            reconciled: true, origin: "loan_installment", origin_id: inst.id,
          }).select("id").single();
          interestEntryId = intEntry?.id;
        }

        // IOF entry
        let iofEntryId = null;
        if (inst.iof_amount > 0) {
          const { data: iofEntry } = await supabase.from("fin_ledger_entries").insert({
            tenant_id, description: `IOF empréstimo - ${inst.loan?.bank_name || ""} Parc ${inst.installment_number}`,
            amount: inst.iof_amount, type: "DESPESA", status: "PAGO_RECEBIDO",
            competence_date: inst.due_date, cash_date: paid_date,
            chart_account_id: finAcct?.id, bank_account_id: bankId,
            reconciled: true, origin: "loan_installment", origin_id: inst.id,
          }).select("id").single();
          iofEntryId = iofEntry?.id;
        }

        // Update installment
        await supabase.from("fin_loan_installments").update({
          status: "paid", paid_date, paid_amount: paid_amount || inst.total_amount,
          ledger_entry_principal_id: principalEntry?.id,
          ledger_entry_interest_id: interestEntryId,
          ledger_entry_iof_id: iofEntryId,
        }).eq("id", installment_id);

        // Update payable if exists
        if (inst.payable_id) {
          await supabase.from("fin_payables").update({
            status: "PAGO", paid_amount: paid_amount || inst.total_amount, paid_date,
          }).eq("id", inst.payable_id);
        }

        result = { principal: inst.principal_amount, interest: inst.interest_amount, iof: inst.iof_amount };
        break;
      }

      // ---- EVENT 9: payroll ----
      case "payroll": {
        const { items, competence_date: compDate, due_date: dueDate } = event_data;
        // items: [{ description, amount, department, cost_center_id, chart_account_id }]
        if (!items?.length) throw new Error("Payroll items required");

        const opAcct = await resolveChartAccount(supabase, tenant_id, "3");
        let totalAmount = 0;

        for (const item of items) {
          const amount = Number(item.amount);
          totalAmount += amount;

          // Ledger entry (competence)
          await supabase.from("fin_ledger_entries").insert({
            tenant_id, description: `Folha - ${item.description || item.department || ""}`,
            amount, type: "DESPESA", status: "ABERTO",
            competence_date: compDate || new Date().toISOString().slice(0, 10),
            chart_account_id: item.chart_account_id || opAcct?.id,
            cost_center_id: item.cost_center_id,
            origin: "payroll", origin_id: eventId,
          });

          // Payable
          await supabase.from("fin_payables").insert({
            tenant_id, description: `Folha - ${item.description || item.department || ""}`,
            amount, due_date: dueDate || compDate, status: "ABERTO",
            chart_account_id: item.chart_account_id || opAcct?.id,
            cost_center_id: item.cost_center_id,
          });
        }

        result = { items_created: items.length, total: totalAmount };
        break;
      }

      // ---- EVENT 10: asset_purchased ----
      case "asset_purchased": {
        const { name, description: desc, category, acquisition_date, acquisition_value,
          useful_life_months = 60, residual_value = 0, depreciation_method = "linear",
          chart_account_id: chartId, cost_center_id: ccId, project_id: projId,
          supplier_id: suppId, treat_as_expense = false, bank_account_id: assetBankId } = event_data;

        if (treat_as_expense) {
          // Direct expense
          const opAcct = await resolveChartAccount(supabase, tenant_id, "3");
          await supabase.from("fin_ledger_entries").insert({
            tenant_id, description: `Compra direta - ${name}`,
            amount: acquisition_value, type: "DESPESA", status: "ABERTO",
            competence_date: acquisition_date,
            chart_account_id: chartId || opAcct?.id,
            cost_center_id: ccId, project_id: projId,
            origin: "asset_purchase", origin_id: eventId,
          });

          await supabase.from("fin_payables").insert({
            tenant_id, description: `Compra - ${name}`,
            amount: acquisition_value, due_date: acquisition_date, status: "ABERTO",
            supplier_id: suppId, chart_account_id: chartId || opAcct?.id,
            cost_center_id: ccId, project_id: projId,
          });

          result = { type: "expense", amount: acquisition_value };
        } else {
          // Depreciable asset
          const { data: asset } = await supabase.from("fin_assets").insert({
            tenant_id, name, description: desc, category, acquisition_date, acquisition_value,
            useful_life_months, depreciation_method, residual_value,
            current_book_value: acquisition_value,
            chart_account_id: chartId, cost_center_id: ccId, project_id: projId,
            supplier_id: suppId, created_by: user_id,
          }).select("id").single();

          // Investment entry (Raiz 8)
          const investAcct = await resolveChartAccount(supabase, tenant_id, "8");
          const { data: ledgerEntry } = await supabase.from("fin_ledger_entries").insert({
            tenant_id, description: `Aquisição ativo - ${name}`,
            amount: acquisition_value, type: "DESPESA", status: "ABERTO",
            competence_date: acquisition_date,
            chart_account_id: investAcct?.id || chartId,
            cost_center_id: ccId, project_id: projId,
            origin: "asset_purchase", origin_id: asset?.id,
          }).select("id").single();

          if (asset) {
            await supabase.from("fin_assets").update({ ledger_entry_id: ledgerEntry?.id }).eq("id", asset.id);
          }

          // Generate depreciation schedule
          const depAcct = await resolveChartAccount(supabase, tenant_id, "4");
          const depreciableValue = acquisition_value - residual_value;
          const monthlyDep = depreciableValue / useful_life_months;
          const schedule = [];
          let accumulated = 0;

          for (let m = 1; m <= useful_life_months; m++) {
            const periodDate = new Date(acquisition_date);
            periodDate.setMonth(periodDate.getMonth() + m);
            accumulated += monthlyDep;

            schedule.push({
              tenant_id, asset_id: asset?.id,
              period_date: periodDate.toISOString().slice(0, 10),
              amount: Math.round(monthlyDep * 100) / 100,
              accumulated: Math.round(accumulated * 100) / 100,
              status: "pending",
            });
          }

          // Insert in batches
          for (let i = 0; i < schedule.length; i += 50) {
            await supabase.from("fin_depreciation_schedule").insert(schedule.slice(i, i + 50));
          }

          result = { type: "asset", asset_id: asset?.id, depreciation_periods: useful_life_months };
        }
        break;
      }

      // ---- EVENT 10b: depreciation_post (post monthly depreciation) ----
      case "depreciation_post": {
        const targetDate = event_data.period_date || new Date().toISOString().slice(0, 7) + "-01";
        const periodEnd = new Date(targetDate);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const { data: pendingDeps } = await supabase.from("fin_depreciation_schedule")
          .select("*, asset:fin_assets(*)")
          .eq("tenant_id", tenant_id).eq("status", "pending")
          .lte("period_date", periodEnd.toISOString().slice(0, 10))
          .order("period_date");

        if (!pendingDeps?.length) { result = { posted: 0 }; break; }

        const depAcct = await resolveChartAccount(supabase, tenant_id, "4");
        let posted = 0;

        for (const dep of pendingDeps) {
          // DRE entry only (no cashflow) — in_cashflow = false for raiz 4
          const { data: entry } = await supabase.from("fin_ledger_entries").insert({
            tenant_id, description: `Depreciação - ${dep.asset?.name || "Ativo"}`,
            amount: dep.amount, type: "DESPESA", status: "PAGO_RECEBIDO",
            competence_date: dep.period_date,
            chart_account_id: depAcct?.id,
            cost_center_id: dep.asset?.cost_center_id,
            project_id: dep.asset?.project_id,
            reconciled: true,
            origin: "depreciation", origin_id: dep.asset_id,
          }).select("id").single();

          await supabase.from("fin_depreciation_schedule").update({
            status: "posted", ledger_entry_id: entry?.id,
          }).eq("id", dep.id);

          // Update book value
          if (dep.asset_id) {
            const newBookValue = Number(dep.asset?.current_book_value || 0) - dep.amount;
            await supabase.from("fin_assets").update({
              current_book_value: Math.max(0, newBookValue),
              status: newBookValue <= (dep.asset?.residual_value || 0) ? "fully_depreciated" : "active",
            }).eq("id", dep.asset_id);
          }

          posted++;
        }

        result = { posted };
        break;
      }

      // ---- EVENT: order_cancelled (cancel all linked financial entries) ----
      case "order_cancelled": {
        const { order_id } = event_data;
        if (!order_id) throw new Error("order_id required");

        const cancellableStatuses = ["ABERTO", "PROVISIONADO", "CONFIRMADO", "VENCIDO"];
        const reason = "Cancelamento automático via evento de negócio";

        // Cancel ledger entries
        const { data: cancelledLedger } = await supabase.from("fin_ledger_entries")
          .update({ status: "CANCELADO", cancelado_em: new Date().toISOString(), cancelado_por: user_id, motivo_cancelamento: reason })
          .eq("order_id", order_id).in("status", cancellableStatuses).select("id");

        // Cancel payables
        const { data: cancelledPayables } = await supabase.from("fin_payables")
          .update({ status: "CANCELADO", cancelado_em: new Date().toISOString(), cancelado_por: user_id, motivo_cancelamento: reason })
          .eq("order_id", order_id).in("status", cancellableStatuses).select("id");

        // Cancel receivables
        const { data: cancelledReceivables } = await supabase.from("fin_receivables")
          .update({ status: "CANCELADO", cancelado_em: new Date().toISOString(), cancelado_por: user_id, motivo_cancelamento: reason })
          .eq("order_id", order_id).in("status", cancellableStatuses).select("id");

        result = {
          ledger_cancelled: cancelledLedger?.length || 0,
          payables_cancelled: cancelledPayables?.length || 0,
          receivables_cancelled: cancelledReceivables?.length || 0,
        };
        break;
      }

      // ---- EVENT: purchase_approved (generate payables from purchase order) ----
      case "purchase_approved": {
        const { purchase_order_id } = event_data;
        if (!purchase_order_id) throw new Error("purchase_order_id required");

        const { data: po } = await supabase.from("purchase_orders")
          .select("*, supplier:suppliers(name)")
          .eq("id", purchase_order_id).single();
        if (!po) throw new Error("Purchase order not found");

        // Resolve chart account (root 3 = operational expenses)
        const opAcct = await resolveChartAccount(supabase, tenant_id, "3");

        // Create payable
        const { data: payable } = await supabase.from("fin_payables").insert({
          tenant_id,
          description: `Compra #${po.number || ""} - ${po.supplier?.name || po.description || ""}`,
          amount: po.total_value || po.amount,
          due_date: po.due_date || po.delivery_date || new Date().toISOString().slice(0, 10),
          competence_date: po.competence_date || po.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          status: "ABERTO",
          supplier_id: po.supplier_id,
          order_id: purchase_order_id,
          chart_account_id: po.chart_account_id || opAcct?.id,
          cost_center_id: po.cost_center_id,
          project_id: po.project_id,
        }).select("id").single();

        // Ledger entry
        await supabase.from("fin_ledger_entries").insert({
          tenant_id,
          description: `Compra #${po.number || ""} - ${po.supplier?.name || po.description || ""}`,
          amount: po.total_value || po.amount,
          type: "DESPESA",
          status: "ABERTO",
          competence_date: po.competence_date || po.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          chart_account_id: po.chart_account_id || opAcct?.id,
          cost_center_id: po.cost_center_id,
          project_id: po.project_id,
          order_id: purchase_order_id,
          origin: "purchase_order",
          origin_id: purchase_order_id,
        });

        result = { payable_id: payable?.id, amount: po.total_value || po.amount };
        break;
      }

      // ---- EVENT: anticipation_registered ----
      case "anticipation_registered": {
        const { type: antType, amount: antAmount, order_id: antOrderId, description: antDesc } = event_data;

        const anticipationAcct = await resolveChartAccount(supabase, tenant_id, "2.5");

        await supabase.from("fin_ledger_entries").insert({
          tenant_id,
          description: `Antecipação ${antType || ""} - ${antDesc || ""}`,
          amount: antAmount,
          type: "DESPESA",
          status: "ABERTO",
          competence_date: new Date().toISOString().slice(0, 10),
          chart_account_id: anticipationAcct?.id,
          order_id: antOrderId,
          origin: "anticipation",
          origin_id: eventId,
        });

        result = { type: antType, amount: antAmount };
        break;
      }

      default:
        result = { message: `Event type '${event_type}' acknowledged. Existing triggers handle this event.` };
    }

    // Mark event as completed
    await supabase.from("fin_business_events").update({
      processing_status: "completed", processing_result: result, processed_at: new Date().toISOString(),
    }).eq("id", eventId);

    return new Response(JSON.stringify({ event_id: eventId, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("process-business-event error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper: resolve chart account by root code
async function resolveChartAccount(supabase: any, tenantId: string, codePrefix: string) {
  const { data } = await supabase.from("fin_chart_accounts")
    .select("id, code, name").eq("tenant_id", tenantId).eq("active", true)
    .like("code", `${codePrefix}%`).order("code").limit(1);
  return data?.[0] || null;
}
