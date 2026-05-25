import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useActiveTenant';

export interface CostCenterOption {
  value: string;
  label: string;
}

const FALLBACK: CostCenterOption[] = [
  { value: 'Planejados', label: 'Planejados' },
  { value: 'Rustico', label: 'Rústico' },
  { value: 'Industriais', label: 'Industriais' },
  { value: 'Nautico', label: 'Náutico' },
  { value: 'Quadro', label: 'Quadro' },
  { value: 'Revenda', label: 'Revenda' },
];

export function useCostCenters() {
  const { activeTenantId } = useActiveTenant();
  const { data, isLoading } = useQuery({
    queryKey: ['fin-cost-centers-active', activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fin_cost_centers')
        .select('id, name')
        .eq('tenant_id', activeTenantId!)
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data?.map(cc => ({ value: cc.name, label: cc.name })) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    costCenters: data?.length ? data : FALLBACK,
    isLoading,
  };
}
