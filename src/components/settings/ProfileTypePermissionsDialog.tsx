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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info, Shield, ShieldAlert, Lock } from 'lucide-react';
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
  can_approve: boolean;
  can_conciliate: boolean;
  can_export: boolean;
  can_admin: boolean;
}

interface CriticalPermission {
  permission_key: string;
  permission_label: string;
  permission_group: string;
  allowed: boolean;
}

interface SegregationRule {
  id?: string;
  blocked_action: string;
  blocked_module: string;
  reason: string | null;
  active: boolean;
}

const ALL_MODULES = [
  'dashboard_executivo',
  'comercial',
  'operacional',
  'financeiro',
  'controladoria',
  'planejamento',
  'cadastros',
  'relatorios_bi',
  'configuracoes',
];

const MODULE_LABELS: Record<string, string> = {
  dashboard_executivo: 'Dashboard Executivo',
  comercial: 'Comercial',
  operacional: 'Operacional',
  financeiro: 'Financeiro',
  controladoria: 'Controladoria',
  planejamento: 'Planejamento',
  cadastros: 'Cadastros',
  relatorios_bi: 'Relatórios & BI',
  configuracoes: 'Configurações',
};

const PERMISSION_COLUMNS = [
  { key: 'can_view', label: 'Ver', short: 'V' },
  { key: 'can_create', label: 'Criar', short: 'C' },
  { key: 'can_edit', label: 'Editar', short: 'E' },
  { key: 'can_delete', label: 'Excluir', short: 'X' },
  { key: 'can_approve', label: 'Aprovar', short: 'A' },
  { key: 'can_conciliate', label: 'Conciliar', short: 'Co' },
  { key: 'can_export', label: 'Exportar', short: 'Ex' },
  { key: 'can_admin', label: 'Admin', short: 'Ad' },
] as const;

const CRITICAL_PERMISSIONS = [
  { key: 'editar_plano_contas', label: 'Editar Plano de Contas', group: 'Estrutura' },
  { key: 'excluir_lancamento_conciliado', label: 'Excluir Lançamento Conciliado', group: 'Financeiro' },
  { key: 'editar_lancamento_conciliado', label: 'Editar Lançamento Conciliado', group: 'Financeiro' },
  { key: 'alterar_regra_automatica', label: 'Alterar Regra Automática', group: 'Automação' },
  { key: 'alterar_centro_custo_padrao', label: 'Alterar Centro de Custo Padrão', group: 'Estrutura' },
  { key: 'alterar_meta_global', label: 'Alterar Meta Global', group: 'Planejamento' },
  { key: 'cancelar_pedido_faturado', label: 'Cancelar Pedido Já Faturado', group: 'Comercial' },
  { key: 'reabrir_pedido_encerrado', label: 'Reabrir Pedido Encerrado', group: 'Comercial' },
  { key: 'editar_principal_emprestimo', label: 'Editar Principal de Empréstimo', group: 'Financeiro' },
  { key: 'excluir_log', label: 'Excluir Log de Auditoria', group: 'Auditoria' },
];

const emptyModulePermission = (): ModulePermission => ({
  can_view: false, can_create: false, can_edit: false, can_delete: false,
  can_approve: false, can_conciliate: false, can_export: false, can_admin: false,
});

export function ProfileTypePermissionsDialog({
  open,
  onOpenChange,
  profileType,
  onSuccess,
}: ProfileTypePermissionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('modules');
  const [permissions, setPermissions] = useState<Record<string, ModulePermission>>({});
  const [criticalPerms, setCriticalPerms] = useState<Record<string, boolean>>({});
  const [segregationRules, setSegregationRules] = useState<SegregationRule[]>([]);

  useEffect(() => {
    if (open && profileType) {
      fetchAll();
    }
  }, [open, profileType]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Fetch module permissions
      const { data: modPerms } = await supabase
        .from('profile_type_permissions')
        .select('*')
        .eq('profile_type_id', profileType.id);

      const permMap: Record<string, ModulePermission> = {};
      ALL_MODULES.forEach(module => {
        const existing = modPerms?.find(p => p.module === module);
        permMap[module] = existing ? {
          can_view: existing.can_view || false,
          can_create: existing.can_create || false,
          can_edit: existing.can_edit || false,
          can_delete: existing.can_delete || false,
          can_approve: existing.can_approve || false,
          can_conciliate: existing.can_conciliate || false,
          can_export: existing.can_export || false,
          can_admin: existing.can_admin || false,
        } : emptyModulePermission();
      });
      setPermissions(permMap);

      // Fetch critical permissions
      const { data: critData } = await supabase
        .from('rbac_critical_permissions')
        .select('*')
        .eq('profile_type_id', profileType.id);

      const critMap: Record<string, boolean> = {};
      CRITICAL_PERMISSIONS.forEach(cp => {
        const existing = critData?.find(c => c.permission_key === cp.key);
        critMap[cp.key] = existing?.allowed || false;
      });
      setCriticalPerms(critMap);

      // Fetch segregation rules
      const { data: segData } = await supabase
        .from('rbac_segregation_rules')
        .select('*')
        .eq('profile_type_id', profileType.id);

      setSegregationRules(segData || []);
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (module: string, key: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: { ...prev[module], [key]: value },
    }));
  };

  const handleCriticalChange = (key: string, value: boolean) => {
    setCriticalPerms(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectAll = () => {
    const allChecked = ALL_MODULES.every(m =>
      PERMISSION_COLUMNS.every(col => permissions[m]?.[col.key as keyof ModulePermission])
    );
    const newPerms = { ...permissions };
    ALL_MODULES.forEach(module => {
      const p = emptyModulePermission();
      if (!allChecked) {
        (Object.keys(p) as (keyof ModulePermission)[]).forEach(k => { p[k] = true; });
      }
      newPerms[module] = p;
    });
    setPermissions(newPerms);
  };

  const handleSelectColumn = (colKey: string) => {
    const allChecked = ALL_MODULES.every(m => permissions[m]?.[colKey as keyof ModulePermission]);
    const newPerms = { ...permissions };
    ALL_MODULES.forEach(module => {
      newPerms[module] = { ...newPerms[module], [colKey]: !allChecked };
    });
    setPermissions(newPerms);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Save module permissions
      await supabase.from('profile_type_permissions').delete().eq('profile_type_id', profileType.id);

      const permissionsToInsert = ALL_MODULES
        .filter(module => {
          const perm = permissions[module];
          return Object.values(perm).some(v => v);
        })
        .map(module => ({
          profile_type_id: profileType.id,
          module,
          ...permissions[module],
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase.from('profile_type_permissions').insert(permissionsToInsert);
        if (error) throw error;
      }

      // Save critical permissions
      await supabase.from('rbac_critical_permissions').delete().eq('profile_type_id', profileType.id);

      const critToInsert = CRITICAL_PERMISSIONS.map(cp => ({
        profile_type_id: profileType.id,
        permission_key: cp.key,
        permission_label: cp.label,
        permission_group: cp.group,
        allowed: criticalPerms[cp.key] || false,
      }));

      if (critToInsert.length > 0) {
        const { error } = await supabase.from('rbac_critical_permissions').insert(critToInsert);
        if (error) throw error;
      }

      toast({
        title: 'Permissões salvas',
        description: `Permissões de "${profileType.display_name}" atualizadas com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar permissões:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const isMasterType = profileType.name === 'master' || profileType.name === 'admin' || profileType.name === 'owner' || profileType.name === 'administrador';

  // Group critical perms
  const criticalGroups = CRITICAL_PERMISSIONS.reduce((acc, cp) => {
    if (!acc[cp.group]) acc[cp.group] = [];
    acc[cp.group].push(cp);
    return acc;
  }, {} as Record<string, typeof CRITICAL_PERMISSIONS>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões — {profileType.display_name}
          </DialogTitle>
          <DialogDescription>
            Configure permissões por módulo, ações críticas e segregação de funções
          </DialogDescription>
        </DialogHeader>

        {isMasterType && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Usuários Owner/Admin têm acesso total ao sistema, independente das permissões configuradas aqui.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="modules" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />Módulos
              </TabsTrigger>
              <TabsTrigger value="critical" className="gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />Ações Críticas
              </TabsTrigger>
              <TabsTrigger value="segregation" className="gap-1.5">
                <Lock className="h-3.5 w-3.5" />Segregação
              </TabsTrigger>
            </TabsList>

            {/* MODULES TAB */}
            <TabsContent value="modules" className="mt-3">
              <ScrollArea className="max-h-[50vh] pr-4">
                <div className="space-y-1">
                  <div className="grid gap-1 pb-2 border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wide"
                    style={{ gridTemplateColumns: '1fr repeat(8, 50px)' }}>
                    <div>
                      <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}
                        className="h-auto p-0 text-[10px] hover:text-foreground uppercase">
                        Módulo
                      </Button>
                    </div>
                    {PERMISSION_COLUMNS.map(col => (
                      <div key={col.key} className="text-center">
                        <Button type="button" variant="ghost" size="sm"
                          onClick={() => handleSelectColumn(col.key)}
                          className="h-auto p-0 text-[10px] hover:text-foreground" title={col.label}>
                          {col.short}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {ALL_MODULES.map(module => (
                    <div key={module}
                      className="grid gap-1 py-2 border-b border-border/50 items-center"
                      style={{ gridTemplateColumns: '1fr repeat(8, 50px)' }}>
                      <Label className="font-medium text-sm">{MODULE_LABELS[module] || module}</Label>
                      {PERMISSION_COLUMNS.map(col => (
                        <div key={col.key} className="flex justify-center">
                          <Checkbox
                            checked={permissions[module]?.[col.key as keyof ModulePermission] || false}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(module, col.key, !!checked)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* CRITICAL PERMISSIONS TAB */}
            <TabsContent value="critical" className="mt-3">
              <ScrollArea className="max-h-[50vh] pr-4">
                <div className="space-y-4">
                  {Object.entries(criticalGroups).map(([group, perms]) => (
                    <div key={group}>
                      <Badge variant="outline" className="mb-2 text-[10px]">{group}</Badge>
                      <div className="space-y-1">
                        {perms.map(cp => (
                          <div key={cp.key} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-accent/30">
                            <Label className="text-sm font-medium cursor-pointer">{cp.label}</Label>
                            <Checkbox
                              checked={criticalPerms[cp.key] || false}
                              onCheckedChange={(checked) => handleCriticalChange(cp.key, !!checked)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* SEGREGATION TAB */}
            <TabsContent value="segregation" className="mt-3">
              <ScrollArea className="max-h-[50vh] pr-4">
                {segregationRules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhuma regra de segregação configurada para este perfil.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {segregationRules.map((rule, i) => (
                      <div key={rule.id || i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-destructive/5">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-[10px]">{rule.blocked_action}</Badge>
                            <Badge variant="outline" className="text-[10px]">{rule.blocked_module}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{rule.reason || 'Sem justificativa'}</p>
                        </div>
                        <Badge variant={rule.active ? 'destructive' : 'secondary'} className="text-[10px]">
                          {rule.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
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
