import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, RotateCcw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { describeError } from '@/lib/errorMessage';
import { ALL_TREE_MODULES } from '@/config/menuPermissionMap';

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
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

// IMPORTANTE: deve espelhar exatamente ProfileTypePermissionsDialog
const ALL_MODULES = Array.from(new Set([...ALL_TREE_MODULES, 'dashboard'])) as string[];

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Hoje',
  dashboard_executivo: 'Dashboard Executivo', comercial: 'Comercial', operacional: 'Operacional',
  financeiro: 'Financeiro', controladoria: 'Controladoria', planejamento: 'Planejamento',
  cadastros: 'Cadastros', relatorios_bi: "KPI's & BI", configuracoes: 'Configurações',
  producao: 'Produção (legado)', estoque: 'Estoque', pedidos: 'Pedidos', cadastros_financeiros: 'Cadastros Financeiros',
};

const PERMISSION_COLUMNS = [
  { key: 'can_view', label: 'Ver', description: 'Leitura e exportação',
    flags: ['can_view', 'can_export'] as (keyof ModulePermission)[] },
  { key: 'can_create', label: 'Criar', description: 'Adicionar novos',
    flags: ['can_create'] as (keyof ModulePermission)[] },
  { key: 'can_edit', label: 'Editar', description: 'Alterar / aprovar / conciliar',
    flags: ['can_edit', 'can_approve', 'can_conciliate'] as (keyof ModulePermission)[] },
  { key: 'can_delete', label: 'Excluir', description: 'Remover e ações críticas',
    flags: ['can_delete', 'can_admin'] as (keyof ModulePermission)[] },
] as const;

const emptyPerm = (): ModulePermission => ({
  can_view: false, can_create: false, can_edit: false, can_delete: false,
  can_approve: false, can_conciliate: false, can_export: false, can_admin: false,
});
const fullPerm = (): ModulePermission => ({
  can_view: true, can_create: true, can_edit: true, can_delete: true,
  can_approve: true, can_conciliate: true, can_export: true, can_admin: true,
});

interface ModuleState {
  inherited: ModulePermission;   // from profile type (read-only baseline)
  override: ModulePermission;    // current override values
  hasOverride: boolean;          // override active?
  overrideId?: string;           // existing row id, if any
  dirty: boolean;
}

export function UserPermissionsDialog({
  open, onOpenChange, userId, userEmail, userName, onSuccess,
}: UserPermissionsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<Record<string, ModuleState>>({});
  const [userRole, setUserRole] = useState<string>('');
  const [profileTypeName, setProfileTypeName] = useState<string>('');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAll = async () => {
      if (!userId || !open) return;
      setLoading(true);
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, profile_type_id, tenant_id')
          .eq('id', userId)
          .single();
        if (profileError) throw profileError;
        setUserRole(profile.role);
        setTenantId((profile as any).tenant_id || null);

        if (profile.role === 'admin') {
          const m: Record<string, ModuleState> = {};
          ALL_MODULES.forEach(mod => {
            m[mod] = { inherited: fullPerm(), override: fullPerm(), hasOverride: false, dirty: false };
          });
          setState(m);
          setLoading(false);
          return;
        }

        let typeName = '';
        let ptRows: any[] = [];
        if (profile.profile_type_id) {
          const [{ data: pt }, { data: perms }] = await Promise.all([
            supabase.from('profile_types').select('display_name,name').eq('id', profile.profile_type_id).maybeSingle(),
            supabase.from('profile_type_permissions').select('*').eq('profile_type_id', profile.profile_type_id),
          ]);
          typeName = pt?.display_name || pt?.name || '';
          ptRows = perms || [];
        }
        setProfileTypeName(typeName);

        const { data: ovRows } = await supabase
          .from('user_permission_overrides' as any)
          .select('*')
          .eq('user_id', userId);

        const map: Record<string, ModuleState> = {};
        ALL_MODULES.forEach(mod => {
          const ptRow = ptRows.find((p: any) => p.module === mod);
          const inherited: ModulePermission = ptRow ? {
            can_view: !!ptRow.can_view, can_create: !!ptRow.can_create, can_edit: !!ptRow.can_edit,
            can_delete: !!ptRow.can_delete, can_approve: !!ptRow.can_approve,
            can_conciliate: !!ptRow.can_conciliate, can_export: !!ptRow.can_export, can_admin: !!ptRow.can_admin,
          } : emptyPerm();
          const ovRow: any = (ovRows as any[] | null || []).find((o: any) => o.module === mod);
          const override: ModulePermission = ovRow ? {
            can_view: !!ovRow.can_view, can_create: !!ovRow.can_create, can_edit: !!ovRow.can_edit,
            can_delete: !!ovRow.can_delete, can_approve: !!ovRow.can_approve,
            can_conciliate: !!ovRow.can_conciliate, can_export: !!ovRow.can_export, can_admin: !!ovRow.can_admin,
          } : { ...inherited };
          map[mod] = {
            inherited,
            override,
            hasOverride: !!ovRow?.has_override,
            overrideId: ovRow?.id,
            dirty: false,
          };
        });
        setState(map);
      } catch (error: any) {
        console.error('Erro ao buscar permissões:', error);
        toast({
          title: 'Erro',
          description: describeError('Não foi possível carregar as permissões do usuário', error),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userId, open, toast]);

  const effective = (mod: string): ModulePermission => {
    const s = state[mod];
    if (!s) return emptyPerm();
    return s.hasOverride ? s.override : s.inherited;
  };

  const isColumnChecked = (mod: string, flags: readonly (keyof ModulePermission)[]) => {
    const p = effective(mod);
    return flags.every(f => p[f]);
  };

  const toggleOverride = (mod: string, enabled: boolean) => {
    setState(prev => {
      const s = prev[mod];
      if (!s) return prev;
      return {
        ...prev,
        [mod]: {
          ...s,
          hasOverride: enabled,
          // ao ativar pela 1ª vez, inicia a partir do herdado
          override: enabled && !s.dirty && !s.overrideId ? { ...s.inherited } : s.override,
          dirty: true,
        },
      };
    });
  };

  const toggleColumn = (mod: string, flags: readonly (keyof ModulePermission)[]) => {
    setState(prev => {
      const s = prev[mod];
      if (!s || !s.hasOverride) return prev;
      const current = flags.every(f => s.override[f]);
      const next = { ...s.override };
      flags.forEach(f => { (next as any)[f] = !current; });
      return { ...prev, [mod]: { ...s, override: next, dirty: true } };
    });
  };

  const resetModule = (mod: string) => {
    setState(prev => {
      const s = prev[mod];
      if (!s) return prev;
      return { ...prev, [mod]: { ...s, hasOverride: false, override: { ...s.inherited }, dirty: true } };
    });
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const toUpsert: any[] = [];
      const toDelete: string[] = [];

      for (const mod of ALL_MODULES) {
        const s = state[mod];
        if (!s || !s.dirty) continue;
        if (s.hasOverride) {
          toUpsert.push({
            user_id: userId,
            tenant_id: tenantId,
            module: mod,
            has_override: true,
            ...s.override,
          });
        } else if (s.overrideId) {
          toDelete.push(s.overrideId);
        }
      }

      if (toUpsert.length) {
        const { error } = await supabase
          .from('user_permission_overrides' as any)
          .upsert(toUpsert, { onConflict: 'user_id,module' });
        if (error) throw error;
      }
      if (toDelete.length) {
        const { error } = await supabase
          .from('user_permission_overrides' as any)
          .delete()
          .in('id', toDelete);
        if (error) throw error;
      }

      toast({ title: 'Permissões atualizadas', description: 'Overrides salvos com sucesso.' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: describeError('Não foi possível salvar os overrides', error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const anyDirty = Object.values(state).some(s => s.dirty);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões de {userName || userEmail}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
          <p>
            As permissões padrão vêm do <strong>Tipo de Perfil</strong>
            {profileTypeName ? <> <strong>"{profileTypeName}"</strong></> : null}.
            Para casos pontuais, ative o <strong>Override</strong> em um módulo e ajuste as colunas.
          </p>
          <p>
            A estrutura (Ver, Criar, Editar, Excluir) é idêntica à de Tipos de Perfil para evitar
            divergências de avaliação. Sem override, o usuário herda do perfil — mantendo a padronização.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : userRole === 'admin' ? (
          <div className="py-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
            <p className="text-lg font-semibold mb-2">Usuário Administrador</p>
            <p className="text-muted-foreground">
              Este usuário tem acesso total a todos os módulos. Overrides não se aplicam.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Módulo</th>
                    <th className="text-center p-3 font-medium w-40">
                      <div>Override</div>
                      <div className="text-[10px] font-normal text-muted-foreground">
                        Personalizar este usuário
                      </div>
                    </th>
                    {PERMISSION_COLUMNS.map(col => (
                      <th key={col.key} className="text-center p-3 font-medium">
                        <div>{col.label}</div>
                        <div className="text-[10px] font-normal text-muted-foreground">
                          {col.description}
                        </div>
                      </th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {ALL_MODULES.map((mod, idx) => {
                    const s = state[mod];
                    const overrideOn = !!s?.hasOverride;
                    return (
                      <tr key={mod} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2">
                            {MODULE_LABELS[mod]}
                            {overrideOn ? (
                              <Badge variant="outline" className="text-[9px] border-primary text-primary">
                                Override
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px]">Herdado</Badge>
                            )}
                          </div>
                        </td>
                        <td className="text-center p-3">
                          <Switch
                            checked={overrideOn}
                            onCheckedChange={(v) => toggleOverride(mod, v)}
                          />
                        </td>
                        {PERMISSION_COLUMNS.map(col => (
                          <td key={col.key} className="text-center p-3">
                            <Checkbox
                              checked={isColumnChecked(mod, col.flags)}
                              disabled={!overrideOn}
                              onCheckedChange={() => toggleColumn(mod, col.flags)}
                            />
                          </td>
                        ))}
                        <td className="text-center p-2">
                          {overrideOn && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Voltar ao herdado"
                              onClick={() => resetModule(mod)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              <strong>Ver</strong> inclui exportação; <strong>Editar</strong> inclui aprovar e conciliar;{' '}
              <strong>Excluir</strong> inclui ações administrativas críticas. As mesmas regras se aplicam
              em Tipos de Perfil — overrides apenas substituem o módulo correspondente do usuário.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          {userRole !== 'admin' && (
            <Button onClick={handleSave} disabled={saving || !anyDirty}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar overrides
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
