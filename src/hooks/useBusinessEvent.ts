import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFinanceiroSync } from "./useFinanceiroSync";

export type BusinessEventType =
  | "order_approved"
  | "order_invoiced"
  | "payment_received"
  | "payable_created"
  | "supplier_paid"
  | "recurring_generate"
  | "loan_contracted"
  | "loan_installment_paid"
  | "payroll"
  | "asset_purchased"
  | "depreciation_post"
  | "reconciliation"
  | "goal_created";

interface BusinessEventPayload {
  event_type: BusinessEventType;
  source_table: string;
  source_id: string;
  event_data?: Record<string, any>;
}

export function useBusinessEvent() {
  const [processing, setProcessing] = useState(false);
  const { invalidateAll } = useFinanceiroSync();

  const fireEvent = async (payload: BusinessEventPayload) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("Tenant não encontrado");

      const { data, error } = await supabase.functions.invoke("process-business-event", {
        body: {
          ...payload,
          tenant_id: profile.tenant_id,
          user_id: user.id,
        },
      });

      if (error) throw error;

      invalidateAll();
      return data;
    } catch (e: any) {
      console.error("Business event error:", e);
      toast.error("Erro ao processar evento: " + (e.message || "Erro desconhecido"));
      throw e;
    } finally {
      setProcessing(false);
    }
  };

  // Convenience methods
  const processPaymentReceived = (receivableId: string, data: {
    paid_amount: number;
    paid_date: string;
    interest_amount?: number;
    penalty_amount?: number;
    bank_account_id?: string;
  }) => fireEvent({
    event_type: "payment_received",
    source_table: "fin_receivables",
    source_id: receivableId,
    event_data: { receivable_id: receivableId, ...data },
  });

  const processLoanContracted = (loanId: string) => fireEvent({
    event_type: "loan_contracted",
    source_table: "fin_loan_contracts",
    source_id: loanId,
    event_data: { loan_id: loanId },
  });

  const processLoanInstallmentPaid = (installmentId: string, data: {
    paid_date: string;
    paid_amount?: number;
    bank_account_id?: string;
  }) => fireEvent({
    event_type: "loan_installment_paid",
    source_table: "fin_loan_installments",
    source_id: installmentId,
    event_data: { installment_id: installmentId, ...data },
  });

  const processPayroll = (data: {
    competence_date: string;
    due_date: string;
    items: Array<{
      description: string;
      amount: number;
      department?: string;
      cost_center_id?: string;
      chart_account_id?: string;
    }>;
  }) => fireEvent({
    event_type: "payroll",
    source_table: "fin_business_events",
    source_id: crypto.randomUUID(),
    event_data: data,
  });

  const processAssetPurchased = (data: {
    name: string;
    description?: string;
    category?: string;
    acquisition_date: string;
    acquisition_value: number;
    useful_life_months?: number;
    residual_value?: number;
    treat_as_expense?: boolean;
    chart_account_id?: string;
    cost_center_id?: string;
    project_id?: string;
    supplier_id?: string;
    bank_account_id?: string;
  }) => fireEvent({
    event_type: "asset_purchased",
    source_table: "fin_assets",
    source_id: crypto.randomUUID(),
    event_data: data,
  });

  const processRecurringGenerate = () => fireEvent({
    event_type: "recurring_generate",
    source_table: "fin_recurring_contracts",
    source_id: crypto.randomUUID(),
    event_data: {},
  });

  const processDepreciationPost = (periodDate?: string) => fireEvent({
    event_type: "depreciation_post",
    source_table: "fin_assets",
    source_id: crypto.randomUUID(),
    event_data: { period_date: periodDate },
  });

  return {
    processing,
    fireEvent,
    processPaymentReceived,
    processLoanContracted,
    processLoanInstallmentPaid,
    processPayroll,
    processAssetPurchased,
    processRecurringGenerate,
    processDepreciationPost,
  };
}
