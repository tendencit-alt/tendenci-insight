import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, FolderKanban, Loader2, TrendingUp, Eye, Target, DollarSign, AlertTriangle, CheckCircle2, Percent, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { numericCodeSort } from "@/lib/numericCodeSort";
import { ProjectKPIsDialog } from "./ProjectKPIsDialog";


interface LedgerEntry {
  id: string;
  description: string;
  amount: number;
  type: string;
  competence_date: string;
  cash_date: string | null;
  status: string;
  reconciled: boolean;
  chart_account?: { name: string; code: string } | null;
}

export function FinProjectsManager() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    status: "ativo",
    budget: "",
    start_date: "",
    end_date: "",
  });
  
  // State for viewing project entries
  const [viewEntriesOpen, setViewEntriesOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Global default % despesas
  const [globalPct, setGlobalPct] = useState<string>("");
  const [savingGlobalPct, setSavingGlobalPct] = useState(false);
  const [pctEdits, setPctEdits] = useState<Record<string, string>>({});
  const [savingPctId, setSavingPctId] = useState<string | null>(null);

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings-budget-pct"],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("id, default_project_budget_percent")
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  useEffect(() => {
    if (companySettings?.default_project_budget_percent !== undefined && globalPct === "") {
      setGlobalPct(String(companySettings.default_project_budget_percent));
    }
  }, [companySettings]);

  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ["fin-projects-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_projects")
        .select("*")
        .order("code");
      return data || [];
    },
  });

  // Fetch order valor_total per project (for "Valor da Venda" column)
  const { data: orderTotalsByProject } = useQuery({
    queryKey: ["orders-totals-by-project"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("project_id, valor_total, status")
        .not("project_id", "is", null);
      const map: Record<string, number> = {};
      (data || []).forEach((o: any) => {
        if (!o.project_id) return;
        if (["rascunho", "cancelado"].includes(o.status)) return;
        map[o.project_id] = (map[o.project_id] || 0) + Number(o.valor_total || 0);
      });
      return map;
    },
  });


  // Fetch all ledger entries grouped by project
  const { data: projectEntries } = useQuery({
    queryKey: ["fin-ledger-entries-by-project"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_ledger_entries")
        .select(`
          id,
          project_id,
          description,
          amount,
          type,
          competence_date,
          cash_date,
          status,
          reconciled,
          chart_account:fin_chart_accounts(name, code)
        `)
        .not("project_id", "is", null)
        .order("competence_date", { ascending: false });
      return data || [];
    },
  });

  // Calculate realized amounts per project
  const realizedByProject = useMemo(() => {
    const result: Record<string, { total: number; receitas: number; despesas: number; receitasPagas: number; despesasPagas: number; entries: LedgerEntry[] }> = {};
    
    projectEntries?.forEach((entry: any) => {
      if (!entry.project_id) return;
      
      if (!result[entry.project_id]) {
        result[entry.project_id] = { total: 0, receitas: 0, despesas: 0, receitasPagas: 0, despesasPagas: 0, entries: [] };
      }
      
      const amount = Math.abs(Number(entry.amount));
      const isPaid = entry.status === "PAGO_RECEBIDO";
      
      if (entry.type === "RECEITA") {
        result[entry.project_id].receitas += amount;
        if (isPaid) result[entry.project_id].receitasPagas += amount;
        result[entry.project_id].total += amount;
      } else {
        result[entry.project_id].despesas += amount;
        if (isPaid) result[entry.project_id].despesasPagas += amount;
        result[entry.project_id].total -= amount;
      }
      
      result[entry.project_id].entries.push(entry);
    });
    
    return result;
  }, [projectEntries]);

  // Calculate KPIs for active projects
  const kpis = useMemo(() => {
    const activeProjects = projects?.filter(p => p.status === "ativo") || [];
    
    let totalBudget = 0;
    let totalRealized = 0; // Despesas Pagas
    let totalRecebido = 0; // Receitas Pagas
    let projectsOverBudget = 0;
    let projectsUnderBudget = 0;
    
    activeProjects.forEach(project => {
      const budget = Number(project.budget) || 0;
      const realizedDespesas = realizedByProject[project.id]?.despesasPagas || 0;
      const realizedReceitas = realizedByProject[project.id]?.receitasPagas || 0;
      
      totalBudget += budget;
      totalRealized += realizedDespesas;
      totalRecebido += realizedReceitas;
      
      if (budget > 0 && realizedDespesas > budget) {
        projectsOverBudget++;
      } else if (budget > 0 && realizedDespesas <= budget) {
        projectsUnderBudget++;
      }
    });
    
    return {
      activeCount: activeProjects.length,
      totalBudget,
      totalRealized,
      percentUsed: totalBudget > 0 ? (totalRealized / totalBudget) * 100 : 0,
      projectsOverBudget,
      projectsUnderBudget,
    };
  }, [projects, realizedByProject]);

  const handleEdit = (project: any) => {
    setEditing(project);
    setForm({
      name: project.name || "",
      code: project.code || "",
      status: project.status || "ativo",
      budget: project.budget ? String(project.budget) : "",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setForm({
      name: "",
      code: "",
      status: "ativo",
      budget: "",
      start_date: "",
      end_date: "",
    });
    setDialogOpen(true);
  };

  const handleViewEntries = (project: any) => {
    setSelectedProject(project);
    setViewEntriesOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: form.name,
        code: form.code || null,
        status: form.status,
        budget: form.budget ? parseFloat(form.budget.replace(",", ".")) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      if (editing) {
        const { error } = await supabase
          .from("fin_projects")
          .update(data)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Projeto atualizado!");
      } else {
        const { error } = await supabase
          .from("fin_projects")
          .insert(data);
        if (error) throw error;
        toast.success("Projeto criado!");
      }

      refetch();
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalPct = async () => {
    const val = parseFloat(globalPct.replace(",", "."));
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error("Informe um percentual entre 0 e 100");
      return;
    }
    setSavingGlobalPct(true);
    try {
      if (companySettings?.id) {
        const { error } = await supabase
          .from("company_settings")
          .update({ default_project_budget_percent: val })
          .eq("id", companySettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_settings")
          .insert({ default_project_budget_percent: val } as any);
        if (error) throw error;
      }
      toast.success("Percentual global salvo!");
      qc.invalidateQueries({ queryKey: ["company-settings-budget-pct"] });
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSavingGlobalPct(false);
    }
  };

  const saveProjectPct = async (projectId: string) => {
    const raw = pctEdits[projectId];
    const val = parseFloat((raw || "").replace(",", "."));
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error("Informe um percentual entre 0 e 100");
      return;
    }
    setSavingPctId(projectId);
    try {
      const { error } = await supabase
        .from("fin_projects")
        .update({ budget_percent: val })
        .eq("id", projectId);
      if (error) throw error;
      setPctEdits((p) => { const c = { ...p }; delete c[projectId]; return c; });
      toast.success("Percentual atualizado!");
      refetch();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSavingPctId(null);
    }
  };


  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-600">Ativo</Badge>;
      case "concluido":
        return <Badge variant="secondary">Concluído</Badge>;
      case "pausado":
        return <Badge variant="outline">Pausado</Badge>;
      case "cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBudgetStatus = (budget: number, realized: number) => {
    if (budget <= 0) return null;
    const percent = (realized / budget) * 100;
    
    if (percent > 100) {
      return { color: "text-red-600", icon: AlertTriangle, label: "Acima do orçamento" };
    } else if (percent > 80) {
      return { color: "text-yellow-600", icon: TrendingUp, label: "Próximo do limite" };
    } else {
      return { color: "text-green-600", icon: CheckCircle2, label: "Dentro do orçamento" };
    }
  };

  const [statusFilter, setStatusFilter] = useState<"ativo" | "concluido" | "todos">("ativo");

  const sortedProjects = useMemo(() => numericCodeSort(projects || [], 'code'), [projects]);
  const filteredProjects = useMemo(() => {
    if (statusFilter === "todos") return sortedProjects;
    return sortedProjects.filter(p => p.status === statusFilter);
  }, [sortedProjects, statusFilter]);
  const activeProjects = sortedProjects.filter(p => p.status === "ativo");

  const selectedProjectData = selectedProject 
    ? realizedByProject[selectedProject.id] || { total: 0, receitas: 0, despesas: 0, entries: [] }
    : { total: 0, receitas: 0, despesas: 0, entries: [] };

  return (
    <div className="space-y-6">
      {/* Global Config: % Despesas do Projeto */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <Percent className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold">% Despesas do Projeto (Global)</p>
                <p className="text-xs text-muted-foreground">
                  Percentual aplicado automaticamente sobre o valor da venda de cada novo pedido para gerar o orçamento de despesas.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={globalPct}
                onChange={(e) => setGlobalPct(e.target.value)}
                className="h-9 w-24 text-right"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <Button size="sm" onClick={saveGlobalPct} disabled={savingGlobalPct} className="gap-1">
                {savingGlobalPct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Projetos Ativos</p>
                <p className="text-2xl font-bold">{kpis.activeCount}</p>
              </div>
              <FolderKanban className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Orçamento Total</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis.totalBudget)}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Realizado (Despesas)</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis.totalRealized)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.percentUsed.toFixed(1)}% do orçamento
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600 opacity-80" />
            </div>
            <Progress value={Math.min(kpis.percentUsed, 100)} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status Orçamentário</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{kpis.projectsUnderBudget}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">{kpis.projectsOverBudget}</span>
                  </div>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Projetos - Orçamento vs Realizado
            </CardTitle>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "ativo" | "concluido" | "todos")}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="concluido">Finalizados</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Projeto
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Valor da Venda</TableHead>
                  <TableHead className="text-center">% Despesas</TableHead>
                  <TableHead className="text-right">Orçamento</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredProjects.map((project) => {
                  const budget = Number(project.budget) || 0;
                  const realized = realizedByProject[project.id]?.despesasPagas || 0;
                  const totalDespesas = realizedByProject[project.id]?.despesas || 0;
                  const saldo = budget - realized;
                  const percent = budget > 0 ? (realized / budget) * 100 : 0;
                  const budgetStatus = getBudgetStatus(budget, realized);
                  const entryCount = realizedByProject[project.id]?.entries.length || 0;
                  const valorVenda = orderTotalsByProject?.[project.id] || 0;
                  const projectPct = project.budget_percent !== null && project.budget_percent !== undefined
                    ? Number(project.budget_percent)
                    : Number(companySettings?.default_project_budget_percent || 60);
                  const pctEditing = pctEdits[project.id] !== undefined;
                  const pctValue = pctEditing ? pctEdits[project.id] : String(projectPct);

                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.code || "-"}</TableCell>
                      <TableCell>
                        <div>
                          <span>{project.name}</span>
                          {entryCount > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({entryCount} lançamentos)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {valorVenda > 0 ? formatCurrency(valorVenda) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={pctValue}
                            onChange={(e) => setPctEdits((p) => ({ ...p, [project.id]: e.target.value }))}
                            disabled={savingPctId === project.id}
                            className="h-7 w-16 text-right text-xs"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          {pctEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-1.5"
                              disabled={savingPctId === project.id}
                              onClick={() => saveProjectPct(project.id)}
                            >
                              {savingPctId === project.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {budget > 0 ? formatCurrency(budget) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={realized > 0 ? "text-orange-600 font-medium" : ""}>
                          {realized > 0 ? formatCurrency(realized) : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {budget > 0 ? (
                          <span className={saldo < 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                            {formatCurrency(saldo)}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {budget > 0 ? (
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={Math.min(percent, 100)} 
                              className={`h-2 w-20 ${percent > 100 ? '[&>div]:bg-red-600' : percent > 80 ? '[&>div]:bg-yellow-600' : ''}`}
                            />
                            <span className={`text-xs ${budgetStatus?.color}`}>
                              {percent.toFixed(0)}%
                            </span>
                            {budgetStatus && <budgetStatus.icon className={`h-4 w-4 ${budgetStatus.color}`} />}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewEntries(project)}
                            title="Ver lançamentos"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(project)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhum projeto {statusFilter === "ativo" ? "ativo" : statusFilter === "concluido" ? "finalizado" : ""} encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  placeholder="Ex: PROJ-001"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome do projeto..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Orçamento</Label>
              <Input
                type="text"
                placeholder="0,00"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <DateBrInput
                  value={form.start_date}
                  onChange={(iso) => setForm({ ...form, start_date: iso })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Término</Label>
                <DateBrInput
                  value={form.end_date}
                  onChange={(iso) => setForm({ ...form, end_date: iso })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Entries Dialog */}
      <ProjectKPIsDialog
        open={viewEntriesOpen}
        onOpenChange={setViewEntriesOpen}
        project={selectedProject}
        projectData={selectedProjectData}
      />
    </div>
  );
}
