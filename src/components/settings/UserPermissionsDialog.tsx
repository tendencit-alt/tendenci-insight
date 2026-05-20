import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { describeError } from '@/lib/errorMessage';

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
// para evitar conflito/confusão entre as duas telas.
const ALL_MODULES = [
  'dashboard_executivo', 'comercial', 'operacional', 'financeiro',
  'controladoria', 'planejamento', 'cadastros', 'relatorios_bi', 'configuracoes',
];

const MODULE_LABELS: Record<string, string> = {
  dashboard_executivo: 'Dashboard Executivo', comercial: 'Comercial', operacional: 'Operacional',
  financeiro: 'Financeiro', controladoria: 'Controladoria', planejamento: 'Planejamento',
  cadastros: 'Cadastros', relatorios_bi: 'Relatórios & BI', configuracoes: 'Configurações',
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

export function UserPermissionsDialog({
  open, onOpenChange, userId, userEmail, userName,
}: UserPermissionsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, ModulePermission>>({});
  const [userRole, setUserRole] = useState<string>('');
  const [profileTypeName, setProfileTypeName] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!userId || !open) return;
      setLoading(true);
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, profile_type_id')
          .eq('id', userId)
          .single();
        if (profileError) throw profileError;
        setUserRole(profile.role);

        if (profile.role === 'admin') {
          const m: Record<string, ModulePermission> = {};
          ALL_MODULES.forEach(mod => { m[mod] = fullPerm(); });
          setPermissions(m);
          setLoading(false);
          return;
        }

        let typeName = '';
        let rows: any[] = [];
        if (profile.profile_type_id) {
          const [{ data: pt }, { data: perms }] = await Promise.all([
            supabase.from('profile_types').select('display_name,name').eq('id', profile.profile_type_id).maybeSingle(),
            supabase.from('profile_type_permissions').select('*').eq('profile_type_id', profile.profile_type_id),
          ]);
          typeName = pt?.display_name || pt?.name || '';
          rows = perms || [];
        }
        setProfileTypeName(typeName);

        const map: Record<string, ModulePermission> = {};
        ALL_MODULES.forEach(mod => {
          const r = rows.find((p: any) => p.module === mod);
          map[mod] = r ? {
            can_view: !!r.can_view, can_create: !!r.can_create, can_edit: !!r.can_edit,
            can_delete: !!r.can_delete, can_approve: !!r.can_approve,
            can_conciliate: !!r.can_conciliate, can_export: !!r.can_export, can_admin: !!r.can_admin,
          } : emptyPerm();
        });
        setPermissions(map);
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
    fetchUserPermissions();
  }, [userId, open, toast]);

  const isColumnChecked = (mod: string, flags: readonly (keyof ModulePermission)[]) => {
    const p = permissions[mod];
    if (!p) return false;
    return flags.every(f => p[f]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões de {userName || userEmail}
            <span className="ml-2 text-xs font-normal text-muted-foreground border border-border rounded px-2 py-0.5">
              Somente leitura
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          As permissões abaixo são herdadas do <strong>Tipo de Perfil</strong>
          {profileTypeName ? <> <strong>"{profileTypeName}"</strong></> : null}.
          Para alterá-las, edite o tipo de perfil em{' '}
          <strong>Configurações → Tipos de Perfil</strong>. A estrutura e os agrupamentos
          (Ver, Criar, Editar, Excluir) são idênticos aos da tela de edição, para evitar
          divergências de avaliação.
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
              Este usuário tem acesso total a todos os módulos do sistema.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Módulo</th>
                    {PERMISSION_COLUMNS.map(col => (
                      <th key={col.key} className="text-center p-3 font-medium">
                        <div>{col.label}</div>
                        <div className="text-[10px] font-normal text-muted-foreground">
                          {col.description}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_MODULES.map((mod, idx) => (
                    <tr key={mod} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-3 font-medium">{MODULE_LABELS[mod]}</td>
                      {PERMISSION_COLUMNS.map(col => (
                        <td key={col.key} className="text-center p-3">
                          <Checkbox checked={isColumnChecked(mod, col.flags)} disabled />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Os agrupamentos refletem as mesmas regras aplicadas no backend: <strong>Ver</strong> inclui
              exportação; <strong>Editar</strong> inclui aprovar e conciliar; <strong>Excluir</strong> inclui
              ações administrativas críticas.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
