import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProjectDetailSheet } from "./ProjectDetailSheet";
import { EditProjectDialog } from "./EditProjectDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

interface ProjectsTableProps {
  filters: any;
}

export function ProjectsTable({ filters }: ProjectsTableProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const { isMaster } = usePermissions();

  useEffect(() => {
    fetchProjects();
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
      .order("created_at", { ascending: false });

    if (filters.stage !== "Todos") {
      query = query.eq("stage", filters.stage);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    
    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  };

  const getStageBadge = (stage: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      captado: "default",
      orçamento: "secondary",
      aprovado: "outline",
      perdido: "destructive"
    };
    return <Badge variant={variants[stage] || "default"}>{stage}</Badge>;
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
        <div className="p-6 border-b bg-gradient-to-r from-background to-muted/20">
          <h2 className="text-xl font-semibold">Todos os Projetos</h2>
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
                <TableHead>Criado</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Carregando projetos...
                  </TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum projeto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{project.name || "Sem título"}</TableCell>
                    <TableCell>{project.client?.name || "N/A"}</TableCell>
                    <TableCell>{project.architect?.name || "Não atribuído"}</TableCell>
                    <TableCell>{getStageBadge(project.stage)}</TableCell>
                    <TableCell>R$ {project.value?.toLocaleString('pt-BR') || "0"}</TableCell>
                    <TableCell>{project.deadline ? format(new Date(project.deadline), "dd/MM/yyyy", { locale: ptBR }) : "Sem prazo"}</TableCell>
                    <TableCell>{format(new Date(project.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: ptBR })}
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
