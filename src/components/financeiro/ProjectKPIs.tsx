import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FolderKanban, AlertTriangle, CheckCircle2, Pencil, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { isProjectVisibleInKpis } from "@/lib/projectKpiVisibility";
import { toast } from "sonner";

interface ProjectEntriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  filterType: "all" | "budget" | "executed" | "available";
}

function ProjectEntriesDialog({ open, onOpenChange, projectId, projectName, filterType }: ProjectEntriesDialogProps) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["project-entries-dialog", projectId, filterType],
    queryFn: async () => {
      let query = supabase
        .from("fin_ledger_entries")
        .select(`
          *,
          chart_account:fin_chart_accounts(name, code),
          cost_center:fin_cost_centers(name)
        `)
        .eq("project_id", projectId)
        .neq("status", "CANCELADO")
        .order("competence_date", { ascending: false });

      if (filterType === "executed") {
        query = query.eq("type", "DESPESA");
      }

      const { data } = await query;

      return (data || []).sort((a: any, b: any) => {
        const normalizeText = (value?: string | null) =>
          (value || "").trim().toLocaleLowerCase("pt-BR");

        const costCenterCompare = normalizeText(a.cost_center?.name).localeCompare(
          normalizeText(b.cost_center?.name),
          "pt-BR"
        );

        if (costCenterCompare !== 0) return costCenterCompare;

        const amountCompare = Math.abs(Number(b.amount || 0)) - Math.abs(Number(a.amount || 0));

        if (amountCompare !== 0) return amountCompare;

        const descriptionCompare = normalizeText(a.description).localeCompare(
          normalizeText(b.description),
          "pt-BR"
        );

        if (descriptionCompare !== 0) return descriptionCompare;

        const dateA = a.competence_date ? new Date(a.competence_date).getTime() : 0;
        const dateB = b.competence_date ? new Date(b.competence_date).getTime() : 0;

        return dateB - dateA;
      });
    },
    enabled: open,
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getTitle = () => {
    switch (filterType) {
      case "budget": return `Orçamento - ${projectName}`;
      case "executed": return `Executado - ${projectName}`;
      case "available": return `Disponível - ${projectName}`;
      default: return `Lançamentos - ${projectName}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !entries || entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum lançamento encontrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(entry.competence_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>
                      {entry.chart_account ? (
                        <span className="text-sm">
                          {entry.chart_account.code} - {entry.chart_account.name}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {entry.cost_center?.name || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={entry.type === "RECEITA" ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(Math.abs(Number(entry.amount)))}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
}

function EditProjectDialog({ open, onOpenChange, project }: EditProjectDialogProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(project?.status || "ativo");
  const [budgetPercent, setBudgetPercent] = useState(String(project?.budget_percent ?? 50));

  // Reset state when project changes
  useState(() => {});
  if (project) {
    // Use useEffect-like pattern to sync
  }
}

  const updateMutation = useMutation({
    mutationFn: async () => {
      const percent = parseFloat(budgetPercent);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        throw new Error("Percentual deve ser entre 0 e 100");
      }

      const updateData: any = {
        status,
        budget_percent: percent,
      };

      if (status === "concluido" && project.status !== "concluido") {
        updateData.end_date = new Date().toISOString().split("T")[0];
      }
      if (status === "ativo" && project.status === "concluido") {
        updateData.end_date = null;
      }

      const { error } = await supabase
        .from("fin_projects")
        .update(updateData)
        .eq("id", project.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fin-projects-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["fin-projects-active"] });
      toast.success("Projeto atualizado com sucesso");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar projeto");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Projeto: {project?.name}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="concluido">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Percentual do Orçamento (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              value={budgetPercent}
              onChange={(e) => setBudgetPercent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              O orçamento será calculado como {budgetPercent || 0}% do valor total dos pedidos vinculados
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectKPIs() {
  const [statusFilter, setStatusFilter] = useState<"ativo" | "concluido">("ativo");
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    name: string;
    filterType: "all" | "budget" | "executed" | "available";
  } | null>(null);
  const [editProject, setEditProject] = useState<any>(null);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["fin-projects-kpis", statusFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_projects")
        .select("*")
        .eq("status", statusFilter)
        .order("name");
      return data || [];
    },
  });

  const { data: ledgerEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ["fin-ledger-entries-projects-kpis"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_ledger_entries")
        .select("project_id, amount, type, status")
        .not("project_id", "is", null)
        .neq("status", "CANCELADO");
      return data || [];
    },
  });

  const realizedByProject = useMemo(() => {
    const result: Record<string, number> = {};
    ledgerEntries?.forEach((entry: any) => {
      if (!entry.project_id) return;
      if (!result[entry.project_id]) result[entry.project_id] = 0;
      if (entry.type === "DESPESA") {
        result[entry.project_id] += Math.abs(Number(entry.amount));
      }
    });
    return result;
  }, [ledgerEntries]);

  const visibleProjects = useMemo(
    () =>
      (projects || []).filter((project) =>
        isProjectVisibleInKpis(project, realizedByProject[project.id] || 0),
      ),
    [projects, realizedByProject],
  );

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleCellClick = (projectId: string, projectName: string, filterType: "all" | "budget" | "executed" | "available") => {
    setSelectedProject({ id: projectId, name: projectName, filterType });
  };

  const isLoading = projectsLoading || entriesLoading;
  const title = statusFilter === "ativo" ? "KPIs de Projetos Ativos" : "KPIs de Projetos Finalizados";

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            {title}
          </CardTitle>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "ativo" | "concluido")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="concluido">Finalizados</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {!visibleProjects || visibleProjects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum projeto {statusFilter === "ativo" ? "ativo com orçamento ou movimentação" : "finalizado"} cadastrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Projeto</TableHead>
                  <TableHead className="text-right w-[100px]">% Orç.</TableHead>
                  <TableHead className="text-right w-[120px]">Orçamento</TableHead>
                  <TableHead className="text-right w-[120px]">Executado</TableHead>
                  <TableHead className="text-right w-[120px]">Disponível</TableHead>
                  <TableHead className="w-[280px]">Progresso</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProjects.map((project: any) => {
                  const budget = Number(project.budget) || 0;
                  const executed = realizedByProject[project.id] || 0;
                  const available = budget - executed;
                  const percent = budget > 0 ? (executed / budget) * 100 : 0;
                  const isOverBudget = available < 0;
                  const isNearLimit = percent > 80 && percent <= 100;
                  const budgetPct = project.budget_percent ?? 50;

                  return (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="font-medium">{project.name}</div>
                        <div className="flex items-center gap-2">
                          {project.code && (
                            <span className="text-xs text-muted-foreground">{project.code}</span>
                          )}
                          {statusFilter === "concluido" && project.end_date && (
                            <Badge variant="secondary" className="text-[10px]">
                              Finalizado {format(new Date(project.end_date), "dd/MM/yyyy")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {budgetPct}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleCellClick(project.id, project.name, "budget")}
                          className="font-medium hover:underline hover:text-primary cursor-pointer transition-colors"
                        >
                          {budget > 0 ? formatCurrency(budget) : "-"}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleCellClick(project.id, project.name, "executed")}
                          className={`hover:underline cursor-pointer transition-colors ${executed > 0 ? "text-orange-600 font-medium hover:text-orange-700" : "hover:text-primary"}`}
                        >
                          {executed > 0 ? formatCurrency(executed) : "-"}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        {budget > 0 ? (
                          <button
                            onClick={() => handleCellClick(project.id, project.name, "available")}
                            className="flex items-center justify-end gap-2 hover:underline cursor-pointer transition-colors w-full"
                          >
                            <span className={`font-medium ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                              {formatCurrency(available)}
                            </span>
                            {isOverBudget && <AlertTriangle className="h-4 w-4 text-destructive" />}
                            {!isOverBudget && percent <= 80 && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            {isNearLimit && <AlertTriangle className="h-4 w-4 text-accent-foreground" />}
                          </button>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {budget > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <button
                                onClick={() => handleCellClick(project.id, project.name, "all")}
                                className="text-muted-foreground hover:underline cursor-pointer hover:text-primary transition-colors"
                              >
                                {formatCurrency(executed)} de {formatCurrency(budget)}
                              </button>
                              <Badge 
                                variant={isOverBudget ? "destructive" : isNearLimit ? "outline" : "secondary"}
                                className="text-xs"
                              >
                                {percent.toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
                              <div 
                                className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                                  isOverBudget 
                                    ? 'bg-destructive' 
                                    : isNearLimit 
                                      ? 'bg-accent' 
                                      : 'bg-primary'
                                }`}
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                              {isOverBudget && (
                                <div 
                                  className="absolute inset-y-0 right-0 bg-destructive/30 rounded-r-full"
                                  style={{ width: `${Math.min(percent - 100, 50)}%` }}
                                />
                              )}
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>0%</span>
                              <span>50%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem orçamento</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditProject(project)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedProject && (
        <ProjectEntriesDialog
          open={!!selectedProject}
          onOpenChange={(open) => !open && setSelectedProject(null)}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          filterType={selectedProject.filterType}
        />
      )}

      {editProject && (
        <EditProjectDialog
          open={!!editProject}
          onOpenChange={(open) => !open && setEditProject(null)}
          project={editProject}
        />
      )}
    </>
  );
}
