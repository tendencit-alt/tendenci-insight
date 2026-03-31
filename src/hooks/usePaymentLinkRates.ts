import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePaymentLinkRates() {
  const { data } = useQuery({
    queryKey: ['payment-link-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_link_rates')
        .select('installments, rate_percent')
        .eq('active', true)
        .order('installments');
      if (error) throw error;
      const map: Record<number, number> = {};
      data?.forEach(r => { map[r.installments] = Number(r.rate_percent); });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  return data || {};
}
