import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Zap, History, AlertCircle, CheckCircle2, XCircle, Clock, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  EVENT_CATALOG,
  ACTION_CATALOG,
  MODULE_LABELS,
  type AutomationRule,
  type AutomationExecutionLog,
  type EventModule,
  type EventType,
  type AutomationActionType,
} from "@/lib/automation-engine/types";

export default function AutomacoesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formEvent, setFormEvent] = useState<string>("");
  const [formModule, setFormModule] = useState<string>("");
  const [formPriority, setFormPriority] = useState(100);
  const [formActions, setFormActions] = useState<AutomationActionType[]>([]);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["automation_rules"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("automation_rules" as any)
        .select("*")
        .order("priority", { ascending: true }) as any);
      if (error) throw error;
      return (data || []) as AutomationRule[];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["automation_logs"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("automation_execution_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100) as any);
      if (error) throw error;
      return (data || []) as AutomationExecutionLog[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase
        .from("automation_rules" as any)
        .update({ active })
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation_rules"] }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const catalogEntry = EVENT_CATALOG.find((e) => e.type === formEvent);
      const { error } = await (supabase.from("automation_rules" as any).insert({
        name: formName,
        description: formDesc || null,
        event_type: formEvent,
        event_module: catalogEntry?.module || formModule,
        conditions: [],
        actions: formActions.map((a) => ({ type: a })),
        priority: formPriority,
        is_system: false,
      } as any) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Regra criada com sucesso" });
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormEvent("");
    setFormModule("");
    setFormPriority(100);
    setFormActions([]);
  };

  const filtered = rules.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (moduleFilter !== "all" && r.event_module !== moduleFilter) return false;
    return true;
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "sucesso": return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
      case "falha": return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case "simulacao": return <Play className="h-3.5 w-3.5 text-blue-600" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5" /> Automações
          </h1>
          <p className="text-sm text-muted-foreground">{rules.length} regras configuradas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8"><Plus className="h-3.5 w-3.5 mr-1.5" />Nova Regra</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nova Regra de Automação</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Regra</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Gerar financeiro ao aprovar pedido" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Opcional" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Evento Gatilho</Label>
                  <Select value={formEvent} onValueChange={setFormEvent}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODULE_LABELS).map(([mod, label]) => (
                        <div key={mod}>
                          <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">{label}</p>
                          {EVENT_CATALOG.filter((e) => e.module === mod).map((e) => (
                            <SelectItem key={e.type} value={e.type}>{e.label}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Input type="number" value={formPriority} onChange={(e) => setFormPriority(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <Label>Ações</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5 max-h-[200px] overflow-y-auto">
                  {ACTION_CATALOG.map((a) => (
                    <label key={a.type} className="flex items-center gap-1.5 text-sm cursor-pointer hover:bg-accent/50 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={formActions.includes(a.type)}
                        onChange={(e) => {
                          if (e.target.checked) setFormActions((p) => [...p, a.type]);
                          else setFormActions((p) => p.filter((x) => x !== a.type));
                        }}
                        className="rounded"
                      />
                      {a.label}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!formName || !formEvent || formActions.length === 0} className="w-full">
                Criar Regra
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules" className="text-xs gap-1.5"><Zap className="h-3.5 w-3.5" />Regras</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs gap-1.5"><History className="h-3.5 w-3.5" />Execuções</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Buscar regra..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos módulos</SelectItem>
                    {Object.entries(MODULE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">Evento</TableHead>
                    <TableHead className="text-xs">Ações</TableHead>
                    <TableHead className="text-xs text-center">Prioridade</TableHead>
                    <TableHead className="text-xs text-center">Execuções</TableHead>
                    <TableHead className="text-xs">Última</TableHead>
                    <TableHead className="text-xs text-center">Ativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((rule) => {
                    const eventEntry = EVENT_CATALOG.find((e) => e.type === rule.event_type);
                    const actions = (rule.actions || []) as { type: string }[];
                    return (
                      <TableRow key={rule.id}>
                        <TableCell className="text-sm font-medium">
                          <div>
                            {rule.name}
                            {rule.is_system && <Badge variant="outline" className="ml-1.5 text-[9px] h-4">Sistema</Badge>}
                          </div>
                          {rule.description && <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{rule.description}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{eventEntry?.label || rule.event_type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {actions.length} {actions.length === 1 ? "ação" : "ações"}
                        </TableCell>
                        <TableCell className="text-center text-xs">{rule.priority}</TableCell>
                        <TableCell className="text-center text-xs">
                          {rule.execution_count}
                          {rule.error_count > 0 && (
                            <span className="text-destructive ml-1">({rule.error_count} erros)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {rule.last_executed_at
                            ? formatDistanceToNow(new Date(rule.last_executed_at), { addSuffix: true, locale: ptBR })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={rule.active}
                            onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, active: v })}
                            disabled={rule.is_system}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                        Nenhuma regra encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Últimas 100 execuções</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Regra</TableHead>
                      <TableHead className="text-xs">Evento</TableHead>
                      <TableHead className="text-xs">Origem</TableHead>
                      <TableHead className="text-xs">Tempo</TableHead>
                      <TableHead className="text-xs">Quando</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{statusIcon(log.status)}</TableCell>
                        <TableCell className="text-sm">{log.rule_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {EVENT_CATALOG.find((e) => e.type === log.event_type)?.label || log.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.source_table}</TableCell>
                        <TableCell className="text-xs">{log.execution_time_ms ? `${log.execution_time_ms}ms` : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                          Nenhuma execução registrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
