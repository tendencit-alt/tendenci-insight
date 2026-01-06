import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProfileType {
  id: string;
  name: string;
  display_name: string;
  is_system: boolean;
}

interface ProfileTypePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileType: ProfileType;
  onSuccess: () => void;
}

interface ModulePermission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const ALL_MODULES = [
  'dashboard',
  'crm',
  'leads',
  'architects',
  'projects',
  'production',
  'orders',
  'inventory',
  'suppliers',
  'purchases',
  'goals',
  'activities',
  'prospeccao',
  'settings',
  'ia',
  'catalogo',
  'fichas_tecnicas',
];

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  crm: 'CRM Clientes',
  leads: 'Leads',
  architects: 'Arquitetos',
  projects: 'Projetos',
  production: 'Produção',
  orders: 'Pedidos',
  inventory: 'Estoque',
  suppliers: 'Fornecedores',
  purchases: 'Compras',
  goals: 'Metas',
  activities: 'Atividades',
  prospeccao: 'Prospecção',
  settings: 'Configurações',
  ia: 'IA',
  catalogo: 'Catálogo',
  fichas_tecnicas: 'Fichas Técnicas',
};

export function ProfileTypePermissionsDialog({
  open,
  onOpenChange,
  profileType,
  onSuccess,
}: ProfileTypePermissionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, ModulePermission>>({});

  useEffect(() => {
    if (open && profileType) {
      fetchPermissions();
    }
  }, [open, profileType]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profile_type_permissions')
        .select('*')
        .eq('profile_type_id', profileType.id);

      if (error) throw error;

      // Converter para objeto
      const permMap: Record<string, ModulePermission> = {};
      ALL_MODULES.forEach(module => {
        const existing = data?.find(p => p.module === module);
        permMap[module] = {
          can_view: existing?.can_view || false,
          can_create: existing?.can_create || false,
          can_edit: existing?.can_edit || false,
          can_delete: existing?.can_delete || false,
        };
      });

      setPermissions(permMap);
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as permissões.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (
    module: string,
    permission: keyof ModulePermission,
    value: boolean
  ) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permission]: value,
      },
    }));
  };

  const handleSelectAllView = () => {
    const newPerms = { ...permissions };
    const allChecked = ALL_MODULES.every(m => permissions[m]?.can_view);
    ALL_MODULES.forEach(module => {
      newPerms[module] = { ...newPerms[module], can_view: !allChecked };
    });
    setPermissions(newPerms);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Deletar permissões existentes
      await supabase
        .from('profile_type_permissions')
        .delete()
        .eq('profile_type_id', profileType.id);

      // Inserir novas permissões
      const permissionsToInsert = ALL_MODULES
        .filter(module => {
          const perm = permissions[module];
          return perm?.can_view || perm?.can_create || perm?.can_edit || perm?.can_delete;
        })
        .map(module => ({
          profile_type_id: profileType.id,
          module,
          can_view: permissions[module]?.can_view || false,
          can_create: permissions[module]?.can_create || false,
          can_edit: permissions[module]?.can_edit || false,
          can_delete: permissions[module]?.can_delete || false,
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('profile_type_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast({
        title: 'Permissões salvas',
        description: `Permissões padrão de "${profileType.display_name}" atualizadas.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar permissões:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar as permissões.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Permissões Padrão - {profileType.display_name}
          </DialogTitle>
          <DialogDescription>
            Configure as permissões padrão para novos usuários deste tipo
          </DialogDescription>
        </DialogHeader>

        {profileType.name === 'admin' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Usuários Master têm acesso total ao sistema, independente das permissões configuradas aqui.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-5 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllView}
                    className="h-auto p-0 text-xs"
                  >
                    Módulo
                  </Button>
                </div>
                <div className="text-center">Visualizar</div>
                <div className="text-center">Criar</div>
                <div className="text-center">Editar</div>
                <div className="text-center">Excluir</div>
              </div>

              {/* Modules */}
              {ALL_MODULES.map(module => (
                <div
                  key={module}
                  className="grid grid-cols-5 gap-4 py-2 border-b border-border/50 items-center"
                >
                  <Label className="font-medium">{MODULE_LABELS[module] || module}</Label>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={permissions[module]?.can_view || false}
                      onCheckedChange={(checked) =>
                        handlePermissionChange(module, 'can_view', !!checked)
                      }
                    />
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={permissions[module]?.can_create || false}
                      onCheckedChange={(checked) =>
                        handlePermissionChange(module, 'can_create', !!checked)
                      }
                    />
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={permissions[module]?.can_edit || false}
                      onCheckedChange={(checked) =>
                        handlePermissionChange(module, 'can_edit', !!checked)
                      }
                    />
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={permissions[module]?.can_delete || false}
                      onCheckedChange={(checked) =>
                        handlePermissionChange(module, 'can_delete', !!checked)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
