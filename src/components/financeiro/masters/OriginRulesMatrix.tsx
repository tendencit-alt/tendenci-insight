import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  FileText,
  Link2,
  Landmark,
  Users,
  Package,
  PenLine,
  Loader2,
  Zap,
  Check,
  X,
  Info,
  Plus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OriginRule {
  id: string;
  origin_key: string;
  origin_label: string;
  description: string | null;
  generates_provision: boolean;
  generates_immediate_cash: boolean;
  requires_reconciliation: boolean;
  inherits_cost_center: boolean;
  inherits_project: boolean;
  requires_justification: boolean;
  requires_document_link: boolean;
  allows_auto_classification: boolean;
  requires_category: boolean;
  allows_recurrence: boolean;
  allows_split: boolean;
  requires_supplier: boolean;
  requires_client: boolean;
  dre_trigger: string;
  cashflow_trigger: string;
  audit_level: string;
  active: boolean;
  position: number;
}

const ORIGIN_ICONS: Record<string, any> = {
  pedido_comercial: ShoppingCart,
  conta_receber_manual: ArrowDownCircle,
  conta_pagar_manual: ArrowUpCircle,
  contrato_recorrente: RefreshCw,
  ofx_extrato: FileText,
  conciliacao_bancaria: Link2,
  emprestimo: Landmark,
  folha_pagamento: Users,
  compra_ativo: Package,
  lancamento_manual: PenLine,
};

const DEFAULT_ORIGINS: Omit<OriginRule, "id" | "tenant_id">[] = [
  {
    origin_key: "pedido_comercial", origin_label: "Pedido Comercial", position: 1,
    description: "Gera provisões de receita, compromissos sobre vendas e custos variáveis",
    generates_provision: true, generates_immediate_cash: false, requires_reconciliation: true,
    inherits_cost_center: true, inherits_project: true, requires_justification: false,
    requires_document_link: true, allows_auto_classification: true, requires_category: true,
    allows_recurrence: false, allows_split: true, requires_supplier: false, requires_client: true,
    dre_trigger: "faturamento", cashflow_trigger: "recebimento", audit_level: "standard", active: true,
  },
  {
    origin_key: "conta_receber_manual", origin_label: "Conta a Receber Manual", position: 2,
    description: "Receita avulsa com classificação manual, permite recorrência e vínculo opcional",
    generates_provision: true, generates_immediate_cash: false, requires_reconciliation: true,
    inherits_cost_center: false, inherits_project: false, requires_justification: false,
    requires_document_link: false, allows_auto_classification: true, requires_category: true,
    allows_recurrence: true, allows_split: true, requires_supplier: false, requires_client: true,
    dre_trigger: "competencia", cashflow_trigger: "recebimento", audit_level: "standard", active: true,
  },
  {
    origin_key: "conta_pagar_manual", origin_label: "Conta a Pagar Manual", position: 3,
    description: "Obrigação com fornecedor, permite rateio e recorrência",
    generates_provision: true, generates_immediate_cash: false, requires_reconciliation: true,
    inherits_cost_center: false, inherits_project: false, requires_justification: false,
    requires_document_link: false, allows_auto_classification: true, requires_category: true,
    allows_recurrence: true, allows_split: true, requires_supplier: true, requires_client: false,
    dre_trigger: "competencia", cashflow_trigger: "pagamento", audit_level: "standard", active: true,
  },
  {
    origin_key: "contrato_recorrente", origin_label: "Contrato Recorrente", position: 4,
    description: "Agenda futura automática com reajuste e encerramento sem apagar histórico",
    generates_provision: true, generates_immediate_cash: false, requires_reconciliation: true,
    inherits_cost_center: true, inherits_project: true, requires_justification: false,
    requires_document_link: true, allows_auto_classification: true, requires_category: true,
    allows_recurrence: true, allows_split: false, requires_supplier: false, requires_client: false,
    dre_trigger: "competencia", cashflow_trigger: "pagamento", audit_level: "standard", active: true,
  },
  {
    origin_key: "ofx_extrato", origin_label: "OFX / Extrato Bancário", position: 5,
    description: "Movimento bruto de caixa — concilia antes de classificar, preserva descrição original",
    generates_provision: false, generates_immediate_cash: true, requires_reconciliation: true,
    inherits_cost_center: false, inherits_project: false, requires_justification: false,
    requires_document_link: false, allows_auto_classification: true, requires_category: false,
    allows_recurrence: false, allows_split: false, requires_supplier: false, requires_client: false,
    dre_trigger: "none", cashflow_trigger: "imediato", audit_level: "standard", active: true,
  },
  {
    origin_key: "conciliacao_bancaria", origin_label: "Conciliação Bancária", position: 6,
    description: "Baixa obrigação/recebível, confirma classificação, atualiza DRE e fluxo",
    generates_provision: false, generates_immediate_cash: false, requires_reconciliation: false,
    inherits_cost_center: true, inherits_project: true, requires_justification: false,
    requires_document_link: true, allows_auto_classification: true, requires_category: true,
    allows_recurrence: false, allows_split: false, requires_supplier: false, requires_client: false,
    dre_trigger: "competencia", cashflow_trigger: "pagamento", audit_level: "standard", active: true,
  },
  {
    origin_key: "emprestimo", origin_label: "Empréstimo / Financiamento", position: 7,
    description: "Entrada de capital, cronograma de parcelas, separação automática principal/juros",
    generates_provision: true, generates_immediate_cash: true, requires_reconciliation: true,
    inherits_cost_center: false, inherits_project: false, requires_justification: false,
    requires_document_link: true, allows_auto_classification: false, requires_category: false,
    allows_recurrence: false, allows_split: true, requires_supplier: false, requires_client: false,
    dre_trigger: "competencia", cashflow_trigger: "pagamento", audit_level: "standard", active: true,
  },
  {
    origin_key: "folha_pagamento", origin_label: "Folha de Pagamento", position: 8,
    description: "Despesa por competência com separação administrativa/comercial/produção",
    generates_provision: true, generates_immediate_cash: false, requires_reconciliation: true,
    inherits_cost_center: true, inherits_project: false, requires_justification: false,
    requires_document_link: false, allows_auto_classification: false, requires_category: true,
    allows_recurrence: true, allows_split: true, requires_supplier: false, requires_client: false,
    dre_trigger: "competencia", cashflow_trigger: "pagamento", audit_level: "standard", active: true,
  },
  {
    origin_key: "compra_ativo", origin_label: "Compra de Ativo", position: 9,
    description: "Despesa direta ou ativo depreciável com cronograma automático de depreciação",
    generates_provision: true, generates_immediate_cash: false, requires_reconciliation: true,
    inherits_cost_center: true, inherits_project: true, requires_justification: false,
    requires_document_link: true, allows_auto_classification: false, requires_category: true,
    allows_recurrence: false, allows_split: false, requires_supplier: true, requires_client: false,
    dre_trigger: "competencia", cashflow_trigger: "pagamento", audit_level: "standard", active: true,
  },
  {
    origin_key: "lancamento_manual", origin_label: "Lançamento Manual Avulso", position: 10,
    description: "Exige justificativa, categoria e coerência DRE/Fluxo — auditoria reforçada",
    generates_provision: false, generates_immediate_cash: false, requires_reconciliation: true,
    inherits_cost_center: false, inherits_project: false, requires_justification: true,
    requires_document_link: false, allows_auto_classification: false, requires_category: true,
    allows_recurrence: false, allows_split: true, requires_supplier: false, requires_client: false,
    dre_trigger: "competencia", cashflow_trigger: "pagamento", audit_level: "reinforced", active: true,
  },
];

const FLAG_COLUMNS = [
  { key: "generates_provision", label: "Provisão", tip: "Gera provisão automática ao criar" },
  { key: "generates_immediate_cash", label: "Caixa Imediato", tip: "Gera impacto imediato no fluxo de caixa" },
  { key: "requires_reconciliation", label: "Conciliação", tip: "Exige conciliação posterior com extrato" },
  { key: "inherits_cost_center", label: "Herda CC", tip: "Herda centro de custo da origem" },
  { key: "inherits_project", label: "Herda Projeto", tip: "Herda projeto da origem" },
  { key: "requires_justification", label: "Justificativa", tip: "Exige justificativa do usuário" },
  { key: "requires_document_link", label: "Documento", tip: "Exige vínculo com documento" },
  { key: "allows_auto_classification", label: "Auto Classif.", tip: "Permite classificação automática pelo motor IA" },
] as const;

const DRE_OPTIONS = [
  { value: "competencia", label: "Competência" },
  { value: "faturamento", label: "Faturamento" },
  { value: "pagamento", label: "Pagamento" },
  { value: "none", label: "Não participa" },
];

const CASHFLOW_OPTIONS = [
  { value: "pagamento", label: "Pagamento" },
  { value: "recebimento", label: "Recebimento" },
  { value: "imediato", label: "Imediato" },
  { value: "none", label: "Não participa" },
];

export function OriginRulesMatrix() {
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["fin-origin-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_origin_rules")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as OriginRule[];
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile?.tenant_id) throw new Error("Tenant não encontrado");

      const rows = DEFAULT_ORIGINS.map((o) => ({ ...o, tenant_id: profile.tenant_id }));
      const { error } = await supabase.from("fin_origin_rules").upsert(rows as any, { onConflict: "tenant_id,origin_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fin-origin-rules"] });
      toast.success("Origens padrão configuradas");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const { error } = await supabase.from("fin_origin_rules").update({ [field]: value } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fin-origin-rules"] });
    },
    onError: (e: any) => toast.error("Erro ao atualizar: " + e.message),
  });

  const handleToggle = (id: string, field: string, current: boolean) => {
    updateMutation.mutate({ id, field, value: !current });
  };

  const handleSelect = (id: string, field: string, value: string) => {
    updateMutation.mutate({ id, field, value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rules?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Zap className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold mb-1">Matriz de Automação por Origem</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure regras automáticas para cada tipo de origem de lançamento financeiro.
          </p>
          <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Configurar Origens Padrão
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Matriz de Automação por Origem
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Defina comportamentos automáticos para cada origem de lançamento
            </p>
          </div>
          <Badge variant="outline">{rules.length} origens</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="sticky left-0 bg-muted/30 z-10 min-w-[200px]">Origem</TableHead>
                  {FLAG_COLUMNS.map((col) => (
                    <TableHead key={col.key} className="text-center px-2 min-w-[80px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[11px] leading-tight cursor-help flex items-center justify-center gap-0.5">
                            {col.label}
                            <Info className="h-3 w-3 opacity-40" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p className="text-xs">{col.tip}</p></TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[120px]">
                    <span className="text-[11px]">DRE</span>
                  </TableHead>
                  <TableHead className="text-center min-w-[120px]">
                    <span className="text-[11px]">Fluxo Caixa</span>
                  </TableHead>
                  <TableHead className="text-center min-w-[80px]">
                    <span className="text-[11px]">Auditoria</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const Icon = ORIGIN_ICONS[rule.origin_key] || PenLine;
                  return (
                    <TableRow key={rule.id} className="hover:bg-muted/20">
                      <TableCell className="sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium leading-tight">{rule.origin_label}</p>
                            {rule.description && (
                              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 max-w-[220px] truncate">
                                {rule.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {FLAG_COLUMNS.map((col) => (
                        <TableCell key={col.key} className="text-center px-2">
                          <div className="flex justify-center">
                            <Switch
                              checked={rule[col.key as keyof OriginRule] as boolean}
                              onCheckedChange={() => handleToggle(rule.id, col.key, rule[col.key as keyof OriginRule] as boolean)}
                              className="scale-75"
                            />
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-center px-1">
                        <Select
                          value={rule.dre_trigger}
                          onValueChange={(v) => handleSelect(rule.id, "dre_trigger", v)}
                        >
                          <SelectTrigger className="h-7 text-[11px] w-[100px] mx-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DRE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center px-1">
                        <Select
                          value={rule.cashflow_trigger}
                          onValueChange={(v) => handleSelect(rule.id, "cashflow_trigger", v)}
                        >
                          <SelectTrigger className="h-7 text-[11px] w-[100px] mx-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CASHFLOW_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={rule.audit_level === "reinforced" ? "destructive" : "outline"}
                          className="text-[10px] cursor-pointer"
                          onClick={() => handleSelect(rule.id, "audit_level", rule.audit_level === "reinforced" ? "standard" : "reinforced")}
                        >
                          {rule.audit_level === "reinforced" ? "Reforçada" : "Padrão"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="px-4 py-3 border-t bg-muted/20">
          <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Ativo = comportamento automático habilitado</span>
            <span className="flex items-center gap-1"><X className="h-3 w-3 text-muted-foreground" /> Inativo = requer ação manual</span>
            <span>DRE: quando o lançamento impacta o resultado</span>
            <span>Fluxo: quando o lançamento impacta o caixa</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
