import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanySettings {
  id: string;
  company_name: string;
  trade_name: string;
  cnpj: string;
  razao_social: string;
  inscricao_estadual: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  phone: string;
  email: string;
  address: string;
  website: string;
}

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CompanySettings | null;
    },
    staleTime: 1000 * 60 * 10, // 10 min cache
  });
}

export function useCompanyName() {
  const { data } = useCompanySettings();
  return data?.trade_name || data?.company_name || 'Empresa';
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<CompanySettings>) => {
      // Get existing row
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update(updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert(updates);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    },
  });
}
