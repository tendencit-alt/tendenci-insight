import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, AlertTriangle, CheckCircle2 } from "lucide-react";

export function ProjectKPIs() {
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
                  <TableCell className="text-right font-medium">
                    {budget > 0 ? formatCurrency(budget) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={executed > 0 ? "text-orange-600 font-medium" : ""}>
                      {executed > 0 ? formatCurrency(executed) : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {budget > 0 ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(available)}
                        </span>
                        {isOverBudget && <AlertTriangle className="h-4 w-4 text-red-600" />}
                        {!isOverBudget && percent <= 80 && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {isNearLimit && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {budget > 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            {formatCurrency(executed)} de {formatCurrency(budget)}
                          </span>
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
  );
}
