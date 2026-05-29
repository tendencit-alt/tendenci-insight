import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Carrega as taxas financeiras configuradas pelo tenant ativo (RLS resolve isolamento)
 * e retorna mapas prontos para serem consumidos por CreateOrderDialog / EditOrderDialog.
 *
 * Estrutura:
 *  - credit[n]                -> taxa% para n parcelas no cartão de crédito (n>=1)
 *  - debit                    -> taxa% à vista do cartão de débito
 *  - link[n]                  -> taxa% para n parcelas no link de pagamento
 *  - boleto[carencia][n]      -> taxa% para boleto (carência em dias x parcelas)
 */
export function useFinanceRates() {
  const { data, isLoading } = useQuery({
    queryKey: ["finance-rates-all"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [creditQ, linkQ, boletoQ] = await Promise.all([
        supabase.from("credit_card_rates").select("installments, rate_percent").eq("active", true),
        supabase.from("payment_link_rates").select("installments, rate_percent").eq("active", true),
        supabase.from("boleto_rates").select("carencia_dias, installments, rate_percent").eq("active", true),
      ]);
      if (creditQ.error) throw creditQ.error;
      if (linkQ.error) throw linkQ.error;
      if (boletoQ.error) throw boletoQ.error;

      const credit: Record<number, number> = {};
      let debit = 0;
      (creditQ.data || []).forEach((r) => {
        const n = r.installments;
        const v = Number(r.rate_percent);
        if (n === 0) debit = v;
        else credit[n] = v;
      });

      const link: Record<number, number> = {};
      (linkQ.data || []).forEach((r) => {
        link[r.installments] = Number(r.rate_percent);
      });

      const boleto: Record<number, Record<number, number>> = {};
      (boletoQ.data || []).forEach((r) => {
        const c = r.carencia_dias ?? 30;
        if (!boleto[c]) boleto[c] = {};
        boleto[c][r.installments] = Number(r.rate_percent);
      });

      return { credit, debit, link, boleto };
    },
  });

  return {
    isLoading,
    credit: data?.credit || {},
    debit: data?.debit ?? 0,
    link: data?.link || {},
    boleto: data?.boleto || {},
  };
}
