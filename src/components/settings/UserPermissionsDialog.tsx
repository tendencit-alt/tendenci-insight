import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, User } from 'lucide-react';

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userName?: string;
  onSuccess: () => void;
}

export function UserPermissionsDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
  onSuccess,
}: UserPermissionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<'master' | 'vendedor'>('vendedor');
  const [permissions, setPermissions] = useState({
    acesso_leads: true,
    acesso_arquitetos: true,
    acesso_projetos: true,
    acesso_crm_kanban: true,
    acesso_metas: true,
    acesso_configuracoes: false,
  });

  useEffect(() => {
    if (open && userId) {
      fetchPermissions();
    }
  }, [open, userId]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tendenci_user_permissions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRole(data.role as 'master' | 'vendedor');
        setPermissions({
          acesso_leads: data.acesso_leads,
          acesso_arquitetos: data.acesso_arquitetos,
          acesso_projetos: data.acesso_projetos,
          acesso_crm_kanban: data.acesso_crm_kanban,
          acesso_metas: data.acesso_metas,
          acesso_configuracoes: data.acesso_configuracoes,
        });
      }
    } catch (error) {
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

  const handleSave = async () => {
    try {
      setSaving(true);

      const permissionsData = {
        user_id: userId,
        role,
        ...permissions,
        acesso_configuracoes: role === 'master' ? true : false,
      };

      const { error } = await supabase
        .from('tendenci_user_permissions')
        .upsert(permissionsData, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: '✅ Permissões atualizadas',
        description: 'As permissões do usuário foram atualizadas com sucesso.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
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

  const isMaster = role === 'master';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Gerenciar Permissões
          </DialogTitle>
          <DialogDescription>
            Configure as permissões de acesso para {userName || userEmail}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Função */}
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Função no Sistema
              </Label>
              <Select value={role} onValueChange={(value) => setRole(value as 'master' | 'vendedor')}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Master (Administrador Total)
                    </div>
                  </SelectItem>
                  <SelectItem value="vendedor">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Vendedor (Acesso Limitado)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {isMaster && (
                <p className="text-xs text-muted-foreground">
                  Masters têm acesso completo a todos os módulos automaticamente.
                </p>
              )}
            </div>

            {/* Permissões de Módulos */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Permissões de Acesso aos Módulos</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <Label htmlFor="leads" className="font-medium">📊 Leads</Label>
                    <p className="text-xs text-muted-foreground">
                      {isMaster ? 'Acesso total a todos os leads' : 'Acesso apenas aos seus leads'}
                    </p>
                  </div>
                  <Switch
                    id="leads"
                    checked={isMaster || permissions.acesso_leads}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, acesso_leads: checked })
                    }
                    disabled={isMaster}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <Label htmlFor="arquitetos" className="font-medium">👷 Arquitetos</Label>
                    <p className="text-xs text-muted-foreground">
                      {isMaster ? 'Acesso total a todos os arquitetos' : 'Acesso apenas aos seus arquitetos'}
                    </p>
                  </div>
                  <Switch
                    id="arquitetos"
                    checked={isMaster || permissions.acesso_arquitetos}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, acesso_arquitetos: checked })
                    }
                    disabled={isMaster}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <Label htmlFor="projetos" className="font-medium">📁 Projetos</Label>
                    <p className="text-xs text-muted-foreground">
                      {isMaster ? 'Acesso total a todos os projetos' : 'Acesso apenas aos seus projetos'}
                    </p>
                  </div>
                  <Switch
                    id="projetos"
                    checked={isMaster || permissions.acesso_projetos}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, acesso_projetos: checked })
                    }
                    disabled={isMaster}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <Label htmlFor="crm" className="font-medium">💼 CRM Kanban</Label>
                    <p className="text-xs text-muted-foreground">
                      {isMaster ? 'Acesso total ao CRM' : 'Acesso apenas aos seus negócios'}
                    </p>
                  </div>
                  <Switch
                    id="crm"
                    checked={isMaster || permissions.acesso_crm_kanban}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, acesso_crm_kanban: checked })
                    }
                    disabled={isMaster}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <Label htmlFor="metas" className="font-medium">🎯 Metas</Label>
                    <p className="text-xs text-muted-foreground">
                      {isMaster ? 'Gestão completa de metas' : 'Acompanhamento de metas pessoais'}
                    </p>
                  </div>
                  <Switch
                    id="metas"
                    checked={isMaster || permissions.acesso_metas}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, acesso_metas: checked })
                    }
                    disabled={isMaster}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card bg-muted/30">
                  <div>
                    <Label htmlFor="config" className="font-medium">⚙️ Configurações</Label>
                    <p className="text-xs text-muted-foreground">
                      Acesso exclusivo para Masters
                    </p>
                  </div>
                  <Switch
                    id="config"
                    checked={isMaster}
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Permissões
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
