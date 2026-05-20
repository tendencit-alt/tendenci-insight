import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Eye, Plus, Edit, Trash } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { AppModule } from '@/hooks/usePermissions';

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  onSuccess: () => void;
}

interface ModulePermissions {
  module: AppModule;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const MODULE_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'configuracoes': 'Configurações',
  'gestao_usuarios': 'Gestão de Usuários',
  'producao': 'Produção',
  'fornecedores': 'Fornecedores',
  'estoque': 'Estoque',
  'pedidos': 'Pedidos',
  'financeiro': 'Financeiro',
  'cadastros_financeiros': 'Cadastros Financeiros',
  'dashboard_executivo': 'Dashboard Executivo',
  'comercial': 'Comercial',
  'operacional': 'Operacional',
  'controladoria': 'Controladoria',
  'planejamento': 'Planejamento',
  'cadastros': 'Cadastros',
  'relatorios_bi': 'Relatórios & BI',
};

const ALL_MODULES: AppModule[] = [
  'dashboard',
  'dashboard_executivo',
  'comercial',
  'operacional',
  'producao',
  'pedidos',
  'financeiro',
  'controladoria',
  'planejamento',
  'cadastros',
  'cadastros_financeiros',
  'relatorios_bi',
  'fornecedores',
  'estoque',
  'configuracoes',
  'gestao_usuarios',
];

export function UserPermissionsDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
  onSuccess
}: UserPermissionsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<ModulePermissions[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [targetTenantId, setTargetTenantId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!userId || !open) return;

      setLoading(true);
      try {
        // Buscar role + tipo de perfil do usuário
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, profile_type_id, tenant_id')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        setUserRole(profile.role);
        setTargetTenantId((profile as any).tenant_id ?? null);

        // Se for admin, não precisa buscar permissões
        if (profile.role === 'admin') {
          setPermissions(
            ALL_MODULES.map(module => ({
              module,
              can_view: true,
              can_create: true,
              can_edit: true,
              can_delete: true
            }))
          );
          setLoading(false);
          return;
        }

        // Buscar permissões individuais do usuário
        const { data: userPerms, error } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;

        // Fallback: se o usuário ainda não tem permissões individuais,
        // espelhar o template do tipo de perfil dele para refletir o acesso
        // herdado (e permitir salvar como override).
        let templatePerms: any[] = [];
        if ((!userPerms || userPerms.length === 0) && profile.profile_type_id) {
          const { data: tpl } = await supabase
            .from('profile_type_permissions')
            .select('*')
            .eq('profile_type_id', profile.profile_type_id);
          templatePerms = tpl || [];
        }

        const baseSource = (userPerms && userPerms.length > 0) ? userPerms : templatePerms;

        // Garantir que todos os módulos estejam presentes
        const allPermissions = ALL_MODULES.map(module => {
          const existing = baseSource.find((p: any) => p.module === module);
          return existing || {
            module,
            can_view: false,
            can_create: false,
            can_edit: false,
            can_delete: false
          };
        });

        setPermissions(allPermissions as ModulePermissions[]);
      } catch (error: any) {
        console.error('Erro ao buscar permissões:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as permissões do usuário.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, [userId, open, toast]);

  const handlePermissionChange = (
    module: AppModule,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    setPermissions(prev =>
      prev.map(p =>
        p.module === module ? { ...p, [field]: value } : p
      )
    );
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      // Se for admin, não salvar permissões
      if (userRole === 'admin') {
        toast({
          title: 'Aviso',
          description: 'Administradores têm todas as permissões automaticamente.',
        });
        onSuccess();
        onOpenChange(false);
        return;
      }

      // Deletar permissões existentes
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Inserir novas permissões (cast para any devido ao tipo gerado do Supabase não incluir novos módulos ainda)
      const { error } = await supabase
        .from('user_permissions')
        .insert(
          permissions.map(p => ({
            user_id: userId,
            module: p.module as any,
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete
          }))
        );

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Permissões atualizadas com sucesso!',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar permissões:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as permissões.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões de {userName || userEmail}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : userRole === 'admin' ? (
          <div className="py-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
            <p className="text-lg font-semibold mb-2">Usuário Administrador</p>
            <p className="text-muted-foreground">
              Este usuário tem acesso total a todos os módulos do sistema.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {permissions.map((perm) => (
                <div key={perm.module} className="space-y-3">
                  <div className="font-medium text-sm">
                    {MODULE_LABELS[perm.module]}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${perm.module}-view`}
                        checked={perm.can_view}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(perm.module, 'can_view', checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`${perm.module}-view`}
                        className="text-sm font-normal cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Visualizar
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${perm.module}-create`}
                        checked={perm.can_create}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(perm.module, 'can_create', checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`${perm.module}-create`}
                        className="text-sm font-normal cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Criar
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${perm.module}-edit`}
                        checked={perm.can_edit}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(perm.module, 'can_edit', checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`${perm.module}-edit`}
                        className="text-sm font-normal cursor-pointer flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Editar
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${perm.module}-delete`}
                        checked={perm.can_delete}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(perm.module, 'can_delete', checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`${perm.module}-delete`}
                        className="text-sm font-normal cursor-pointer flex items-center gap-1"
                      >
                        <Trash className="h-3 w-3" />
                        Deletar
                      </Label>
                    </div>
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || userRole === 'admin'}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
