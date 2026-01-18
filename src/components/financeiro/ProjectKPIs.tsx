import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderKanban, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
        .order("competence_date", { ascending: false });

      // Filter by type if needed
      if (filterType === "executed") {
        query = query.eq("type", "DESPESA");
      }

      const { data } = await query;
      return data || [];
    },
    enabled: open,
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getTitle = () => {
    switch (filterType) {
      case "budget":
        return `Orçamento - ${projectName}`;
      case "executed":
        return `Executado - ${projectName}`;
      case "available":
        return `Disponível - ${projectName}`;
      default:
        return `Lançamentos - ${projectName}`;
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

export function ProjectKPIs() {
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    name: string;
    filterType: "all" | "budget" | "executed" | "available";
  } | null>(null);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["fin-projects-active-kpis"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_projects")
        .select("*")
        .eq("status", "ativo")
        .order("name");
      return data || [];
    },
  });

  const { data: ledgerEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ["fin-ledger-entries-projects-kpis"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_ledger_entries")
        .select("project_id, amount, type")
        .not("project_id", "is", null);
      return data || [];
    },
  });

  // Calculate realized amounts per project
  const realizedByProject = useMemo(() => {
    const result: Record<string, number> = {};
    
    ledgerEntries?.forEach((entry: any) => {
      if (!entry.project_id) return;
      
      if (!result[entry.project_id]) {
        result[entry.project_id] = 0;
      }
      
      // Only count expenses (DESPESA) as executed/realized
      if (entry.type === "DESPESA") {
        result[entry.project_id] += Math.abs(Number(entry.amount));
      }
    });
    
    return result;
  }, [ledgerEntries]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleCellClick = (projectId: string, projectName: string, filterType: "all" | "budget" | "executed" | "available") => {
    setSelectedProject({ id: projectId, name: projectName, filterType });
  };

  const isLoading = projectsLoading || entriesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            KPIs de Projetos Ativos
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

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            KPIs de Projetos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhum projeto ativo cadastrado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            KPIs de Projetos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Projeto</TableHead>
                <TableHead className="text-right w-[120px]">Orçamento</TableHead>
                <TableHead className="text-right w-[120px]">Executado</TableHead>
                <TableHead className="text-right w-[120px]">Disponível</TableHead>
                <TableHead className="w-[300px]">Progresso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                const budget = Number(project.budget) || 0;
                const executed = realizedByProject[project.id] || 0;
                const available = budget - executed;
                const percent = budget > 0 ? (executed / budget) * 100 : 0;
                const isOverBudget = available < 0;
                const isNearLimit = percent > 80 && percent <= 100;

                return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="font-medium">{project.name}</div>
                      {project.code && (
                        <div className="text-xs text-muted-foreground">{project.code}</div>
                      )}
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
                          <span className={`font-medium ${isOverBudget ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}>
                            {formatCurrency(available)}
                          </span>
                          {isOverBudget && <AlertTriangle className="h-4 w-4 text-red-600" />}
                          {!isOverBudget && percent <= 80 && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          {isNearLimit && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
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
                                  ? 'bg-red-500' 
                                  : isNearLimit 
                                    ? 'bg-yellow-500' 
                                    : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                            {isOverBudget && (
                              <div 
                                className="absolute inset-y-0 right-0 bg-red-600/30 rounded-r-full"
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
    </>
  );
}
