import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";
import { ProjectDetailSheet } from "./ProjectDetailSheet";
import { ProjectCard } from "./ProjectCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

interface ProjectsBoardProps {
  filters: any;
}

const STAGE_CONFIG = [
  { key: 'recebido', label: 'Recebido', icon: '📥', color: 'bg-blue-500/10', textColor: 'text-blue-700 dark:text-blue-400', borderColor: 'border-l-blue-500' },
  { key: 'em_orcamento', label: 'Em Orçamento', icon: '📝', color: 'bg-purple-500/10', textColor: 'text-purple-700 dark:text-purple-400', borderColor: 'border-l-purple-500' },
  { key: 'orcado', label: 'Orçado', icon: '💰', color: 'bg-indigo-500/10', textColor: 'text-indigo-700 dark:text-indigo-400', borderColor: 'border-l-indigo-500' },
  { key: 'apresentado', label: 'Apresentado', icon: '📊', color: 'bg-cyan-500/10', textColor: 'text-cyan-700 dark:text-cyan-400', borderColor: 'border-l-cyan-500' },
  { key: 'em_negociacao', label: 'Em Negociação', icon: '🤝', color: 'bg-orange-500/10', textColor: 'text-orange-700 dark:text-orange-400', borderColor: 'border-l-orange-500' },
  { key: 'aprovado', label: 'Aprovado', icon: '✅', color: 'bg-green-500/10', textColor: 'text-green-700 dark:text-green-400', borderColor: 'border-l-green-500' },
  { key: 'perdido', label: 'Perdido', icon: '❌', color: 'bg-red-500/10', textColor: 'text-red-700 dark:text-red-400', borderColor: 'border-l-red-500' }
];

// Helper para ordenar projetos (vencidos primeiro, depois por dias restantes)
const sortByDeadlinePriority = (projects: any[]): any[] => {
  return [...projects].sort((a, b) => {
    const DELIVERED_STAGES = ['orcado', 'apresentado', 'em_negociacao', 'aprovado'];
    
    const getDays = (project: any) => {
      if (project.stage && DELIVERED_STAGES.includes(project.stage)) return Infinity;
      if (!project.deadline) return Infinity - 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadlineDate = new Date(project.deadline);
      deadlineDate.setHours(0, 0, 0, 0);
      return Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };
    
    return getDays(a) - getDays(b);
  });
};

export function ProjectsBoard({ filters }: ProjectsBoardProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const { isMaster } = usePermissions();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("projects")
      .select(`
        *,
        client:clients(name, phone),
        architect:architects(name)
      `)
      .order("sent_date", { ascending: true });

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
      const days = parseInt(filters.period);
      if (!isNaN(days)) {
        const startDate = subDays(new Date(), days).toISOString();
        query = query.gte("created_at", startDate);
      }
    }

    // Busca em nome, cliente e arquiteto
    if (filters.search) {
      // Primeiro buscamos todos os dados e filtramos no cliente
      // porque Supabase não suporta busca em relações diretamente no .or()
    }

    const { data, error } = await query;
    
    if (!error && data) {
      let filteredData = data;
      
      // Filtro de busca client-side para incluir cliente e arquiteto
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = data.filter(p => 
          (p.name?.toLowerCase().includes(searchLower)) ||
          (p.client?.name?.toLowerCase().includes(searchLower)) ||
          (p.architect?.name?.toLowerCase().includes(searchLower))
        );
      }
      
      setProjects(filteredData);
    }
    setLoading(false);
  }, [filters]);

  // Fetch inicial e quando filtros mudam
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('projects-board-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          // Debounce simples para evitar múltiplos refetches
          const timeout = setTimeout(() => fetchProjects(), 500);
          return () => clearTimeout(timeout);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProjects]);

  const handleCardClick = (project: any) => {
    setSelectedProject(project);
    setDetailOpen(true);
  };

  const handleDeleteClick = (project: any) => {
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

  // Agrupar projetos por estágio
  const groupedProjects = STAGE_CONFIG.reduce((acc, stage) => {
    acc[stage.key] = sortByDeadlinePriority(projects.filter(p => p.stage === stage.key));
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) {
    return <div className="text-center py-8">Carregando projetos...</div>;
  }

  return (
    <>
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4 lg:gap-6 min-w-max lg:min-w-0">
          {STAGE_CONFIG.map((stage) => (
            <div key={stage.key} className="space-y-4 min-w-[280px] lg:min-w-0">
              <div className={`flex items-center gap-2 px-4 py-2 ${stage.color} rounded-lg`}>
                <span className="text-2xl">{stage.icon}</span>
                <h3 className={`font-semibold ${stage.textColor}`}>
                  {stage.label} ({groupedProjects[stage.key]?.length || 0})
                </h3>
              </div>
              <div className="space-y-3">
                {groupedProjects[stage.key]?.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onView={handleCardClick}
                    onDelete={handleDeleteClick}
                    showDeleteButton={isMaster}
                  />
                ))}
                {(!groupedProjects[stage.key] || groupedProjects[stage.key].length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum projeto {stage.label.toLowerCase()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Detail Sheet */}
      <ProjectDetailSheet
        project={selectedProject}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSuccess={fetchProjects}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o projeto "{projectToDelete?.name}"? 
              Esta ação não pode ser desfeita e todos os arquivos anexados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
