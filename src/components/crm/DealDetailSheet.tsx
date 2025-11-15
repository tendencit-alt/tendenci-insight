import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, CheckCircle, XCircle, FileText, User, Users, Phone, Settings, Clock, FolderOpen, Plus, Unlink, Mail, MapPin, Package, TrendingUp, DollarSign, ExternalLink, Calendar, Tag as TagIcon, History } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EditDealDialog } from "./EditDealDialog";
import { DealTimeline } from "./DealTimeline";
import { DealTasks } from "./DealTasks";
import { ProjectDetailSheet } from "../projects/ProjectDetailSheet";
import { CreateProjectDialog } from "../projects/CreateProjectDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DealFileUpload } from "./DealFileUpload";

interface DealDetailSheetProps {
  deal: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DealDetailSheet({
  deal,
  open,
  onOpenChange,
  onSuccess,
}: DealDetailSheetProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [lostDialog, setLostDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [lostNote, setLostNote] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [allStages, setAllStages] = useState<any[]>([]);
  const [selectedStage, setSelectedStage] = useState("");
  const [allPipelines, setAllPipelines] = useState<any[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState("");
  const [project, setProject] = useState<any>(null);
  const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isLinkProjectOpen, setIsLinkProjectOpen] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [selectedProjectToLink, setSelectedProjectToLink] = useState("");
  const [isUnlinkProjectOpen, setIsUnlinkProjectOpen] = useState(false);
  const [dealFiles, setDealFiles] = useState<any[]>([]);

  const fetchProject = async () => {
    if (!deal?.id) return;
    
    const { data, error } = await supabase
      .from("projects")
      .select(`
        *,
        client:clients(name),
        architect:architects(name)
      `)
      .eq("crm_deal_id", deal.id)
      .maybeSingle();
    
    if (!error && data) {
      setProject(data);
    }
  };

  const fetchDealFiles = async () => {
    if (!deal?.id) return;
    
    const { data, error } = await supabase
      .from("crm_deal_files")
      .select("*")
      .eq("deal_id", deal.id)
      .order("uploaded_at", { ascending: false });
    
    if (!error && data) {
      setDealFiles(data);
    }
  };

  const fetchHistory = async () => {
    if (!deal?.id) return;

    const { data } = await supabase
      .from("crm_deal_history")
      .select(`
        *,
        from_stage:crm_stages!crm_deal_history_from_stage_id_fkey(name),
        to_stage:crm_stages!crm_deal_history_to_stage_id_fkey(name),
        moved_by_user:profiles(full_name, email)
      `)
      .eq("deal_id", deal.id)
      .order("moved_at", { ascending: false });

    if (data) setHistory(data);
  };

  const fetchAvailableProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, stage")
      .is("crm_deal_id", null);
    
    if (data) setAvailableProjects(data);
  };

  useEffect(() => {
    if (deal?.id && open) {
      fetchHistory();
      fetchProject();
      fetchDealFiles();
    }

    const historyChannel = supabase
      .channel("deal-history-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_deal_history",
          filter: `deal_id=eq.${deal?.id}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();
    
    const projectsChannel = supabase
      .channel("deal-projects-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `crm_deal_id=eq.${deal?.id}`,
        },
        () => {
          fetchProject();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(historyChannel);
      supabase.removeChannel(projectsChannel);
    };
  }, [deal?.id, open]);

  if (!deal) return null;

  const clientName = deal.lead?.client?.name || "Sem cliente";
  const phone = deal.lead?.client?.phone || "N/A";
  const email = deal.lead?.client?.email || "N/A";
  const city = deal.lead?.client?.city || "";
  const state = deal.lead?.client?.state || "";
  const location = city && state ? `${city} - ${state}` : city || state || "N/A";
  const architectName = deal.architect?.name || "Não atribuído";
  const ownerName = deal.owner?.full_name || deal.owner?.email || "Não atribuído";
  const stageName = deal.stage?.name || "N/A";
  const temperature = deal.lead?.temperature || "frio";
  const sourceName = deal.lead?.source?.name || "N/A";
  const productType = deal.product_type || "N/A";
  const timeInStage = Math.floor(
    (new Date().getTime() - new Date(deal.stage_entered_at).getTime()) /
      (1000 * 60 * 60)
  );

  const getTemperatureBadge = () => {
    switch (temperature) {
      case "quente":
        return { variant: "default" as const, text: "🔥 Quente" };
      case "morno":
        return { variant: "secondary" as const, text: "☀️ Morno" };
      default:
        return { variant: "outline" as const, text: "❄️ Frio" };
    }
  };

  const handleMarkAsWon = async () => {
    const { error } = await supabase
      .from("crm_deals")
      .update({ 
        status: "won",
        stage_entered_at: new Date().toISOString()
      })
      .eq("id", deal.id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Negócio marcado como ganho!",
    });
    
    setTimeout(() => {
      fetchHistory();
    }, 500);
    
    onOpenChange(false);
    onSuccess();
  };

  const handleMarkAsLost = async () => {
    if (!lostReason) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, selecione o motivo da perda.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("crm_deals")
      .update({ 
        status: "lost",
        lost_reason: lostReason,
        lost_note: lostNote,
        stage_entered_at: new Date().toISOString()
      })
      .eq("id", deal.id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Negócio marcado como perdido.",
    });
    
    setTimeout(() => {
      fetchHistory();
    }, 500);
    
    setLostDialog(false);
    onOpenChange(false);
    onSuccess();
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("crm_deals")
      .delete()
      .eq("id", deal.id);

    if (error) {
      toast({
        title: "Erro ao excluir negócio",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Negócio excluído",
      description: "O negócio foi excluído com sucesso.",
    });
    setDeleteDialog(false);
    onOpenChange(false);
    onSuccess();
  };

  const handleLinkExistingProject = async () => {
    if (!selectedProjectToLink) {
      toast({
        title: "Selecione um projeto",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("projects")
      .update({ crm_deal_id: deal.id })
      .eq("id", selectedProjectToLink);

    if (error) {
      toast({
        title: "Erro ao vincular projeto",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Projeto vinculado ao negócio!",
    });
    
    setIsLinkProjectOpen(false);
    setSelectedProjectToLink("");
    fetchProject();
  };

  const handleUnlinkProject = async () => {
    if (!project) return;

    const { error } = await supabase
      .from("projects")
      .update({ crm_deal_id: null })
      .eq("id", project.id);

    if (error) {
      toast({
        title: "Erro ao desvincular projeto",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Projeto desvinculado do negócio.",
    });
    
    setIsUnlinkProjectOpen(false);
    setProject(null);
  };

  // Gerar tags automáticas
  const tags: string[] = [];
  
  if (deal.status === "won") tags.push("✅ Ganho");
  if (deal.status === "lost") tags.push("❌ Perdido");
  if (deal.status === "aberto") tags.push("🔵 Aberto");
  if (temperature) tags.push(getTemperatureBadge().text);
  if (deal.value && deal.value > 50000) tags.push("💰 Alto Valor");
  if (project) tags.push("📦 Com Projeto");
  if (timeInStage > 72) tags.push(`⏰ ${Math.floor(timeInStage / 24)}d nesta etapa`);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            {deal.title}
            <Badge variant={deal.status === "won" ? "default" : deal.status === "lost" ? "destructive" : "secondary"}>
              {stageName}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="actions">Ações & Projeto</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            {/* Tags Automáticas */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Status do Negócio</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="bg-primary/5">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Dados do Negócio */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Dados do Negócio
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Pipeline:</span>
                  <span className="ml-2 font-medium">{deal.pipeline?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Etapa Atual:</span>
                  <Badge className="ml-2">{stageName}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="ml-2 font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {deal.value 
                      ? `R$ ${deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                      : "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo de Produto:</span>
                  <span className="ml-2">{productType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Origem:</span>
                  <span className="ml-2">{sourceName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tempo nesta etapa:</span>
                  <span className="ml-2">{timeInStage}h</span>
                </div>
                {deal.scheduled_call && (
                  <div>
                    <span className="text-muted-foreground">Ligação agendada:</span>
                    <span className="ml-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(deal.scheduled_call), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Cliente */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome:</span>
                  <span className="ml-2 font-medium">{clientName}</span>
                </div>
                {phone !== "N/A" && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{phone}</span>
                  </div>
                )}
                {email !== "N/A" && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span>{email}</span>
                  </div>
                )}
                {location !== "N/A" && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{location}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Responsáveis */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Responsáveis
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Vendedor:</span>
                  <span className="ml-2 font-medium">{ownerName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Arquiteto:</span>
                  <span className="ml-2 font-medium">{architectName}</span>
                </div>
              </div>
            </Card>

            {/* Observações */}
            {deal.note && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Observações
                </h3>
                <p className="text-sm whitespace-pre-wrap">{deal.note}</p>
              </Card>
            )}

            {/* Documentos Anexados */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos Anexados
              </h3>
              <DealFileUpload 
                dealId={deal.id} 
                files={dealFiles}
                onFilesChange={fetchDealFiles}
              />
            </Card>

            {/* Botão Editar */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Negócio
            </Button>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {/* Timeline de Atualizações */}
            <DealTimeline dealId={deal.id} />

            {/* Histórico de Mudanças */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico de Mudanças
              </h3>
              
              {history && history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-primary/20 pl-4 pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {entry.action_type === "stage_change" && "📊 Mudança de Etapa"}
                          {entry.action_type === "field_change" && "✏️ Alteração"}
                          {entry.action_type === "won" && "✅ Ganho"}
                          {entry.action_type === "lost" && "❌ Perdido"}
                          {entry.action_type === "created" && "🎯 Criado"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.moved_at || entry.created_at), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm">{entry.description}</p>
                      {entry.moved_by_user && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Por: {entry.moved_by_user.full_name || entry.moved_by_user.email}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma mudança registrada
                </p>
              )}
            </Card>

            {/* Tarefas */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tarefas
              </h3>
              <DealTasks dealId={deal.id} />
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            {/* Projeto Vinculado */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Projeto Vinculado
              </h3>
              
              {project ? (
                <div className="space-y-3">
                  <Card className="p-4 bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{project.name}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{project.stage}</Badge>
                          {project.value && (
                            <span className="text-sm text-muted-foreground">
                              R$ {project.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(project.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setIsProjectSheetOpen(true)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsUnlinkProjectOpen(true)}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Desvincular Projeto
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum projeto vinculado
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsCreateProjectOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Projeto
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        fetchAvailableProjects();
                        setIsLinkProjectOpen(true);
                      }}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Vincular Existente
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Ações do Negócio */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Ações do Negócio
              </h3>
              
              <div className="space-y-3">
                {deal.status === "aberto" && (
                  <>
                    <Button
                      onClick={handleMarkAsWon}
                      className="w-full"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Ganho
                    </Button>
                    <Button
                      onClick={() => setLostDialog(true)}
                      className="w-full"
                      variant="outline"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Marcar como Perdido
                    </Button>
                  </>
                )}

                <Button
                  onClick={() => {
                    fetchAvailableProjects();
                    setDeleteDialog(true);
                  }}
                  className="w-full"
                  variant="destructive"
                >
                  Excluir Negócio
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* Dialogs */}
      <EditDealDialog
        deal={deal}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          onSuccess();
          fetchHistory();
        }}
      />

      <AlertDialog open={lostDialog} onOpenChange={setLostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Perdido</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da perda deste negócio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo *</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preco">Preço</SelectItem>
                  <SelectItem value="concorrente">Optou por Concorrente</SelectItem>
                  <SelectItem value="timing">Timing Incorreto</SelectItem>
                  <SelectItem value="sem_resposta">Sem Resposta</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={lostNote}
                onChange={(e) => setLostNote(e.target.value)}
                placeholder="Adicione detalhes sobre a perda..."
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsLost}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Negócio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este negócio? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isLinkProjectOpen} onOpenChange={setIsLinkProjectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vincular Projeto Existente</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione um projeto para vincular a este negócio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={selectedProjectToLink} onValueChange={setSelectedProjectToLink}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um projeto" />
            </SelectTrigger>
            <SelectContent>
              {availableProjects.map((proj) => (
                <SelectItem key={proj.id} value={proj.id}>
                  {proj.name} - {proj.stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLinkExistingProject}>
              Vincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isUnlinkProjectOpen} onOpenChange={setIsUnlinkProjectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular Projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desvincular o projeto deste negócio?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlinkProject}>
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {project && (
        <ProjectDetailSheet
          project={project}
          open={isProjectSheetOpen}
          onOpenChange={setIsProjectSheetOpen}
          onSuccess={fetchProject}
        />
      )}

      <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        onSuccess={() => {
          fetchProject();
          toast({
            title: "Projeto criado",
            description: "O projeto foi criado com sucesso!",
          });
        }}
      />
    </Sheet>
  );
}