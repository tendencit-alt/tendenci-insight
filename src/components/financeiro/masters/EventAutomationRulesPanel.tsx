import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Loader2, Zap, ScrollText,
  ShieldAlert, ArrowUpDown, CheckCircle, XCircle, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const EVENT_TYPES = [
  { value: "pedido_criado", label: "Pedido Criado", group: "Comercial" },
  { value: "pedido_aprovado", label: "Pedido Aprovado", group: "Comercial" },
  { value: "pedido_cancelado", label: "Pedido Cancelado", group: "Comercial" },
  { value: "producao_iniciada", label: "Produção Iniciada", group: "Operacional" },
  { value: "producao_concluida", label: "Produção Concluída", group: "Operacional" },
  { value: "pedido_faturado", label: "Pedido Faturado", group: "Financeiro" },
  { value: "pedido_entregue", label: "Pedido Entregue", group: "Comercial" },
  { value: "recebimento_confirmado", label: "Recebimento Confirmado", group: "Financeiro" },
  { value: "pagamento_confirmado", label: "Pagamento Confirmado", group: "Financeiro" },
  { value: "extrato_conciliado", label: "Extrato Conciliado", group: "Financeiro" },
  { value: "meta_nao_atingida", label: "Meta Não Atingida", group: "Planejamento" },
  { value: "limite_despesa_excedido", label: "Limite Despesa Excedido", group: "Planejamento" },
];

const ACTION_TYPES = [
  { value: "classificar_categoria", label: "Classificar Categoria", group: "Classificação" },
  { value: "classificar_centro_custo", label: "Classificar Centro de Custo", group: "Classificação" },
  { value: "classificar_projeto", label: "Classificar Projeto Financeiro", group: "Classificação" },
  { value: "criar_projeto_financeiro", label: "Criar Projeto Financeiro", group: "Automação" },
  { value: "gerar_compromisso_venda", label: "Gerar Compromisso Sobre Venda", group: "Automação" },
  { value: "gerar_contas_receber", label: "Gerar Contas a Receber", group: "Automação" },
  { value: "gerar_contas_pagar", label: "Gerar Contas a Pagar", group: "Automação" },
  { value: "ratear_despesa", label: "Ratear Despesa por CC", group: "Automação" },
  { value: "bloquear_operacao", label: "Bloquear Operação", group: "Bloqueio" },
  { value: "gerar_alerta", label: "Gerar Alerta", group: "Alerta" },
  { value: "heranca_classificacao", label: "Herança de Classificação", group: "Classificação" },
  { value: "conciliar_automatico", label: "Conciliar Automaticamente", group: "Conciliação" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "Igual a" },
  { value: "not_equals", label: "Diferente de" },
  { value: "greater_than", label: "Maior que" },
  { value: "less_than", label: "Menor que" },
  { value: "contains", label: "Contém" },
  { value: "starts_with", label: "Começa com" },
];

interface AutomationRule {
  id: string;
  event_type: string;
  condition_field: string | null;
  condition_operator: string | null;
  condition_value: string | null;
  action_type: string;
  action_config: Record<string, any>;
  priority: number;
  active: boolean;
  description: string | null;
  cost_center_id: string | null;
  project_id: string | null;
  chart_account_id: string | null;
  notes: string | null;
  created_at: string;
}

interface AutomationLog {
  id: string;
  rule_id: string | null;
  event_type: string;
  source_table: string | null;
  source_id: string | null;
  action_type: string;
  action_result: any;
  status: string;
  error_message: string | null;
  execution_time_ms: number | null;
  created_at: string;
}

export function EventAutomationRulesPanel() {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState("rules");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterEvent, setFilterEvent] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  const [form, setForm] = useState({
    event_type: "",
    condition_field: "",
    condition_operator: "",
    condition_value: "",
    action_type: "",
    action_config: "{}",
    priority: "100",
    active: true,
    description: "",
    notes: "",
  });

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ["fin-automation-rules", filterEvent, filterAction],
    queryFn: async () => {
      let query = supabase
        .from("fin_event_automation_rules")
        .select("*")
        .order("priority")
        .order("event_type");
      if (filterEvent !== "all") query = query.eq("event_type", filterEvent);
      if (filterAction !== "all") query = query.eq("action_type", filterAction);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AutomationRule[];
    },
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["fin-automation-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_automation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as AutomationLog[];
    },
  });

  const handleOpenDialog = (rule?: AutomationRule) => {
    if (rule) {
      setSelectedRule(rule);
      setForm({
        event_type: rule.event_type,
        condition_field: rule.condition_field || "",
        condition_operator: rule.condition_operator || "",
        condition_value: rule.condition_value || "",
        action_type: rule.action_type,
        action_config: JSON.stringify(rule.action_config || {}, null, 2),
        priority: rule.priority.toString(),
        active: rule.active,
        description: rule.description || "",
        notes: rule.notes || "",
      });
    } else {
      setSelectedRule(null);
      setForm({
        event_type: "", condition_field: "", condition_operator: "",
        condition_value: "", action_type: "", action_config: "{}",
        priority: "100", active: true, description: "", notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.event_type || !form.action_type) {
      toast.error("Preencha evento e ação obrigatórios");
      return;
    }
    let actionConfig: any;
    try {
      actionConfig = JSON.parse(form.action_config);
    } catch {
      toast.error("JSON de configuração inválido");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        event_type: form.event_type,
        condition_field: form.condition_field || null,
        condition_operator: form.condition_operator || null,
        condition_value: form.condition_value || null,
        action_type: form.action_type,
        action_config: actionConfig,
        priority: parseInt(form.priority) || 100,
        active: form.active,
        description: form.description || null,
        notes: form.notes || null,
      };

      if (selectedRule) {
        const { error } = await supabase.from("fin_event_automation_rules").update(payload).eq("id", selectedRule.id);
        if (error) throw error;
        toast.success("Regra atualizada!");
      } else {
        const { error } = await supabase.from("fin_event_automation_rules").insert(payload);
        if (error) throw error;
        toast.success("Regra criada!");
      }
      queryClient.invalidateQueries({ queryKey: ["fin-automation-rules"] });
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta regra de automação?")) return;
    const { error } = await supabase.from("fin_event_automation_rules").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Regra excluída!");
    queryClient.invalidateQueries({ queryKey: ["fin-automation-rules"] });
  };

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("fin_event_automation_rules").update({ active }).eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["fin-automation-rules"] });
  };

  const getEventLabel = (type: string) => EVENT_TYPES.find((e) => e.value === type)?.label || type;
  const getActionLabel = (type: string) => ACTION_TYPES.find((a) => a.value === type)?.label || type;
  const getEventGroup = (type: string) => EVENT_TYPES.find((e) => e.value === type)?.group || "";
  const getActionGroup = (type: string) => ACTION_TYPES.find((a) => a.value === type)?.group || "";

  const getEventBadgeColor = (group: string) => {
    switch (group) {
      case "Comercial": return "bg-blue-600";
      case "Operacional": return "bg-orange-600";
      case "Financeiro": return "bg-green-600";
      case "Planejamento": return "bg-purple-600";
      default: return "bg-muted";
    }
  };

  const getActionBadgeColor = (group: string) => {
    switch (group) {
      case "Classificação": return "bg-cyan-600";
      case "Automação": return "bg-emerald-600";
      case "Bloqueio": return "bg-red-600";
      case "Alerta": return "bg-yellow-600";
      case "Conciliação": return "bg-indigo-600";
      default: return "bg-muted";
    }
  };

  const getLogStatusIcon = (status: string) => {
    switch (status) {
      case "sucesso": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "erro": return <XCircle className="h-4 w-4 text-red-600" />;
      case "ignorado": return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
      case "bloqueado": return <ShieldAlert className="h-4 w-4 text-orange-600" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // Stats
  const totalRules = rules?.length || 0;
  const activeRules = rules?.filter((r) => r.active).length || 0;
  const successLogs = logs?.filter((l) => l.status === "sucesso").length || 0;
  const errorLogs = logs?.filter((l) => l.status === "erro").length || 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Regras Totais</span>
            <div className="text-2xl font-bold">{totalRules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Regras Ativas</span>
            <div className="text-2xl font-bold text-green-600">{activeRules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Execuções com Sucesso</span>
            <div className="text-2xl font-bold text-blue-600">{successLogs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Erros</span>
            <div className="text-2xl font-bold text-red-600">{errorLogs}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="rules" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />Regras
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" />Logs
          </TabsTrigger>
        </TabsList>

        {/* RULES TAB */}
        <TabsContent value="rules" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Select value={filterEvent} onValueChange={setFilterEvent}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar evento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os eventos</SelectItem>
                  {EVENT_TYPES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar ação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {ACTION_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-1.5">
              <Plus className="h-4 w-4" />Nova Regra
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {rulesLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Ativo</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Condição</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules?.map((rule) => (
                      <TableRow key={rule.id} className={cn(!rule.active && "opacity-50")}>
                        <TableCell>
                          <Switch checked={rule.active} onCheckedChange={(v) => handleToggle(rule.id, v)} />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{rule.priority}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-white text-[10px]", getEventBadgeColor(getEventGroup(rule.event_type)))}>
                            {getEventLabel(rule.event_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {rule.condition_field ? (
                            <span>{rule.condition_field} {rule.condition_operator} {rule.condition_value}</span>
                          ) : (
                            <span className="italic">Sempre</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-white text-[10px]", getActionBadgeColor(getActionGroup(rule.action_type)))}>
                            {getActionLabel(rule.action_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[250px] truncate">{rule.description || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(rule)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(rule.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!rules || rules.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhuma regra de automação cadastrada. Clique em "Nova Regra" para começar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ScrollText className="h-4 w-4" />Log de Automações Executadas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead className="text-right">Tempo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{getLogStatusIcon(log.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {getEventLabel(log.event_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {getActionLabel(log.action_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.source_table ? `${log.source_table}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {log.error_message ? (
                            <span className="text-red-600">{log.error_message}</span>
                          ) : (
                            <span className="text-muted-foreground">
                              {log.action_result ? JSON.stringify(log.action_result).slice(0, 60) : "OK"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {log.execution_time_ms ? `${log.execution_time_ms}ms` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!logs || logs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhuma execução de automação registrada ainda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRule ? "Editar Regra" : "Nova Regra de Automação"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Evento Disparador *</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        <span className="text-muted-foreground text-[10px] mr-1">[{e.group}]</span> {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ação a Executar *</Label>
                <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        <span className="text-muted-foreground text-[10px] mr-1">[{a.group}]</span> {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Criar projeto financeiro ao criar pedido" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Campo Condição</Label>
                <Input value={form.condition_field} onChange={(e) => setForm({ ...form, condition_field: e.target.value })} placeholder="Ex: valor, margem" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Operador</Label>
                <Select value={form.condition_operator} onValueChange={(v) => setForm({ ...form, condition_operator: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {CONDITION_OPERATORS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Valor</Label>
                <Input value={form.condition_value} onChange={(e) => setForm({ ...form, condition_value: e.target.value })} placeholder="Ex: 1000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Prioridade (menor = primeiro)</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label className="text-xs">Ativa</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Configuração da Ação (JSON)</Label>
              <Textarea
                value={form.action_config}
                onChange={(e) => setForm({ ...form, action_config: e.target.value })}
                placeholder='{"nome_padrao": "PED-{numero_pedido} {cliente}"}'
                className="font-mono text-xs min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas internas..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedRule ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
