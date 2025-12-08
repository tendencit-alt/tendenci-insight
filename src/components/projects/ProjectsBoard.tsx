import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProjectDetailSheet } from "./ProjectDetailSheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

interface ProjectsBoardProps {
  filters: any;
}

export function ProjectsBoard({ filters }: ProjectsBoardProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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
      .order("sent_date", { ascending: true });

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

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      recebido: "bg-blue-500",
      em_orcamento: "bg-purple-500",
      orcado: "bg-indigo-500",
      apresentado: "bg-cyan-500",
      em_negociacao: "bg-orange-500",
      aprovado: "bg-green-500",
      perdido: "bg-red-500"
    };
    return colors[stage] || "bg-gray-500";
  };

  const groupedProjects = {
    recebido: projects.filter(p => p.stage === "recebido"),
    em_orcamento: projects.filter(p => p.stage === "em_orcamento"),
    orcado: projects.filter(p => p.stage === "orcado"),
    apresentado: projects.filter(p => p.stage === "apresentado"),
    em_negociacao: projects.filter(p => p.stage === "em_negociacao"),
    aprovado: projects.filter(p => p.stage === "aprovado"),
    perdido: projects.filter(p => p.stage === "perdido")
  };

  const handleCardClick = (project: any) => {
    setSelectedProject(project);
    setDetailOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
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

  if (loading) {
    return <div className="text-center py-8">Carregando projetos...</div>;
  }

  return (
    <>
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4 lg:gap-6 min-w-max lg:min-w-0">
        {/* Recebido */}
        <div className="space-y-4 min-w-[280px] lg:min-w-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-lg">
            <span className="text-2xl">📥</span>
            <h3 className="font-semibold text-blue-700 dark:text-blue-400">
              Recebido ({groupedProjects.recebido.length})
            </h3>
          </div>
          <div className="space-y-3">
            {groupedProjects.recebido.map((project) => (
              <Card
                key={project.id}
                className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 relative group"
                onClick={() => handleCardClick(project)}
              >
                {isMaster && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteClick(e, project)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <h4 className="font-semibold mb-2">{project.name || "Sem título"}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {project.client?.name || "Cliente não definido"}
                </p>
                <div className="flex items-center justify-between">
                  <Badge className={getStageColor(project.stage)}>
                    R$ {project.value?.toLocaleString('pt-BR') || "0"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {project.deadline ? formatDistanceToNow(new Date(project.deadline), { addSuffix: true, locale: ptBR }) : "Sem prazo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {project.architect?.name || "Sem responsável"}
                </p>
              </Card>
            ))}
            {groupedProjects.recebido.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum projeto recebido
              </p>
            )}
          </div>
        </div>

        {/* Em Orçamento */}
        <div className="space-y-4 min-w-[280px] lg:min-w-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-lg">
            <span className="text-2xl">📝</span>
            <h3 className="font-semibold text-purple-700 dark:text-purple-400">
              Em Orçamento ({groupedProjects.em_orcamento.length})
            </h3>
          </div>
          <div className="space-y-3">
            {groupedProjects.em_orcamento.map((project) => (
              <Card
                key={project.id}
                className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500 relative group"
                onClick={() => handleCardClick(project)}
              >
                {isMaster && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteClick(e, project)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <h4 className="font-semibold mb-2">{project.name || "Sem título"}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {project.client?.name || "Cliente não definido"}
                </p>
                <div className="flex items-center justify-between">
                  <Badge className={getStageColor(project.stage)}>
                    R$ {project.value?.toLocaleString('pt-BR') || "0"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {project.sent_at ? formatDistanceToNow(new Date(project.sent_at), { addSuffix: true, locale: ptBR }) : "Sem prazo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {project.architect?.name || "Sem responsável"}
                </p>
              </Card>
            ))}
            {groupedProjects.em_orcamento.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum projeto em orçamento
              </p>
            )}
          </div>
        </div>

        {/* Orçado */}
        <div className="space-y-4 min-w-[280px] lg:min-w-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-lg">
            <span className="text-2xl">💰</span>
            <h3 className="font-semibold text-indigo-700 dark:text-indigo-400">
              Orçado ({groupedProjects.orcado.length})
            </h3>
          </div>
          <div className="space-y-3">
            {groupedProjects.orcado.map((project) => (
              <Card
                key={project.id}
                className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-indigo-500 relative group"
                onClick={() => handleCardClick(project)}
              >
                {isMaster && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteClick(e, project)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <h4 className="font-semibold mb-2">{project.name || "Sem título"}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {project.client?.name || "Cliente não definido"}
                </p>
                <div className="flex items-center justify-between">
                  <Badge className={getStageColor(project.stage)}>
                    R$ {project.value?.toLocaleString('pt-BR') || "0"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {project.deadline ? formatDistanceToNow(new Date(project.deadline), { addSuffix: true, locale: ptBR }) : "Sem prazo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {project.architect?.name || "Sem responsável"}
                </p>
              </Card>
            ))}
            {groupedProjects.orcado.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum projeto orçado
              </p>
            )}
          </div>
        </div>

        {/* Apresentado */}
        <div className="space-y-4 min-w-[280px] lg:min-w-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-lg">
            <span className="text-2xl">📊</span>
            <h3 className="font-semibold text-cyan-700 dark:text-cyan-400">
              Apresentado ({groupedProjects.apresentado.length})
            </h3>
          </div>
          <div className="space-y-3">
            {groupedProjects.apresentado.map((project) => (
              <Card
                key={project.id}
                className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-cyan-500 relative group"
                onClick={() => handleCardClick(project)}
              >
                {isMaster && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteClick(e, project)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <h4 className="font-semibold mb-2">{project.name || "Sem título"}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {project.client?.name || "Cliente não definido"}
                </p>
                <div className="flex items-center justify-between">
                  <Badge className={getStageColor(project.stage)}>
                    R$ {project.value?.toLocaleString('pt-BR') || "0"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {project.deadline ? formatDistanceToNow(new Date(project.deadline), { addSuffix: true, locale: ptBR }) : "Sem prazo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {project.architect?.name || "Sem responsável"}
                </p>
              </Card>
            ))}
            {groupedProjects.apresentado.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum projeto apresentado
              </p>
            )}
          </div>
        </div>

        {/* Em Negociação */}
        <div className="space-y-4 min-w-[280px] lg:min-w-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-lg">
            <span className="text-2xl">🤝</span>
            <h3 className="font-semibold text-orange-700 dark:text-orange-400">
              Em Negociação ({groupedProjects.em_negociacao.length})
            </h3>
          </div>
          <div className="space-y-3">
            {groupedProjects.em_negociacao.map((project) => (
              <Card
                key={project.id}
                className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500 relative group"
                onClick={() => handleCardClick(project)}
              >
                {isMaster && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteClick(e, project)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <h4 className="font-semibold mb-2">{project.name || "Sem título"}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {project.client?.name || "Cliente não definido"}
                </p>
                <div className="flex items-center justify-between">
                  <Badge className={getStageColor(project.stage)}>
                    R$ {project.value?.toLocaleString('pt-BR') || "0"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {project.deadline ? formatDistanceToNow(new Date(project.deadline), { addSuffix: true, locale: ptBR }) : "Sem prazo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {project.architect?.name || "Sem responsável"}
                </p>
              </Card>
            ))}
            {groupedProjects.em_negociacao.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum projeto em negociação
              </p>
            )}
          </div>
        </div>

        {/* Aprovado */}
        <div className="space-y-4 min-w-[280px] lg:min-w-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-lg">
            <span className="text-2xl">✅</span>
            <h3 className="font-semibold text-green-700 dark:text-green-400">
              Aprovado ({groupedProjects.aprovado.length})
            </h3>
          </div>
          <div className="space-y-3">
            {groupedProjects.aprovado.map((project) => (
              <Card
                key={project.id}
                className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500 relative group"
                onClick={() => handleCardClick(project)}
              >
                {isMaster && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteClick(e, project)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <h4 className="font-semibold mb-2">{project.name || "Sem título"}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {project.client?.name || "Cliente não definido"}
                </p>
                <div className="flex items-center justify-between">
                  <Badge className={getStageColor(project.stage)}>
                    R$ {project.value?.toLocaleString('pt-BR') || "0"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {project.sent_at ? formatDistanceToNow(new Date(project.sent_at), { addSuffix: true, locale: ptBR }) : "Sem prazo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {project.architect?.name || "Sem responsável"}
                </p>
              </Card>
            ))}
            {groupedProjects.aprovado.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum projeto aprovado
              </p>
            )}
          </div>
        </div>

        {/* Perdido */}
        <div className="space-y-4 min-w-[280px] lg:min-w-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-lg">
            <span className="text-2xl">❌</span>
            <h3 className="font-semibold text-red-700 dark:text-red-400">
              Perdido ({groupedProjects.perdido.length})
            </h3>
          </div>
          <div className="space-y-3">
            {groupedProjects.perdido.map((project) => (
              <Card
                key={project.id}
                className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500 relative group"
                onClick={() => handleCardClick(project)}
              >
                {isMaster && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteClick(e, project)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <h4 className="font-semibold mb-2">{project.name || "Sem título"}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {project.client?.name || "Cliente não definido"}
                </p>
                <div className="flex items-center justify-between">
                  <Badge className={getStageColor(project.stage)}>
                    R$ {project.value?.toLocaleString('pt-BR') || "0"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {project.sent_at ? formatDistanceToNow(new Date(project.sent_at), { addSuffix: true, locale: ptBR }) : "Sem prazo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {project.architect?.name || "Sem responsável"}
                </p>
              </Card>
            ))}
            {groupedProjects.perdido.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum projeto perdido
              </p>
            )}
          </div>
        </div>
        </div>
      </div>

      {selectedProject && (
        <ProjectDetailSheet
          project={selectedProject}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onSuccess={fetchProjects}
        />
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
