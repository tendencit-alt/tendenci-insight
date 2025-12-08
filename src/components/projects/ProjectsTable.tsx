import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProjectDetailSheet } from "./ProjectDetailSheet";
import { EditProjectDialog } from "./EditProjectDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

interface ProjectsTableProps {
  filters: any;
}

const ITEMS_PER_PAGE = 20;

// Mapeamento de estágios para exibição
const STAGE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  recebido: { label: "Recebido", variant: "default" },
  em_orcamento: { label: "Em Orçamento", variant: "secondary" },
  orcado: { label: "Orçado", variant: "outline" },
  apresentado: { label: "Apresentado", variant: "outline" },
  em_negociacao: { label: "Em Negociação", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  perdido: { label: "Perdido", variant: "destructive" }
};

export function ProjectsTable({ filters }: ProjectsTableProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { isMaster } = usePermissions();

  useEffect(() => {
    fetchProjects();
    setCurrentPage(1); // Reset page when filters change
  }, [filters]);

  const fetchProjects = async () => {
    setLoading(true);
    let query = supabase
      .from("projects")
      .select(`
        *,
        client:clients(name, phone),
        architect:architects(name),
        deal:deals(title)
      `)
      .order("sent_date", { ascending: true, nullsFirst: false });

    // Filtro de estágio
    if (filters.stage && filters.stage !== "Todos") {
      query = query.eq("stage", filters.stage);
    }

    // Filtro de arquiteto
    if (filters.architect && filters.architect !== "Todos") {
      if (filters.architect === "sem-arquiteto") {
        query = query.is("architect_id", null);
      } else {
        query = query.eq("architect_id", filters.architect);
      }
    }

    // Filtro de período
    if (filters.period && filters.period !== "all") {
      const periodDays: Record<string, number> = {
        last_7_days: 7,
        last_30_days: 30,
        last_60_days: 60,
        last_90_days: 90
      };
      const days = periodDays[filters.period];
      if (days) {
        const startDate = subDays(new Date(), days).toISOString();
        query = query.gte("created_at", startDate);
      }
    }

    // Filtro de busca
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    
    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  };

  // Paginação
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return projects.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [projects, currentPage]);

  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);

  const getStageBadge = (stage: string) => {
    const config = STAGE_CONFIG[stage] || { label: stage, variant: "default" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleView = (project: any) => {
    setSelectedProject(project);
    setDetailOpen(true);
  };

  const handleEdit = (project: any) => {
    setSelectedProject(project);
    setEditOpen(true);
  };

  const handleDelete = (project: any) => {
    setProjectToDelete(project);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      // Delete project files from storage
      const { data: files } = await supabase
        .from('project_files')
        .select('file_path')
        .eq('project_id', projectToDelete.id);

      if (files) {
        for (const file of files) {
          await supabase.storage
            .from('project-files')
            .remove([file.file_path]);
        }
      }

      // Delete project (cascade will handle related records)
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete.id);

      if (error) throw error;

      toast.success('Projeto excluído com sucesso!');
      fetchProjects();
      setDeleteOpen(false);
      setProjectToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir projeto');
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-background to-muted/20 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Todos os Projetos</h2>
          <span className="text-sm text-muted-foreground">
            {projects.length} projeto(s) encontrado(s)
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Arquiteto</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>Valor (R$)</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando projetos...
                  </TableCell>
                </TableRow>
              ) : paginatedProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum projeto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProjects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {project.name || "Sem título"}
                        {!project.architect_id && (
                          <span title="Sem arquiteto">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{project.client?.name || "N/A"}</TableCell>
                    <TableCell>{project.architect?.name || <span className="text-orange-500">Não atribuído</span>}</TableCell>
                    <TableCell>{getStageBadge(project.stage)}</TableCell>
                    <TableCell>R$ {project.value?.toLocaleString('pt-BR') || "0"}</TableCell>
                    <TableCell>
                      {project.deadline 
                        ? format(new Date(project.deadline), "dd/MM/yyyy", { locale: ptBR }) 
                        : "Sem prazo"
                      }
                    </TableCell>
                    <TableCell>
                      {project.sent_date 
                        ? format(new Date(project.sent_date), "dd/MM/yyyy", { locale: ptBR })
                        : project.created_at
                          ? format(new Date(project.created_at), "dd/MM/yyyy", { locale: ptBR })
                          : "-"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleView(project)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(project)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {isMaster && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDelete(project)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {selectedProject && (
        <>
          <ProjectDetailSheet project={selectedProject} open={detailOpen} onOpenChange={setDetailOpen} onSuccess={fetchProjects} />
          <EditProjectDialog project={selectedProject} open={editOpen} onOpenChange={setEditOpen} onSuccess={fetchProjects} />
        </>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir o projeto <strong>{projectToDelete?.name}</strong>? 
              Esta ação não pode ser desfeita e todos os arquivos e histórico serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
