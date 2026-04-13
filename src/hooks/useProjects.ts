import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectOption {
  value: string;
  label: string;
  projectType?: string;
}

export function useProjects() {
  const { data, isLoading } = useQuery({
    queryKey: ['fin-projects-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fin_projects')
        .select('id, name, project_type')
        .eq('status', 'ativo')
        .order('name');
      if (error) throw error;
      return data?.map(p => ({ value: p.id, label: p.name, projectType: p.project_type })) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    projects: data || [],
    isLoading,
  };
}
