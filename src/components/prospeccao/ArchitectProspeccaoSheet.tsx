import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Instagram, 
  Calendar,
  Package,
  Tag as TagIcon,
  TrendingUp,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { CreateClientFromArchitectDialog } from "./CreateClientFromArchitectDialog";
import { EditArchitectDialog } from "@/components/architects/EditArchitectDialog";
import { ArchitectTasks } from "./ArchitectTasks";
import { ArchitectHistory } from "./ArchitectHistory";
import { ArchitectTimeline } from "./ArchitectTimeline";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ArchitectProspeccaoSheetProps {
  architectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArchitectProspeccaoSheet({ 
  architectId, 
  open, 
  onOpenChange 
}: ArchitectProspeccaoSheetProps) {
  const { toast } = useToast();
  const { hasModuleAccess } = usePermissions();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [isEditArchitectOpen, setIsEditArchitectOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Verificar permissão de exclusão
  const canDeleteArchitects = hasModuleAccess("configuracoes" as any, "delete");

  // Função para excluir profissional parceiro permanentemente
  const handleDeleteArchitect = async () => {
    if (!architectId) return;
    
    setIsDeleting(true);
    try {
      // Chamar função RPC que exclui de forma segura
      const { data, error } = await supabase.rpc('delete_architect_safely', {
        p_architect_id: architectId
      });

      if (error) {
        console.error('Erro ao excluir profissional parceiro:', error);
        
        // Verificar se é erro de registros vinculados
        if (error.message.includes('leads') || error.message.includes('deals') || 
            error.message.includes('orders') || error.message.includes('projects')) {
          toast({
            title: "Não foi possível excluir",
            description: "Este profissional parceiro possui registros vinculados (leads, negociações, pedidos ou projetos). Remova-os primeiro.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao excluir",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Profissional Parceiro excluído",
        description: "O profissional parceiro foi removido permanentemente do sistema.",
      });

      // Fechar sheet e atualizar queries
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["prospeccao-architects"] });
      queryClient.invalidateQueries({ queryKey: ["architects"] });
      
    } catch (err) {
      console.error('Exceção ao excluir:', err);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao tentar excluir o profissional parceiro.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Buscar dados do profissional parceiro usando React Query
  const { data: architect } = useQuery({
    queryKey: ["architect-detail", architectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("architects")
        .select(`
          *,
          vendedor:profiles!architects_vendedor_responsavel_fkey(full_name, email, avatar_url)
        `)
        .eq("id", architectId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!architectId && open,
  });

  // Buscar projetos do profissional parceiro
  const { data: projects } = useQuery({
    queryKey: ["architect-projects", architectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, stage, value, created_at")
        .eq("architect_id", architectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!architectId && open,
  });

  if (!architect) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted/50 rounded" />
            <div className="h-40 bg-muted/30 rounded" />
            <div className="h-40 bg-muted/30 rounded" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Gerar tags automáticas
  const tags: string[] = [];
  
  if (!architect.data_primeiro_contato && !architect.data_ultimo_contato) tags.push("Nunca Contactado");
  if (architect.status_funil === "em_conversa") tags.push("Em Conversa");
  if (architect.status_funil === "interessado") tags.push("Interessado");
  if (architect.status_funil === "reuniao_agendada") tags.push("Reunião Agendada");
  if (architect.status_funil === "parceiro_ativo") tags.push("Parceiro Ativo");
  if (architect.status_funil === "sem_interesse") tags.push("Sem Interesse");
  if (projects && projects.length > 0) tags.push("Efetivado");

  // Calcular dias sem contato
  const daysSinceContact = architect.data_ultimo_contato 
    ? Math.floor((Date.now() - new Date(architect.data_ultimo_contato).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (daysSinceContact && daysSinceContact > 30) {
    tags.push(`Sem Contato (${daysSinceContact}d)`);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-3">
              {architect.name}
              <Badge variant="secondary" className="text-xs">
                @{architect.vendedor?.full_name || architect.vendedor?.email || "Sem vendedor"}
              </Badge>
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditArchitectOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              
              {canDeleteArchitects && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Excluir Profissional Parceiro Permanentemente
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          Você está prestes a excluir <strong>{architect?.name}</strong> permanentemente.
                        </p>
                        <p className="text-destructive font-medium">
                          Esta ação não pode ser desfeita!
                        </p>
                        <p>
                          Serão excluídos também: histórico, timeline, tarefas agendadas, arquivos e logs de prospecção.
                        </p>
                        <p>
                          Se houver leads, negociações, pedidos ou projetos vinculados, a exclusão será bloqueada.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteArchitect}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Excluindo..." : "Excluir Permanentemente"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="projects">Projetos</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            {/* Tags Automáticas */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Tags Automáticas</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="bg-primary/5">
                    {tag}
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma tag gerada</p>
                )}
              </div>
            </Card>

            {/* Dados de Prospecção */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Dados de Prospecção
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditArchitectOpen(true)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Status no Funil:</span>
                  <Badge className="ml-2 bg-primary text-primary-foreground">
                    {architect.status_funil || "Novo Profissional Parceiro"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Vendedor Responsável:</span>
                  <span className="ml-2 font-medium">
                    {architect.vendedor?.full_name || architect.vendedor?.email || "Não atribuído"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tier:</span>
                  <Badge variant="outline" className="ml-2">{architect.tier || "B"}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Origem:</span>
                  <span className="ml-2">{architect.origem || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Primeiro Contato:</span>
                  <span className="ml-2">
                    {architect.data_primeiro_contato 
                      ? format(new Date(architect.data_primeiro_contato), "dd/MM/yyyy HH:mm")
                      : (!architect.data_ultimo_contato ? "Nunca contactado" : "-")
                    }
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Último Contato:</span>
                  <span className="ml-2">
                    {architect.data_ultimo_contato 
                      ? format(new Date(architect.data_ultimo_contato), "dd/MM/yyyy HH:mm")
                      : "-"
                    }
                  </span>
                </div>
              </div>
            </Card>

            {/* Informações de Contato */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Informações de Contato</h3>
              <div className="space-y-3 text-sm">
                {architect.company && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{architect.company}</span>
                  </div>
                )}
                {architect.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{architect.city}</span>
                  </div>
                )}
                {architect.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{architect.phone}</span>
                  </div>
                )}
                {architect.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{architect.email}</span>
                  </div>
                )}
                {architect.instagram && (
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    <span>{architect.instagram}</span>
                  </div>
                )}
                {architect.birthday && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(architect.birthday), "dd/MM/yyyy")}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Botão para abrir no módulo Profissionais Parceiros */}
            <Button variant="outline" className="w-full gap-2" asChild>
              <a href={`/architects`}>
                <ExternalLink className="h-4 w-4" />
                Abrir no Módulo Profissionais Parceiros
              </a>
            </Button>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <ArchitectHistory architectId={architectId} />
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Projetos Enviados
                </h3>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => setIsCreateClientOpen(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Cliente
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setIsCreateProjectOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Projeto
                  </Button>
                </div>
              </div>
              
              {projects && projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <Card key={project.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{project.name}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{project.stage}</Badge>
                            <span className="text-sm text-muted-foreground">
                              R$ {project.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(project.created_at), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href="/projects">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum projeto enviado ainda
                </p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card className="p-4">
              <ArchitectTasks architectId={architectId} />
            </Card>
            
            <Card className="p-4 mt-4">
              <ArchitectTimeline architectId={architectId} />
            </Card>
          </TabsContent>
        </Tabs>

        <CreateProjectDialog
          open={isCreateProjectOpen}
          onOpenChange={setIsCreateProjectOpen}
          preSelectedArchitectId={architectId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["architect-projects", architectId] });
            queryClient.invalidateQueries({ queryKey: ["prospeccao-architects"] });
            toast({
              title: "Sucesso",
              description: "Projeto criado com sucesso!",
            });
            setIsCreateProjectOpen(false);
          }}
        />

        <CreateClientFromArchitectDialog
          open={isCreateClientOpen}
          onOpenChange={setIsCreateClientOpen}
          architectId={architectId}
          architectName={architect?.name || ""}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["architect-projects", architectId] });
            queryClient.invalidateQueries({ queryKey: ["prospeccao-architects"] });
            toast({
              title: "Sucesso",
              description: "Cliente cadastrado com sucesso!",
            });
            setIsCreateClientOpen(false);
          }}
        />

        <EditArchitectDialog
          open={isEditArchitectOpen}
          onOpenChange={setIsEditArchitectOpen}
          architect={architect}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["architect-detail", architectId] });
            queryClient.invalidateQueries({ queryKey: ["architect-projects", architectId] });
            queryClient.invalidateQueries({ queryKey: ["prospeccao-architects"] });
            toast({
              title: "Sucesso",
              description: "Profissional Parceiro atualizado com sucesso!",
            });
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
