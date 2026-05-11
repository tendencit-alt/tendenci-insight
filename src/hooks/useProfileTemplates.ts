import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TemplateFlagSet = {
  can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean;
  can_approve: boolean; can_conciliate: boolean; can_export: boolean; can_admin: boolean;
};

export type TemplatePermissions = Record<string, TemplateFlagSet>;

export interface ProfileTypeTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  permissions: TemplatePermissions;
  is_builtin: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfileTemplates() {
  return useQuery({
    queryKey: ['profile_type_templates'],
    queryFn: async (): Promise<ProfileTypeTemplate[]> => {
      const { data, error } = await supabase
        .from('profile_type_templates')
        .select('*')
        .order('is_builtin', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data || []) as ProfileTypeTemplate[];
    },
  });
}

export function useUpsertProfileTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ProfileTypeTemplate> & {
      name: string;
      permissions: TemplatePermissions;
    }) => {
      if (payload.id) {
        const { error } = await supabase
          .from('profile_type_templates')
          .update({
            name: payload.name,
            description: payload.description ?? null,
            color: payload.color ?? '#7C3AED',
            icon: payload.icon ?? 'user',
            permissions: payload.permissions as any,
          })
          .eq('id', payload.id);
        if (error) throw error;
        return payload.id;
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
          .maybeSingle();
        const { data, error } = await supabase
          .from('profile_type_templates')
          .insert({
            name: payload.name,
            description: payload.description ?? null,
            color: payload.color ?? '#7C3AED',
            icon: payload.icon ?? 'user',
            permissions: payload.permissions as any,
            tenant_id: profile?.tenant_id ?? null,
            is_builtin: false,
            created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
          })
          .select('id')
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile_type_templates'] });
    },
  });
}

export function useDeleteProfileTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('profile_type_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile_type_templates'] });
    },
  });
}
