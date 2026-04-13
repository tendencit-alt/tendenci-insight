import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Loader2,
  Plus,
  Users,
} from "lucide-react";

// ===== PERMISSION DEFINITIONS =====
const PERMISSION_GROUPS = [
  {
    group: "Plano de Contas",
    permissions: [
      { key: "chart_edit", label: "Editar plano de contas" },
      { key: "chart_create_root", label: "Criar raízes" },
      { key: "chart_edit_categories", label: "Editar categorias" },
    ],
  },
  {
    group: "Estrutura Financeira",
    permissions: [
      { key: "dre_edit_structure", label: "Editar estrutura DRE" },
      { key: "cashflow_edit_structure", label: "Editar estrutura fluxo" },
      { key: "automation_edit_rules", label: "Editar regras automáticas" },
      { key: "automation_edit_matrix", label: "Editar matriz de automação" },
      { key: "cost_center_edit", label: "Editar centros de custo" },
      { key: "project_edit", label: "Editar projetos" },
    ],
  },
  {
    group: "Operações Financeiras",
    permissions: [
      { key: "payable_create", label: "Lançar contas a pagar" },
      { key: "receivable_create", label: "Lançar contas a receber" },
      { key: "reconcile_bank", label: "Conciliar extrato" },
      { key: "confirm_classification", label: "Confirmar classificação sugerida" },
      { key: "edit_due_dates", label: "Editar vencimentos" },
      { key: "execute_splits", label: "Executar rateios" },
      { key: "edit_loan_principal", label: "Editar financiamento principal" },
    ],
  },
  {
    group: "Visualização",
    permissions: [
      { key: "view_dre_full", label: "Visualizar DRE completa" },
      { key: "view_cashflow_full", label: "Visualizar fluxo completo" },
      { key: "view_bi_executive", label: "Visualizar BI executivo" },
      { key: "view_goals", label: "Visualizar metas" },
      { key: "view_comparisons", label: "Visualizar comparativos" },
      { key: "view_projections", label: "Visualizar projeções" },
      { key: "view_own_receivables", label: "Visualizar recebíveis próprios" },
      { key: "view_own_commission", label: "Visualizar comissão prevista" },
      { key: "view_history", label: "Visualizar histórico" },
      { key: "view_taxes", label: "Visualizar impostos" },
      { key: "view_audit_trail", label: "Visualizar trilha auditoria" },
    ],
  },
  {
    group: "Metas e Planejamento",
    permissions: [
      { key: "goals_edit", label: "Editar metas" },
      { key: "goals_edit_strategic", label: "Editar metas estratégicas" },
      { key: "goals_view_commercial", label: "Visualizar metas comerciais" },
    ],
  },
  {
    group: "Aprovações",
    permissions: [
      { key: "approve_entries", label: "Aprovar lançamentos" },
      { key: "approve_adjustments", label: "Aprovar ajustes" },
      { key: "approve_provisions", label: "Aprovar provisões" },
    ],
  },
  {
    group: "Contábil e Exportação",
    permissions: [
      { key: "validate_classifications", label: "Validar classificações" },
      { key: "export_accounting", label: "Exportar dados contábeis" },
      { key: "export_all", label: "Exportar tudo" },
    ],
  },
  {
    group: "Administração",
    permissions: [
      { key: "edit_permissions", label: "Editar permissões" },
      { key: "delete_reconciled_history", label: "Excluir histórico conciliado" },
      { key: "edit_any_data", label: "Editar qualquer dado" },
    ],
  },
];

// ===== DEFAULT PROFILES =====
interface ProfileDef {
  key: string;
  label: string;
  description: string;
  icon: any;
  position: number;
  defaults: Record<string, boolean>;
}

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

const DEFAULT_PROFILES: ProfileDef[] = [
  {
    key: "administrador", label: "Administrador", description: "Acesso total, exceto exclusão de histórico conciliado",
    icon: ShieldCheck, position: 1,
    defaults: Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, k !== "delete_reconciled_history"])),
  },
  {
    key: "financeiro", label: "Financeiro", description: "Operações financeiras completas, sem alterar estrutura",
    icon: Shield, position: 2,
    defaults: {
      payable_create: true, receivable_create: true, reconcile_bank: true,
      confirm_classification: true, cost_center_edit: true, project_edit: true,
      edit_due_dates: true, execute_splits: true, view_dre_full: true,
      view_cashflow_full: true, view_bi_executive: true, view_goals: true,
      view_comparisons: true, view_projections: true, view_history: true,
      view_taxes: true, view_audit_trail: true, export_accounting: true,
    },
  },
  {
    key: "gestor", label: "Gestor", description: "Visualização completa, aprovações opcionais",
    icon: Eye, position: 3,
    defaults: {
      view_dre_full: true, view_cashflow_full: true, view_bi_executive: true,
      view_goals: true, view_comparisons: true, view_projections: true,
      view_history: true, view_taxes: true, view_audit_trail: true,
      approve_entries: true, approve_adjustments: true, approve_provisions: true,
    },
  },
  {
    key: "comercial", label: "Comercial", description: "Pedidos e comissões, sem acesso à DRE/Fluxo",
    icon: Users, position: 4,
    defaults: {
      view_own_receivables: true, view_own_commission: true,
      goals_view_commercial: true,
    },
  },
  {
    key: "contabil", label: "Contábil", description: "Visualização e validação contábil, sem alterar fluxo/metas",
    icon: Shield, position: 5,
    defaults: {
      view_dre_full: true, view_history: true, view_taxes: true,
      view_audit_trail: true, validate_classifications: true,
      export_accounting: true, view_comparisons: true,
    },
  },
  {
    key: "auditor", label: "Auditor", description: "Visualização total, exportação, sem edição",
    icon: ShieldAlert, position: 6,
    defaults: {
      view_dre_full: true, view_cashflow_full: true, view_bi_executive: true,
      view_goals: true, view_comparisons: true, view_projections: true,
      view_history: true, view_taxes: true, view_audit_trail: true,
      view_own_receivables: true, view_own_commission: true,
      export_accounting: true, export_all: true, goals_view_commercial: true,
    },
  },
];

export function FinancePermissionsMatrix() {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["fin-permission-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_permission_profiles")
        .select("*, permissions:fin_profile_permissions(*)")
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile?.tenant_id) throw new Error("Tenant não encontrado");
      const tid = profile.tenant_id;

      for (const prof of DEFAULT_PROFILES) {
        const { data: inserted, error } = await supabase
          .from("fin_permission_profiles")
          .upsert({
            tenant_id: tid, profile_key: prof.key, label: prof.label,
            description: prof.description, position: prof.position, is_default: true,
          } as any, { onConflict: "tenant_id,profile_key" })
          .select("id")
          .single();
        if (error) throw error;

        const permRows = PERMISSION_GROUPS.flatMap(g =>
          g.permissions.map(p => ({
            tenant_id: tid,
            profile_id: inserted.id,
            permission_key: p.key,
            permission_label: p.label,
            permission_group: g.group,
            allowed: prof.defaults[p.key] ?? false,
          }))
        );

        const { error: permErr } = await supabase
          .from("fin_profile_permissions")
          .upsert(permRows as any, { onConflict: "profile_id,permission_key" });
        if (permErr) throw permErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fin-permission-profiles"] });
      toast.success("Perfis financeiros configurados com sucesso");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ permId, allowed }: { permId: string; allowed: boolean }) => {
      const { error } = await supabase
        .from("fin_profile_permissions")
        .update({ allowed } as any)
        .eq("id", permId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fin-permission-profiles"] }),
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  if (isLoading) {
    return <Card><CardContent className="py-8"><Skeleton className="h-64 w-full" /></CardContent></Card>;
  }

  if (!profiles?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold mb-1">Matriz de Permissões Financeiras</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure perfis de acesso para o módulo financeiro com permissões granulares.
          </p>
          <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Configurar Perfis Padrão
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Build permission lookup: profileId -> permKey -> { id, allowed }
  const permLookup: Record<string, Record<string, { id: string; allowed: boolean }>> = {};
  profiles.forEach((prof: any) => {
    permLookup[prof.id] = {};
    prof.permissions?.forEach((p: any) => {
      permLookup[prof.id][p.permission_key] = { id: p.id, allowed: p.allowed };
    });
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Matriz de Permissões Financeiras
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Configure o que cada perfil pode fazer no módulo financeiro
            </p>
          </div>
          <Badge variant="outline">{profiles.length} perfis</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="sticky left-0 bg-muted/30 z-10 min-w-[220px]">Permissão</TableHead>
                {profiles.map((prof: any) => {
                  const def = DEFAULT_PROFILES.find(d => d.key === prof.profile_key);
                  const Icon = def?.icon || Shield;
                  return (
                    <TableHead key={prof.id} className="text-center min-w-[100px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <Icon className="h-4 w-4" />
                        <span className="text-[11px] font-medium">{prof.label}</span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_GROUPS.map((group) => (
                <>
                  <TableRow key={`group-${group.group}`} className="bg-muted/10">
                    <TableCell colSpan={profiles.length + 1} className="sticky left-0 bg-muted/10 z-10">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {group.group}
                      </span>
                    </TableCell>
                  </TableRow>
                  {group.permissions.map((perm) => (
                    <TableRow key={perm.key} className="hover:bg-muted/20">
                      <TableCell className="sticky left-0 bg-background z-10">
                        <span className="text-sm">{perm.label}</span>
                      </TableCell>
                      {profiles.map((prof: any) => {
                        const entry = permLookup[prof.id]?.[perm.key];
                        return (
                          <TableCell key={`${prof.id}-${perm.key}`} className="text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={entry?.allowed ?? false}
                                onCheckedChange={(checked) => {
                                  if (entry) toggleMutation.mutate({ permId: entry.id, allowed: checked });
                                }}
                                className="scale-75"
                                disabled={!entry}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="px-4 py-3 border-t bg-muted/20">
          <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-600" /> Permitido</span>
            <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-muted-foreground" /> Bloqueado</span>
            <span>Usuários sem perfil atribuído herdam acesso total (Administrador)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
