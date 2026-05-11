import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProjectDetailSheet } from "./ProjectDetailSheet";
import { Skeleton } from "@/components/ui/skeleton";

interface KPIDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: string | string[];
  stageLabel: string;
  stageIcon: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  periodLabel: string;
  architectId?: string;
  onRefresh?: () => void;
}

interface ProjectEntry {
  id: string;
  project_id: string;
  project_name: string;
  architect_name: string | null;
  client_name: string | null;
  value: number | null;
  entry_date: string;
  project: any;
}

export function KPIDetailDialog({
  open,
  onOpenChange,
  stage,
  stageLabel,
  stageIcon,
  dateFrom,
  dateTo,
  periodLabel,
  architectId,
  onRefresh
}: KPIDetailDialogProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ProjectEntry[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (open && stage) {
      fetchProjectsForStage();
    }
  }, [open, stage, dateFrom, dateTo, architectId]);

  const fetchProjectsForStage = async () => {
    setLoading(true);
    
    try {
      // Query project_history for projects that entered this stage in the period
      let query = supabase
        .from('project_history')
        .select(`
          id,
          project_id,
          description,
          created_at,
          project:projects (
            id,
            name,
            value,
            stage,
            deadline,
            sent_date,
            architect_id,
            client:clients(name, phone),
            architect:architects(name)
          )
        `)
        .or(`event_type.eq.status,and(event_type.eq.sistema,description.ilike.Projeto criado no estágio:%)`)
        .order('created_at', { ascending: false });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Apply architect filter (same logic as RPC)
      const NO_ARCHITECT_UUID = '00000000-0000-0000-0000-000000000000';
      const shouldFilterArchitect = architectId && architectId !== '';
      const filterNoArchitect = architectId === NO_ARCHITECT_UUID;

      // Support multiple stages
      const stageArray = Array.isArray(stage) ? stage : [stage];
      const stagesNormalized = stageArray.map(s => 
        s.toLowerCase().replace(/ç/g, 'c').replace(/ /g, '_')
      );
      
      const filteredEntries: ProjectEntry[] = [];
      const seenProjects = new Set<string>();

      for (const entry of data || []) {
        if (!entry.project) continue;
        
        // Apply architect filter
        if (shouldFilterArchitect) {
          if (filterNoArchitect) {
            // Only projects without architect
            if (entry.project.architect_id !== null) continue;
          } else {
            // Only projects with this specific architect
            if (entry.project.architect_id !== architectId) continue;
          }
        }
        
        let targetStage = '';
        
        if (entry.description.includes('para "')) {
          // "Estágio alterado de X para "Y""
          const match = entry.description.match(/para "([^"]+)"/);
          if (match) {
            targetStage = match[1].toLowerCase().replace(/ç/g, 'c').replace(/ /g, '_');
          }
        } else if (entry.description.includes('Projeto criado no estágio:')) {
          // "Projeto criado no estágio: X"
          targetStage = entry.description
            .replace('Projeto criado no estágio:', '')
            .trim()
            .toLowerCase()
            .replace(/ç/g, 'c')
            .replace(/ /g, '_');
        }

        if (stagesNormalized.includes(targetStage) && !seenProjects.has(entry.project_id)) {
          seenProjects.add(entry.project_id);
          filteredEntries.push({
            id: entry.id,
            project_id: entry.project_id,
            project_name: entry.project.name,
            architect_name: entry.project.architect?.name || null,
            client_name: entry.project.client?.name || null,
            value: entry.project.value,
            entry_date: entry.created_at,
            project: entry.project
          });
        }
      }

      setEntries(filteredEntries);
    } catch (error) {
      console.error('Error fetching KPI details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = (entry: ProjectEntry) => {
    setSelectedProject(entry.project);
    setDetailOpen(true);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const totalValue = entries.reduce((sum, e) => sum + (e.value || 0), 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <span className="text-2xl">{stageIcon}</span>
                {stageLabel}
                <Badge variant="secondary" className="ml-2">
                  {entries.length} projeto{entries.length !== 1 ? 's' : ''}
                </Badge>
              </DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Projetos que entraram nesta etapa {periodLabel}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <span className="text-4xl mb-4">📭</span>
                <p>Nenhum projeto entrou nesta etapa no período selecionado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Profissional Parceiro</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Data de Entrada</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow 
                      key={entry.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleViewProject(entry)}
                    >
                      <TableCell className="font-medium">{entry.project_name}</TableCell>
                      <TableCell>{entry.architect_name || '-'}</TableCell>
                      <TableCell>{entry.client_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.value)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.entry_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProject(entry);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {!loading && entries.length > 0 && (
            <div className="flex-shrink-0 border-t pt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{entries.length}</span> projetos
              </div>
              <div className="text-lg font-semibold text-primary">
                {formatCurrency(totalValue)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ProjectDetailSheet
        project={selectedProject}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSuccess={() => {
          fetchProjectsForStage();
          onRefresh?.();
        }}
      />
    </>
  );
}
