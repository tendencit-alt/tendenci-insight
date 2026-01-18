import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, FolderKanban, Loader2, TrendingUp, TrendingDown, Eye, Target, DollarSign, AlertTriangle, CheckCircle2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { numericCodeSort } from "@/lib/numericCodeSort";

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

  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ["fin-projects-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_projects")
        .select("*")
        .order("name");
      return data || [];
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
    const result: Record<string, { total: number; receitas: number; despesas: number; entries: LedgerEntry[] }> = {};
    
    projectEntries?.forEach((entry: any) => {
      if (!entry.project_id) return;
      
      if (!result[entry.project_id]) {
        result[entry.project_id] = { total: 0, receitas: 0, despesas: 0, entries: [] };
      }
      
      const amount = Math.abs(Number(entry.amount));
      
      if (entry.type === "RECEITA") {
        result[entry.project_id].receitas += amount;
        result[entry.project_id].total += amount;
      } else {
        result[entry.project_id].despesas += amount;
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
    let totalRealized = 0;
    let projectsOverBudget = 0;
    let projectsUnderBudget = 0;
    
    activeProjects.forEach(project => {
      const budget = Number(project.budget) || 0;
      const realized = realizedByProject[project.id]?.despesas || 0;
      
      totalBudget += budget;
      totalRealized += realized;
      
      if (budget > 0 && realized > budget) {
        projectsOverBudget++;
      } else if (budget > 0 && realized <= budget) {
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

  const sortedProjects = useMemo(() => numericCodeSort(projects || [], 'code'), [projects]);
  const activeProjects = sortedProjects.filter(p => p.status === "ativo");

  return (
    <div className="space-y-6">
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
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Projetos Ativos - Orçamento vs Realizado
          </CardTitle>
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
                  <TableHead className="text-right">Orçamento</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeProjects.map((project) => {
                  const budget = Number(project.budget) || 0;
                  const realized = realizedByProject[project.id]?.despesas || 0;
                  const saldo = budget - realized;
                  const percent = budget > 0 ? (realized / budget) * 100 : 0;
                  const budgetStatus = getBudgetStatus(budget, realized);
                  const entryCount = realizedByProject[project.id]?.entries.length || 0;

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
                      <TableCell className="text-sm">
                        {project.start_date && format(new Date(project.start_date), "dd/MM/yy", { locale: ptBR })}
                        {project.start_date && project.end_date && " - "}
                        {project.end_date && format(new Date(project.end_date), "dd/MM/yy", { locale: ptBR })}
                        {!project.start_date && !project.end_date && "-"}
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
                {activeProjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum projeto ativo
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* All Projects Table */}
      {sortedProjects.filter(p => p.status !== "ativo").length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Outros Projetos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Orçamento</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProjects.filter(p => p.status !== "ativo").map((project) => {
                  const realized = realizedByProject[project.id]?.despesas || 0;
                  
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.code || "-"}</TableCell>
                      <TableCell>{project.name}</TableCell>
                      <TableCell className="text-right">
                        {project.budget ? formatCurrency(Number(project.budget)) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {realized > 0 ? formatCurrency(realized) : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewEntries(project)}
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
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Término</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
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
      <Dialog open={viewEntriesOpen} onOpenChange={setViewEntriesOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Lançamentos do Projeto: {selectedProject?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedProject?.code && `Código: ${selectedProject.code} • `}
              Orçamento: {selectedProject?.budget ? formatCurrency(Number(selectedProject.budget)) : "Não definido"}
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (() => {
            const budget = Number(selectedProject.budget) || 0;
            const projectData = realizedByProject[selectedProject.id] || { total: 0, receitas: 0, despesas: 0, entries: [] };
            const despesas = projectData.despesas;
            const receitas = projectData.receitas;
            const saldo = projectData.total;
            const saldoOrcamento = budget - despesas;
            const percentUsed = budget > 0 ? (despesas / budget) * 100 : 0;
            const entryCount = projectData.entries.length;
            const reconciledCount = projectData.entries.filter((e: LedgerEntry) => e.reconciled).length;
            const pendingCount = entryCount - reconciledCount;

            return (
            <div className="space-y-4">
              {/* Individual Project KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Orçamento */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Orçamento</p>
                        <p className="text-xl font-bold">{budget > 0 ? formatCurrency(budget) : "N/D"}</p>
                      </div>
                      <Target className="h-6 w-6 text-blue-500 opacity-70" />
                    </div>
                  </CardContent>
                </Card>

                {/* Despesas Realizadas */}
                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Despesas</p>
                        <p className="text-xl font-bold text-orange-600">{formatCurrency(despesas)}</p>
                        {budget > 0 && (
                          <p className="text-xs text-muted-foreground">{percentUsed.toFixed(1)}% do orçamento</p>
                        )}
                      </div>
                      <TrendingDown className="h-6 w-6 text-orange-500 opacity-70" />
                    </div>
                  </CardContent>
                </Card>

                {/* Receitas */}
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Receitas</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(receitas)}</p>
                      </div>
                      <TrendingUp className="h-6 w-6 text-green-500 opacity-70" />
                    </div>
                  </CardContent>
                </Card>

                {/* Saldo Orçamentário */}
                <Card className={`border-l-4 ${saldoOrcamento >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo Orçamento</p>
                        <p className={`text-xl font-bold ${saldoOrcamento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {budget > 0 ? formatCurrency(saldoOrcamento) : "N/D"}
                        </p>
                      </div>
                      {saldoOrcamento >= 0 ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500 opacity-70" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-red-500 opacity-70" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Secondary KPIs Row */}
              <div className="grid grid-cols-3 gap-3">
                {/* Resultado Líquido */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Resultado Líquido</p>
                        <p className={`text-lg font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(saldo)}
                        </p>
                        <p className="text-xs text-muted-foreground">Receitas - Despesas</p>
                      </div>
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                {/* Total de Lançamentos */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Lançamentos</p>
                        <p className="text-lg font-bold">{entryCount}</p>
                        <p className="text-xs text-muted-foreground">
                          {reconciledCount} conciliados
                        </p>
                      </div>
                      <FolderKanban className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                {/* Pendentes */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Pendentes</p>
                        <p className={`text-lg font-bold ${pendingCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {pendingCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entryCount > 0 ? ((reconciledCount / entryCount) * 100).toFixed(0) : 0}% conciliado
                        </p>
                      </div>
                      {pendingCount > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Bar for Budget */}
              {budget > 0 && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Consumo do Orçamento</span>
                    <span className={`text-sm font-bold ${percentUsed > 100 ? 'text-red-600' : percentUsed > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {percentUsed.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(percentUsed, 100)} 
                    className={`h-3 ${percentUsed > 100 ? '[&>div]:bg-red-600' : percentUsed > 80 ? '[&>div]:bg-yellow-600' : ''}`}
                  />
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>Gasto: {formatCurrency(despesas)}</span>
                    <span>Disponível: {formatCurrency(Math.max(0, saldoOrcamento))}</span>
                  </div>
                </div>
              )}

              {/* Entries List */}
              <div>
                <h4 className="text-sm font-medium mb-2">Lançamentos do Projeto</h4>
                <ScrollArea className="h-[280px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Plano de Conta</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {realizedByProject[selectedProject.id]?.entries.map((entry: LedgerEntry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {format(new Date(entry.competence_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {entry.type === "RECEITA" ? (
                              <ArrowUpCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className="truncate max-w-[200px]">{entry.description}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entry.chart_account ? `${entry.chart_account.code} - ${entry.chart_account.name}` : "-"}
                        </TableCell>
                        <TableCell>
                          {entry.reconciled ? (
                            <Badge variant="secondary" className="text-xs">Conciliado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">{entry.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${entry.type === "RECEITA" ? "text-green-600" : "text-red-600"}`}>
                          {entry.type === "RECEITA" ? "+" : "-"}
                          {formatCurrency(Math.abs(Number(entry.amount)))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!realizedByProject[selectedProject.id]?.entries || realizedByProject[selectedProject.id].entries.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum lançamento vinculado a este projeto
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
          );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewEntriesOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
