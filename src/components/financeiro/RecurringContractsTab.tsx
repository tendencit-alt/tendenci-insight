import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent } from "@/components/ui/card";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { UniversalStatusBadge } from "@/components/ui/UniversalStatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, RefreshCw, Pause, Play, XCircle, CalendarClock,
  TrendingUp, TrendingDown, MoreHorizontal, History,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface RecurringContractsTabProps {
  filters: FinanceiroFiltersState;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

const ADJUSTMENT_LABELS: Record<string, string> = {
  none: "Sem reajuste",
  ipca: "IPCA",
  igpm: "IGP-M",
  manual: "Percentual manual",
};

export function RecurringContractsTab({ filters }: RecurringContractsTabProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["fin-recurring-contracts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_recurring_contracts")
        .select(`*, chart_account:fin_chart_accounts(name, code), cost_center:fin_cost_centers(name), project:fin_projects(name)`)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: timeline } = useQuery({
    queryKey: ["fin-recurring-timeline", selectedContract?.id],
    enabled: !!selectedContract?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_recurring_contract_timeline")
        .select("*")
        .eq("contract_id", selectedContract.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // KPIs
  const kpis = contracts?.reduce(
    (acc, c) => {
      if (c.status !== "active") return acc;
      const amt = Number(c.amount);
      if (c.entry_type === "DESPESA") acc.despesasRecorrentes += amt;
      else acc.receitasRecorrentes += amt;
      acc.totalContratos++;
      return acc;
    },
    { despesasRecorrentes: 0, receitasRecorrentes: 0, totalContratos: 0 }
  ) || { despesasRecorrentes: 0, receitasRecorrentes: 0, totalContratos: 0 };

  const totalRecorrente = kpis.despesasRecorrentes + kpis.receitasRecorrentes;
  const percDespesas = totalRecorrente > 0 ? Math.round((kpis.despesasRecorrentes / totalRecorrente) * 100) : 0;
  const percReceitas = totalRecorrente > 0 ? Math.round((kpis.receitasRecorrentes / totalRecorrente) * 100) : 0;

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("fin_recurring_contracts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["fin-recurring-contracts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();

      const { data, error } = await supabase.functions.invoke("generate-recurring", {
        body: { tenant_id: profile?.tenant_id },
      });
      if (error) throw error;
      toast.success(`${data?.generated || 0} lançamentos gerados`);
      queryClient.invalidateQueries({ queryKey: ["fin-recurring-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["fin-ledger-entries"] });
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[11px] text-muted-foreground">Contratos Ativos</p>
          <p className="text-2xl font-bold">{kpis.totalContratos}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[11px] text-muted-foreground">Despesas Recorrentes/mês</p>
          <p className="text-lg font-bold text-red-600 font-mono">{formatCurrency(kpis.despesasRecorrentes)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[11px] text-muted-foreground">Receitas Recorrentes/mês</p>
          <p className="text-lg font-bold text-green-600 font-mono">{formatCurrency(kpis.receitasRecorrentes)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[11px] text-muted-foreground">% Despesas</p>
          <p className="text-2xl font-bold">{percDespesas}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[11px] text-muted-foreground">% Receitas</p>
          <p className="text-2xl font-bold">{percReceitas}%</p>
        </CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Novo Contrato
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleGenerateNow} disabled={generating}>
          <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Gerando..." : "Gerar Lançamentos"}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : contracts?.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum contrato recorrente cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Contrato</TableHead>
                  <TableHead className="text-[11px]">Tipo</TableHead>
                  <TableHead className="text-[11px]">Periodicidade</TableHead>
                  <TableHead className="text-[11px] text-right">Valor</TableHead>
                  <TableHead className="text-[11px]">Categoria</TableHead>
                  <TableHead className="text-[11px]">Modo</TableHead>
                  <TableHead className="text-[11px]">Próx. Geração</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <TableHead className="text-[11px] w-[50px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts?.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">{c.contract_name || c.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${c.entry_type === "RECEITA" ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}`}>
                        {c.entry_type === "RECEITA" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {c.entry_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{FREQUENCY_LABELS[c.frequency] || c.frequency}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">
                      {formatCurrency(Number(c.amount))}
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[120px]">{c.chart_account?.name || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {c.contract_mode === "installment"
                        ? <Badge variant="outline" className="text-[10px]">{c.generated_count}/{c.total_installments}</Badge>
                        : <Badge variant="secondary" className="text-[10px]">Contínuo</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.next_generation_date ? format(new Date(c.next_generation_date), "dd/MM/yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <UniversalStatusBadge module="recurring_contracts" status={c.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedContract(c); setTimelineOpen(true); }} className="gap-2">
                            <History className="h-4 w-4" /> Timeline
                          </DropdownMenuItem>
                          {c.status === "active" && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: c.id, status: "paused" })} className="gap-2">
                              <Pause className="h-4 w-4" /> Pausar
                            </DropdownMenuItem>
                          )}
                          {c.status === "paused" && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: c.id, status: "active" })} className="gap-2">
                              <Play className="h-4 w-4" /> Reativar
                            </DropdownMenuItem>
                          )}
                          {c.status !== "ended" && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: c.id, status: "ended" })} className="gap-2 text-destructive">
                              <XCircle className="h-4 w-4" /> Encerrar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateRecurringContractDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ["fin-recurring-contracts"] });
      }} />

      {/* Timeline Sheet */}
      <Sheet open={timelineOpen} onOpenChange={setTimelineOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Timeline — {selectedContract?.contract_name || selectedContract?.description}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {timeline?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento registrado</p>
            ) : (
              timeline?.map(ev => (
                <div key={ev.id} className="border-l-2 border-primary/30 pl-3 py-1">
                  <p className="text-xs font-medium">{ev.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(ev.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {" · "}{ev.event_type}
                  </p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Create Dialog ──
function CreateRecurringContractDialog({
  open, onOpenChange, onSuccess,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    contract_name: "",
    description: "",
    entry_type: "DESPESA",
    amount: "",
    frequency: "monthly",
    day_due: "1",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    contract_mode: "continuous",
    total_installments: "",
    adjustment_type: "none",
    adjustment_rate: "",
    chart_account_id: "",
    cost_center_id: "",
    project_id: "",
    bank_account_id: "",
    notes: "",
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["fin-chart-accounts-select"],
    queryFn: async () => {
      const { data } = await supabase.from("fin_chart_accounts").select("id, name, code").eq("active", true).order("code");
      return data || [];
    },
  });

  const { data: costCenters } = useQuery({
    queryKey: ["fin-cost-centers-select"],
    queryFn: async () => {
      const { data } = await supabase.from("fin_cost_centers").select("id, name").eq("active", true).order("name");
      return data || [];
    },
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ["fin-bank-accounts-select"],
    queryFn: async () => {
      const { data } = await supabase.from("fin_bank_accounts").select("id, nickname").eq("active", true).order("nickname");
      return data || [];
    },
  });

  const saving = useState(false);

  const handleSave = async () => {
    if (!form.contract_name || !form.amount || !form.start_date) {
      toast.error("Preencha nome, valor e data início");
      return;
    }

    try {
      const startDate = new Date(form.start_date);
      const dayDue = parseInt(form.day_due) || startDate.getDate();

      const { error } = await supabase.from("fin_recurring_contracts").insert({
        contract_name: form.contract_name,
        description: form.description || form.contract_name,
        entry_type: form.entry_type,
        amount: parseFloat(form.amount.replace(",", ".")),
        frequency: form.frequency,
        day_due: dayDue,
        start_date: form.start_date,
        end_date: form.end_date || null,
        next_generation_date: form.start_date,
        contract_mode: form.contract_mode,
        total_installments: form.contract_mode === "installment" ? parseInt(form.total_installments) || null : null,
        adjustment_type: form.adjustment_type,
        adjustment_rate: form.adjustment_rate ? parseFloat(form.adjustment_rate.replace(",", ".")) : 0,
        chart_account_id: form.chart_account_id || null,
        cost_center_id: form.cost_center_id || null,
        bank_account_id: form.bank_account_id || null,
        notes: form.notes || null,
        status: "active",
        auto_generate: true,
      });

      if (error) throw error;
      toast.success("Contrato criado com sucesso");
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato Recorrente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome do Contrato *</Label>
            <Input value={form.contract_name} onChange={e => setForm(p => ({ ...p, contract_name: e.target.value }))} placeholder="Ex: Aluguel escritório" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo *</Label>
              <Select value={form.entry_type} onValueChange={v => setForm(p => ({ ...p, entry_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Valor *</Label>
              <Input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0,00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Periodicidade</Label>
              <Select value={form.frequency} onValueChange={v => setForm(p => ({ ...p, frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semiannual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Dia Vencimento</Label>
              <Input type="number" min={1} max={31} value={form.day_due} onChange={e => setForm(p => ({ ...p, day_due: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data Início *</Label>
              <DateBrInput value={form.start_date} onChange={(iso) => setForm(p => ({ ...p, start_date: iso }))} />
            </div>
            <div>
              <Label className="text-xs">Data Término</Label>
              <DateBrInput value={form.end_date} onChange={(iso) => setForm(p => ({ ...p, end_date: iso }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Modo</Label>
              <Select value={form.contract_mode} onValueChange={v => setForm(p => ({ ...p, contract_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="continuous">Contínuo</SelectItem>
                  <SelectItem value="installment">Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.contract_mode === "installment" && (
              <div>
                <Label className="text-xs">Total Parcelas</Label>
                <Input type="number" value={form.total_installments} onChange={e => setForm(p => ({ ...p, total_installments: e.target.value }))} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Reajuste</Label>
              <Select value={form.adjustment_type} onValueChange={v => setForm(p => ({ ...p, adjustment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem reajuste</SelectItem>
                  <SelectItem value="ipca">IPCA</SelectItem>
                  <SelectItem value="igpm">IGP-M</SelectItem>
                  <SelectItem value="manual">Percentual manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.adjustment_type === "manual" && (
              <div>
                <Label className="text-xs">% Reajuste</Label>
                <Input value={form.adjustment_rate} onChange={e => setForm(p => ({ ...p, adjustment_rate: e.target.value }))} placeholder="0,00" />
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Categoria Financeira</Label>
            <Select value={form.chart_account_id} onValueChange={v => setForm(p => ({ ...p, chart_account_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {chartAccounts?.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Centro de Custo</Label>
              <Select value={form.cost_center_id} onValueChange={v => setForm(p => ({ ...p, cost_center_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {costCenters?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Conta Bancária</Label>
              <Select value={form.bank_account_id} onValueChange={v => setForm(p => ({ ...p, bank_account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.nickname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Criar Contrato</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
