import { supabase } from "@/integrations/supabase/client";

/**
 * Financial Integration Service
 * 
 * This module provides functions to maintain consistency between:
 * - fin_payables (Contas a Pagar)
 * - fin_receivables (Contas a Receber)
 * - fin_ledger_entries (Lançamentos)
 * 
 * Integration Rules:
 * 1. When a Payable is CREATED → Create a corresponding Ledger Entry (status: ABERTO)
 * 2. When a Payable is PAID → Update the Ledger Entry (status: PAGO_RECEBIDO, set cash_date)
 * 3. When a Receivable is CREATED → Create a corresponding Ledger Entry (status: ABERTO)
 * 4. When a Receivable is RECEIVED → Update the Ledger Entry (status: PAGO_RECEBIDO, set cash_date)
 * 5. When a Ledger Entry with party_type is CREATED → Create corresponding Payable/Receivable
 * 6. When a Ledger Entry is RECONCILED → Mark linked Payable/Receivable as reconciled
 */

interface CreatePayableData {
  supplier_id: string;
  amount: number;
  due_date: string;
  competence_date: string;
  chart_account_id?: string;
  cost_center_id?: string;
  project_id?: string;
  description?: string;
  document_number?: string;
  installment?: number;
  total_installments?: number;
  notes?: string;
}

interface CreateReceivableData {
  customer_id: string;
  amount: number;
  due_date: string;
  competence_date: string;
  chart_account_id?: string;
  cost_center_id?: string;
  project_id?: string;
  description?: string;
  document_number?: string;
  installment?: number;
  total_installments?: number;
  notes?: string;
}

interface CreateLedgerEntryData {
  type: string;
  description: string;
  amount: number;
  competence_date: string;
  cash_date?: string | null;
  bank_account_id?: string | null;
  chart_account_id?: string | null;
  cost_center_id?: string | null;
  project_id?: string | null;
  payment_method?: string | null;
  document_number?: string | null;
  notes?: string | null;
  party_id?: string | null;
  party_type?: string | null;
  status?: string;
}

/**
 * Create a payable and its corresponding ledger entry
 */
export async function createPayableWithLedger(data: CreatePayableData) {
  // First, create the ledger entry (provisioned expense)
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from("fin_ledger_entries")
    .insert({
      type: "DESPESA",
      description: data.description || "Conta a Pagar",
      amount: data.amount,
      competence_date: data.competence_date,
      cash_date: null, // Not paid yet
      chart_account_id: data.chart_account_id || null,
      cost_center_id: data.cost_center_id || null,
      project_id: data.project_id || null,
      party_id: data.supplier_id,
      party_type: "supplier",
      document_number: data.document_number || null,
      notes: data.notes || null,
      status: "ABERTO",
      installment_number: data.installment || 1,
      total_installments: data.total_installments || 1,
    })
    .select("id")
    .single();

  if (ledgerError) throw ledgerError;

  // Then, create the payable linked to the ledger entry
  const { data: payable, error: payableError } = await supabase
    .from("fin_payables")
    .insert({
      supplier_id: data.supplier_id,
      amount: data.amount,
      due_date: data.due_date,
      competence_date: data.competence_date,
      chart_account_id: data.chart_account_id || null,
      cost_center_id: data.cost_center_id || null,
      project_id: data.project_id || null,
      description: data.description,
      document_number: data.document_number || null,
      installment: data.installment || 1,
      total_installments: data.total_installments || 1,
      notes: data.notes || null,
      ledger_entry_id: ledgerEntry.id,
      status: "ABERTO",
    })
    .select("id")
    .single();

  if (payableError) {
    // Rollback: delete the ledger entry if payable creation failed
    await supabase.from("fin_ledger_entries").delete().eq("id", ledgerEntry.id);
    throw payableError;
  }

  return { payable, ledgerEntry };
}

/**
 * Create a receivable and its corresponding ledger entry
 */
export async function createReceivableWithLedger(data: CreateReceivableData) {
  // First, create the ledger entry (provisioned revenue)
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from("fin_ledger_entries")
    .insert({
      type: "RECEITA",
      description: data.description || "Conta a Receber",
      amount: data.amount,
      competence_date: data.competence_date,
      cash_date: null, // Not received yet
      chart_account_id: data.chart_account_id || null,
      cost_center_id: data.cost_center_id || null,
      project_id: data.project_id || null,
      party_id: data.customer_id,
      party_type: "client",
      document_number: data.document_number || null,
      notes: data.notes || null,
      status: "ABERTO",
      installment_number: data.installment || 1,
      total_installments: data.total_installments || 1,
    })
    .select("id")
    .single();

  if (ledgerError) throw ledgerError;

  // Then, create the receivable linked to the ledger entry
  const { data: receivable, error: receivableError } = await supabase
    .from("fin_receivables")
    .insert({
      customer_id: data.customer_id,
      amount: data.amount,
      due_date: data.due_date,
      competence_date: data.competence_date,
      chart_account_id: data.chart_account_id || null,
      cost_center_id: data.cost_center_id || null,
      project_id: data.project_id || null,
      description: data.description,
      document_number: data.document_number || null,
      installment: data.installment || 1,
      total_installments: data.total_installments || 1,
      notes: data.notes || null,
      ledger_entry_id: ledgerEntry.id,
      status: "ABERTO",
    })
    .select("id")
    .single();

  if (receivableError) {
    // Rollback: delete the ledger entry if receivable creation failed
    await supabase.from("fin_ledger_entries").delete().eq("id", ledgerEntry.id);
    throw receivableError;
  }

  return { receivable, ledgerEntry };
}

/**
 * Create a ledger entry and optionally create corresponding payable/receivable
 * based on party_type (supplier or client)
 */
export async function createLedgerEntryWithIntegration(
  data: CreateLedgerEntryData,
  createLinkedRecord: boolean = false,
  dueDate?: string
) {
  // Create the ledger entry
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from("fin_ledger_entries")
    .insert({
      type: data.type,
      description: data.description,
      amount: data.amount,
      competence_date: data.competence_date,
      cash_date: data.cash_date || null,
      bank_account_id: data.bank_account_id || null,
      chart_account_id: data.chart_account_id || null,
      cost_center_id: data.cost_center_id || null,
      project_id: data.project_id || null,
      payment_method: data.payment_method || null,
      document_number: data.document_number || null,
      notes: data.notes || null,
      party_id: data.party_id || null,
      party_type: data.party_type || null,
      status: data.status || (data.cash_date ? "PAGO_RECEBIDO" : "ABERTO"),
    })
    .select("id")
    .single();

  if (ledgerError) throw ledgerError;

  // If we should create a linked record and party info is provided
  if (createLinkedRecord && data.party_id && data.party_type) {
    const effectiveDueDate = dueDate || data.competence_date;

    if (data.party_type === "supplier" && data.type === "DESPESA") {
      // Create linked payable
      const { error: payableError } = await supabase
        .from("fin_payables")
        .insert({
          supplier_id: data.party_id,
          amount: data.amount,
          due_date: effectiveDueDate,
          competence_date: data.competence_date,
          chart_account_id: data.chart_account_id || null,
          cost_center_id: data.cost_center_id || null,
          project_id: data.project_id || null,
          description: data.description,
          document_number: data.document_number || null,
          notes: data.notes || null,
          ledger_entry_id: ledgerEntry.id,
          status: data.cash_date ? "PAGO" : "ABERTO",
          payment_date: data.cash_date || null,
          bank_account_id: data.bank_account_id || null,
          paid_amount: data.cash_date ? data.amount : 0,
        });

      if (payableError) {
        console.error("Error creating linked payable:", payableError);
      }
    } else if (data.party_type === "client" && data.type === "RECEITA") {
      // Create linked receivable
      const { error: receivableError } = await supabase
        .from("fin_receivables")
        .insert({
          customer_id: data.party_id,
          amount: data.amount,
          due_date: effectiveDueDate,
          competence_date: data.competence_date,
          chart_account_id: data.chart_account_id || null,
          cost_center_id: data.cost_center_id || null,
          project_id: data.project_id || null,
          description: data.description,
          document_number: data.document_number || null,
          notes: data.notes || null,
          ledger_entry_id: ledgerEntry.id,
          status: data.cash_date ? "RECEBIDO" : "ABERTO",
          receipt_date: data.cash_date || null,
          bank_account_id: data.bank_account_id || null,
          received_amount: data.cash_date ? data.amount : 0,
        });

      if (receivableError) {
        console.error("Error creating linked receivable:", receivableError);
      }
    }
  }

  return { ledgerEntry };
}

/**
 * Pay a payable and update its linked ledger entry
 */
export async function payPayableWithLedgerSync(
  payableId: string,
  paymentAmount: number,
  paymentDate: string,
  bankAccountId: string,
  currentPaidAmount: number,
  totalAmount: number,
  ledgerEntryId?: string | null,
  payableData?: {
    description?: string;
    supplier_id?: string;
    supplier_name?: string;
    competence_date?: string;
    chart_account_id?: string;
    cost_center_id?: string;
    project_id?: string;
  }
) {
  const newPaidAmount = currentPaidAmount + paymentAmount;
  const newStatus = newPaidAmount >= totalAmount ? "PAGO" : "PARCIAL";

  // Update the payable
  const { error: payableError } = await supabase
    .from("fin_payables")
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
      payment_date: newStatus === "PAGO" ? paymentDate : null,
      bank_account_id: bankAccountId,
    })
    .eq("id", payableId);

  if (payableError) throw payableError;

  // If there's a linked ledger entry, update it
  if (ledgerEntryId) {
    const { error: ledgerUpdateError } = await supabase
      .from("fin_ledger_entries")
      .update({
        cash_date: paymentDate,
        bank_account_id: bankAccountId,
        status: "PAGO_RECEBIDO",
      })
      .eq("id", ledgerEntryId);

    if (ledgerUpdateError) {
      console.error("Error updating linked ledger entry:", ledgerUpdateError);
    }
  } else {
    // Create a new ledger entry for this payment
    const { error: ledgerInsertError } = await supabase
      .from("fin_ledger_entries")
      .insert({
        type: "DESPESA",
        description: payableData?.description || `Pagamento - ${payableData?.supplier_name || "Fornecedor"}`,
        amount: paymentAmount,
        competence_date: payableData?.competence_date || paymentDate,
        cash_date: paymentDate,
        bank_account_id: bankAccountId,
        chart_account_id: payableData?.chart_account_id || null,
        cost_center_id: payableData?.cost_center_id || null,
        project_id: payableData?.project_id || null,
        party_id: payableData?.supplier_id || null,
        party_type: "supplier",
        status: "PAGO_RECEBIDO",
      });

    if (ledgerInsertError) throw ledgerInsertError;
  }

  return { success: true };
}

/**
 * Receive a receivable and update its linked ledger entry
 */
export async function receivePaymentWithLedgerSync(
  receivableId: string,
  receiptAmount: number,
  receiptDate: string,
  bankAccountId: string,
  currentReceivedAmount: number,
  totalAmount: number,
  ledgerEntryId?: string | null,
  receivableData?: {
    description?: string;
    customer_id?: string;
    customer_name?: string;
    competence_date?: string;
    chart_account_id?: string;
    cost_center_id?: string;
    project_id?: string;
  }
) {
  const newReceivedAmount = currentReceivedAmount + receiptAmount;
  const newStatus = newReceivedAmount >= totalAmount ? "RECEBIDO" : "PARCIAL";

  // Update the receivable
  const { error: receivableError } = await supabase
    .from("fin_receivables")
    .update({
      received_amount: newReceivedAmount,
      status: newStatus,
      receipt_date: newStatus === "RECEBIDO" ? receiptDate : null,
      bank_account_id: bankAccountId,
    })
    .eq("id", receivableId);

  if (receivableError) throw receivableError;

  // If there's a linked ledger entry, update it
  if (ledgerEntryId) {
    const { error: ledgerUpdateError } = await supabase
      .from("fin_ledger_entries")
      .update({
        cash_date: receiptDate,
        bank_account_id: bankAccountId,
        status: "PAGO_RECEBIDO",
      })
      .eq("id", ledgerEntryId);

    if (ledgerUpdateError) {
      console.error("Error updating linked ledger entry:", ledgerUpdateError);
    }
  } else {
    // Create a new ledger entry for this receipt
    const { error: ledgerInsertError } = await supabase
      .from("fin_ledger_entries")
      .insert({
        type: "RECEITA",
        description: receivableData?.description || `Recebimento - ${receivableData?.customer_name || "Cliente"}`,
        amount: receiptAmount,
        competence_date: receivableData?.competence_date || receiptDate,
        cash_date: receiptDate,
        bank_account_id: bankAccountId,
        chart_account_id: receivableData?.chart_account_id || null,
        cost_center_id: receivableData?.cost_center_id || null,
        project_id: receivableData?.project_id || null,
        party_id: receivableData?.customer_id || null,
        party_type: "client",
        status: "PAGO_RECEBIDO",
      });

    if (ledgerInsertError) throw ledgerInsertError;
  }

  return { success: true };
}

/**
 * Mark ledger entries as reconciled and update linked payables/receivables
 */
export async function reconcileWithSync(
  entryIds: string[],
  bankTransactionId?: string | null,
  reconcileDate?: string
) {
  // Update ledger entries
  const updateData: any = { reconciled: true };
  if (reconcileDate) {
    updateData.cash_date = reconcileDate;
  }

  const { error: ledgerError } = await supabase
    .from("fin_ledger_entries")
    .update(updateData)
    .in("id", entryIds);

  if (ledgerError) throw ledgerError;

  // Update linked payables
  const { error: payableError } = await supabase
    .from("fin_payables")
    .update({ reconciled: true })
    .in("ledger_entry_id", entryIds);

  if (payableError) {
    console.error("Error updating linked payables:", payableError);
  }

  // Update linked receivables
  const { error: receivableError } = await supabase
    .from("fin_receivables")
    .update({ reconciled: true })
    .in("ledger_entry_id", entryIds);

  if (receivableError) {
    console.error("Error updating linked receivables:", receivableError);
  }

  // If bank transaction provided, create reconciliation links
  if (bankTransactionId) {
    await supabase
      .from("fin_bank_transactions")
      .update({ status: "CONCILIADA" })
      .eq("id", bankTransactionId);

    const links = entryIds.map((entryId) => ({
      bank_transaction_id: bankTransactionId,
      ledger_entry_id: entryId,
      match_type: "MANUAL" as const,
    }));

    await supabase.from("fin_reconciliation_links").insert(links);
  }

  return { success: true };
}

/**
 * Bulk update payables status and sync with linked ledger entries
 */
export async function bulkUpdatePayablesWithSync(
  payableIds: string[],
  newStatus: string
) {
  // First, get the payables with their ledger_entry_ids
  const { data: payables, error: fetchError } = await supabase
    .from("fin_payables")
    .select("id, ledger_entry_id")
    .in("id", payableIds);

  if (fetchError) throw fetchError;

  // Update payables status
  const { error: updateError } = await supabase
    .from("fin_payables")
    .update({ status: newStatus })
    .in("id", payableIds);

  if (updateError) throw updateError;

  // Get linked ledger entry IDs (filter out nulls)
  const ledgerEntryIds = payables
    ?.map(p => p.ledger_entry_id)
    .filter((id): id is string => id !== null) || [];

  // Map payable status to ledger entry status
  const ledgerStatus = newStatus === "PAGO" ? "PAGO_RECEBIDO" : 
                       newStatus === "CANCELADO" ? "CANCELADO" : "ABERTO";

  // Update linked ledger entries
  if (ledgerEntryIds.length > 0) {
    await supabase
      .from("fin_ledger_entries")
      .update({ status: ledgerStatus })
      .in("id", ledgerEntryIds);
  }

  return { success: true, updatedCount: payableIds.length };
}

/**
 * Bulk delete payables (keeps linked ledger entries)
 */
export async function bulkDeletePayablesWithSync(payableIds: string[]) {
  // First, get the payables with their ledger_entry_ids
  const { data: payables, error: fetchError } = await supabase
    .from("fin_payables")
    .select("id, ledger_entry_id")
    .in("id", payableIds);

  if (fetchError) throw fetchError;

  // Get linked ledger entry IDs (filter out nulls)
  const ledgerEntryIds = payables
    ?.map(p => p.ledger_entry_id)
    .filter((id): id is string => id !== null) || [];

  // Remove link from ledger entries before deleting payables
  if (ledgerEntryIds.length > 0) {
    await supabase
      .from("fin_ledger_entries")
      .update({ status: "CANCELADO" })
      .in("id", ledgerEntryIds);
  }

  // Delete payables only (keep ledger entries)
  const { error: deletePayablesError } = await supabase
    .from("fin_payables")
    .delete()
    .in("id", payableIds);

  if (deletePayablesError) throw deletePayablesError;

  return { success: true, deletedCount: payableIds.length };
}

/**
 * Bulk update receivables status and sync with linked ledger entries
 */
export async function bulkUpdateReceivablesWithSync(
  receivableIds: string[],
  newStatus: string
) {
  // First, get the receivables with their ledger_entry_ids
  const { data: receivables, error: fetchError } = await supabase
    .from("fin_receivables")
    .select("id, ledger_entry_id")
    .in("id", receivableIds);

  if (fetchError) throw fetchError;

  // Update receivables status
  const { error: updateError } = await supabase
    .from("fin_receivables")
    .update({ status: newStatus })
    .in("id", receivableIds);

  if (updateError) throw updateError;

  // Get linked ledger entry IDs (filter out nulls)
  const ledgerEntryIds = receivables
    ?.map(r => r.ledger_entry_id)
    .filter((id): id is string => id !== null) || [];

  // Map receivable status to ledger entry status
  const ledgerStatus = newStatus === "RECEBIDO" ? "PAGO_RECEBIDO" : 
                       newStatus === "CANCELADO" ? "CANCELADO" : "ABERTO";

  // Update linked ledger entries
  if (ledgerEntryIds.length > 0) {
    await supabase
      .from("fin_ledger_entries")
      .update({ status: ledgerStatus })
      .in("id", ledgerEntryIds);
  }

  return { success: true, updatedCount: receivableIds.length };
}

/**
 * Bulk delete receivables (keeps linked ledger entries)
 */
export async function bulkDeleteReceivablesWithSync(receivableIds: string[]) {
  // First, get the receivables with their ledger_entry_ids
  const { data: receivables, error: fetchError } = await supabase
    .from("fin_receivables")
    .select("id, ledger_entry_id")
    .in("id", receivableIds);

  if (fetchError) throw fetchError;

  // Get linked ledger entry IDs (filter out nulls)
  const ledgerEntryIds = receivables
    ?.map(r => r.ledger_entry_id)
    .filter((id): id is string => id !== null) || [];

  // Update linked ledger entries to cancelled status (keep them)
  if (ledgerEntryIds.length > 0) {
    await supabase
      .from("fin_ledger_entries")
      .update({ status: "CANCELADO" })
      .in("id", ledgerEntryIds);
  }

  // Delete receivables only (keep ledger entries)
  const { error: deleteReceivablesError } = await supabase
    .from("fin_receivables")
    .delete()
    .in("id", receivableIds);

  if (deleteReceivablesError) throw deleteReceivablesError;

  return { success: true, deletedCount: receivableIds.length };
}
