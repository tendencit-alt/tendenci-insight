import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Zap,
  Search,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  FlaskConical,
  History,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  event_type: string;
  event_module: string;
  conditions: any;
  actions: any;
  priority: number;
  is_system: boolean;
  active: boolean;
  dry_run: boolean;
  last_executed_at: string | null;
  execution_count: number;
  error_count: number;
  created_at: string;
}

interface ExecutionLog {
  id: string;
  rule_id: string | null;
  rule_name: string | null;
  event_type: string;
  source_table: string | null;
  source_id: string | null;
  actions_executed: any;
  status: string;
  error_message: string | null;
  execution_time_ms: number | null;
  triggered_by: string | null;
  created_at: string;
}

const MODULE_LABELS: Record<string, string> = {
  orders: "Comercial",
  financeiro: "Financeiro",
  production: "Operação",
  controladoria: "Controladoria",
  planning: "Planejamento",
  rh: "Recursos Humanos",
  inventory: "Estoque",
  suppliers: "Fornecedores",
};

const STATUS_VARIANTS: Record<string, { label: string; cls: string; icon: any }> = {
  success: { label: "Sucesso", cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  error: { label: "Erro", cls: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  skipped: { label: "Ignorado", cls: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock },
  dry_run: { label: "Simulação", cls: "bg-blue-100 text-blue-800 border-blue-200", icon: FlaskConical },
};

export default function AutomationCenter() {
  const { toast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [ruleLogs, setRuleLogs] = useState<ExecutionLog[]>([]);

  async function loadData() {
    setLoading(true);
    const [{ data: r }, { data: l }] = await Promise.all([
      supabase.from("automation_rules").select("*").order("priority", { ascending: true }),
      supabase
        .from("automation_execution_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setRules((r as AutomationRule[]) || []);
    setLogs((l as ExecutionLog[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function toggleActive(rule: AutomationRule) {
    if (rule.is_system) {
      toast({
        title: "Regra de sistema",
        description: "Esta automação é protegida e não pode ser desativada.",
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase
      .from("automation_rules")
      .update({ active: !rule.active })
      .eq("id", rule.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: rule.active ? "Automação desativada" : "Automação ativada",
      });
      loadData();
    }
  }

  async function toggleDryRun(rule: AutomationRule) {
    const { error } = await supabase
      .from("automation_rules")
      .update({ dry_run: !rule.dry_run })
      .eq("id", rule.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: !rule.dry_run ? "Modo simulação ativado" : "Modo simulação desativado",
        description: !rule.dry_run
          ? "A regra registrará execuções sem aplicar efeitos reais."
          : "A regra voltará a aplicar efeitos reais.",
      });
      loadData();
    }
  }

  async function openRuleDetails(rule: AutomationRule) {
    setSelectedRule(rule);
    const { data } = await supabase
      .from("automation_execution_logs")
      .select("*")
      .eq("rule_id", rule.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setRuleLogs((data as ExecutionLog[]) || []);
  }

  const modules = useMemo(() => {
    const set = new Set(rules.map((r) => r.event_module).filter(Boolean));
    return Array.from(set).sort();
  }, [rules]);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (moduleFilter !== "all" && r.event_module !== moduleFilter) return false;
      if (search && !`${r.name} ${r.description || ""} ${r.event_type}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rules, search, moduleFilter]);

  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r) => r.active).length;
    const dry = rules.filter((r) => r.dry_run).length;
    const errors24h = logs.filter(
      (l) =>
        l.status === "error" &&
        new Date(l.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000),
    ).length;
    return { total, active, dry, errors24h };
  }, [rules, logs]);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Zap className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Central de Automação</h1>
            <p className="text-sm text-muted-foreground">
              Governança de todas as regras automatizadas que rodam no ERP.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total de regras</div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Ativas</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">{stats.active}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Em simulação</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{stats.dry}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Erros (24h)</div>
            <div className={`text-2xl font-bold mt-1 ${stats.errors24h > 0 ? "text-red-600" : ""}`}>
              {stats.errors24h}
            </div>
          </Card>
        </div>

        <Tabs defaultValue="rules" className="w-full">
          <TabsList>
            <TabsTrigger value="rules">
              <Zap className="h-4 w-4 mr-2" />
              Regras ({rules.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Histórico ({logs.length})
            </TabsTrigger>
          </TabsList>

          {/* RULES TAB */}
          <TabsContent value="rules" className="space-y-4 mt-4">
            <Card className="p-3">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome, descrição ou evento…"
                    className="pl-9"
                  />
                </div>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Todos os módulos</option>
                  {modules.map((m) => (
                    <option key={m} value={m}>
                      {MODULE_LABELS[m] || m}
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : filteredRules.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Nenhuma regra encontrada com esses filtros.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredRules.map((r) => (
                  <Card
                    key={r.id}
                    className={`p-4 transition-all hover:shadow-sm cursor-pointer ${
                      !r.active ? "opacity-60" : ""
                    }`}
                    onClick={() => openRuleDetails(r)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium truncate">{r.name}</h3>
                          {r.is_system && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Lock className="h-3 w-3" />
                              Sistema
                            </Badge>
                          )}
                          {r.dry_run && (
                            <Badge variant="outline" className="text-xs gap-1 bg-blue-50 text-blue-700 border-blue-200">
                              <FlaskConical className="h-3 w-3" />
                              Simulação
                            </Badge>
                          )}
                          {r.error_count > 0 && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {r.error_count} erros
                            </Badge>
                          )}
                        </div>
                        {r.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {r.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {MODULE_LABELS[r.event_module] || r.event_module}
                          </Badge>
                          <span className="font-mono">{r.event_type}</span>
                          <span>•</span>
                          <span>Prioridade {r.priority}</span>
                          <span>•</span>
                          <span>{r.execution_count} execuções</span>
                          {r.last_executed_at && (
                            <>
                              <span>•</span>
                              <span>
                                Última {formatDistanceToNow(new Date(r.last_executed_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div
                        className="flex flex-col items-end gap-2 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${r.id}`} className="text-xs cursor-pointer">
                            {r.active ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <PlayCircle className="h-3.5 w-3.5" />
                                Ativa
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <PauseCircle className="h-3.5 w-3.5" />
                                Pausada
                              </span>
                            )}
                          </Label>
                          <Switch
                            id={`active-${r.id}`}
                            checked={r.active}
                            disabled={r.is_system}
                            onCheckedChange={() => toggleActive(r)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`dry-${r.id}`} className="text-xs cursor-pointer">
                            Simulação
                          </Label>
                          <Switch
                            id={`dry-${r.id}`}
                            checked={r.dry_run}
                            onCheckedChange={() => toggleDryRun(r)}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : logs.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Nenhuma execução registrada ainda.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {logs.map((l) => {
                  const variant = STATUS_VARIANTS[l.status] || STATUS_VARIANTS.skipped;
                  const Icon = variant.icon;
                  return (
                    <Card key={l.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">
                              {l.rule_name || l.event_type}
                            </span>
                            <Badge variant="outline" className={`text-xs ${variant.cls}`}>
                              {variant.label}
                            </Badge>
                            {l.execution_time_ms != null && (
                              <Badge variant="outline" className="text-xs">
                                {l.execution_time_ms}ms
                              </Badge>
                            )}
                          </div>
                          {l.error_message && (
                            <p className="text-xs text-red-600 mt-1 line-clamp-2">
                              {l.error_message}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                            <span>{format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span>
                            {l.source_table && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{l.source_table}</span>
                              </>
                            )}
                            {l.triggered_by && (
                              <>
                                <span>•</span>
                                <span>{l.triggered_by}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Drawer detalhes */}
        <Sheet open={!!selectedRule} onOpenChange={(o) => !o && setSelectedRule(null)}>
          <SheetContent className="sm:max-w-xl w-full overflow-hidden flex flex-col">
            {selectedRule && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedRule.name}</SheetTitle>
                  <SheetDescription>
                    {selectedRule.description || "Sem descrição."}
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1 mt-4 pr-4">
                  <div className="space-y-4">
                    <Card className="p-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        TRIGGER
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">
                          {MODULE_LABELS[selectedRule.event_module] || selectedRule.event_module}
                        </Badge>
                        <span className="font-mono text-sm">{selectedRule.event_type}</span>
                      </div>
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        CONDIÇÕES
                      </div>
                      <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-40">
                        {JSON.stringify(selectedRule.conditions || {}, null, 2)}
                      </pre>
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        AÇÕES
                      </div>
                      <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-40">
                        {JSON.stringify(selectedRule.actions || {}, null, 2)}
                      </pre>
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        ÚLTIMAS EXECUÇÕES ({ruleLogs.length})
                      </div>
                      {ruleLogs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhuma execução ainda.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {ruleLogs.map((l) => {
                            const v = STATUS_VARIANTS[l.status] || STATUS_VARIANTS.skipped;
                            return (
                              <div key={l.id} className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className={`${v.cls} text-[10px]`}>
                                  {v.label}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {format(new Date(l.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                                </span>
                                {l.execution_time_ms != null && (
                                  <span className="text-muted-foreground ml-auto">
                                    {l.execution_time_ms}ms
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </div>
                </ScrollArea>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
