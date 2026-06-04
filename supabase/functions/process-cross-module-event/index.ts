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
    const { event_id } = await req.json();

    if (!event_id) {
      return new Response(JSON.stringify({ error: "event_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get the event
    const { data: event, error: eventErr } = await supabase
      .from("cross_module_events")
      .select("*")
      .eq("id", event_id)
      .single();

    if (eventErr || !event) throw new Error("Event not found");

    if (event.event_type !== "pedido_ativo" && event.event_type !== "pedido_aprovado") {
      return new Response(JSON.stringify({ message: "Only order activation events handled here currently" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get the order details
    const orderId = event.source_entity_id;
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, client:clients(name)")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) throw new Error("Order not found");

    // Try to find the cost center from the first order item
    const { data: firstItem } = await supabase
      .from("order_items")
      .select("centro_custo")
      .eq("order_id", orderId)
      .not("centro_custo", "is", null)
      .limit(1)
      .maybeSingle();

    let costCenterId = null;
    if (firstItem?.centro_custo) {
      const { data: cc } = await supabase
        .from("fin_cost_centers")
        .select("id")
        .ilike("name", `%${firstItem.centro_custo}%`)
        .eq("tenant_id", event.tenant_id)
        .maybeSingle();
      costCenterId = cc?.id;
    }

    const parcelas = order.observacao_pagamento ? JSON.parse(order.observacao_pagamento) : [];
    
    if (!Array.isArray(parcelas) || parcelas.length === 0) {
      // Fallback if no detailed payment conditions
      const totalAmount = Number(order.valor_total || 0);
      const dueDate = order.data_primeiro_vencimento || order.data_emissao || new Date().toISOString().slice(0, 10);
      
      await createReceivable(supabase, {
        order_id: orderId,
        tenant_id: event.tenant_id,
        amount: totalAmount,
        due_date: dueDate,
        description: `Receita Pedido #${order.order_number}`,
        customer_id: order.client_id,
        chart_account_id: order.chart_account_id,
        project_id: order.project_id,
        cost_center_id: costCenterId
      });
    } else {
      // Create receivables based on payment conditions
      const totalAmount = Number(order.valor_total || 0);
      for (const p of parcelas) {
        const amount = totalAmount * (Number(p.percentual || 0) / 100);
        if (amount <= 0) continue;
        
        await createReceivable(supabase, {
          order_id: orderId,
          tenant_id: event.tenant_id,
          amount: amount,
          due_date: p.data_vencimento || order.data_emissao || new Date().toISOString().slice(0, 10),
          description: `Receita Pedido #${order.order_number} (${p.forma_pagamento || 'Parcela'})`,
          customer_id: order.client_id,
          chart_account_id: order.chart_account_id,
          project_id: order.project_id,
          cost_center_id: costCenterId
        });
      }
    }

    // 3. Mark event as completed
    await supabase.from("cross_module_events").update({
      status: "completed",
      processed_at: new Date().toISOString()
    }).eq("id", event_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("process-cross-module-event error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function createReceivable(supabase: any, data: any) {
  // Create ledger entry first
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from("fin_ledger_entries")
    .insert({
      tenant_id: data.tenant_id,
      order_id: data.order_id,
      project_id: data.project_id,
      cost_center_id: data.cost_center_id,
      chart_account_id: data.chart_account_id,
      type: "RECEITA",
      description: data.description,
      amount: data.amount,
      competence_date: data.due_date,
      status: "ABERTO",
      party_id: data.customer_id,
      party_type: "client"
    })
    .select("id")
    .single();

  if (ledgerError) throw ledgerError;

  // Create receivable
  const { error: receivableError } = await supabase
    .from("fin_receivables")
    .insert({
      tenant_id: data.tenant_id,
      order_id: data.order_id,
      project_id: data.project_id,
      cost_center_id: data.cost_center_id,
      chart_account_id: data.chart_account_id,
      customer_id: data.customer_id,
      amount: data.amount,
      due_date: data.due_date,
      competence_date: data.due_date,
      description: data.description,
      status: "ABERTO",
      ledger_entry_id: ledgerEntry.id
    });

  if (receivableError) throw receivableError;
}
