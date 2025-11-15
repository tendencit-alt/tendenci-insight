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
import { Edit, CheckCircle, XCircle, FileText, User, Users, Phone, Mail, MapPin, Package, TrendingUp, DollarSign, ExternalLink, Calendar, Tag as TagIcon, History, Paperclip, Mic, FolderOpen, Plus, Unlink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EditDealDialog } from "./EditDealDialog";
import { DealTimeline } from "./DealTimeline";
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

  useEffect(() => {
    if (open && deal?.id) {
      setSelectedStage(deal.stage_id);
      setSelectedPipeline(deal.pipeline_id);
      fetchAllPipelines();
      fetchAllStages(deal.pipeline_id);
      fetchProject();
      fetchDealFiles();
    }
  }, [open, deal]);

  const fetchAllPipelines = async () => {
    const { data } = await supabase
      .from("crm_pipelines")
      .select("*")
      .order("name");

    if (data) {
      setAllPipelines(data);
    }
  };

  const fetchAllStages = async (pipelineId: string) => {
    const { data } = await supabase
      .from("crm_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("position");

    if (data) {
      setAllStages(data);
    }
  };

  const handlePipelineChange = async (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
    await fetchAllStages(pipelineId);
    
    const { data: stages } = await supabase
      .from("crm_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("position")
      .limit(1);
    
    if (stages && stages[0]) {
      setSelectedStage(stages[0].id);
      await handleStageChange(stages[0].id, pipelineId);
    }
  };

  const handleStageChange = async (stageId: string, pipelineId?: string) => {
    setSelectedStage(stageId);

    const { error } = await supabase
      .from("crm_deals")
      .update({ 
        stage_id: stageId,
        pipeline_id: pipelineId || selectedPipeline,
        stage_entered_at: new Date().toISOString(),
      })
      .eq("id", deal.id);

    if (error) {
      toast({
        title: "Erro ao atualizar etapa",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await supabase.from("crm_deal_history").insert({
        deal_id: deal.id,
        from_stage_id: deal.stage_id,
        to_stage_id: stageId,
        moved_at: new Date().toISOString(),
      });

      toast({
        title: "Etapa atualizada",
        description: "A etapa do negócio foi atualizada com sucesso.",
      });
      onSuccess();
    }
  };

  const handleWinDeal = async () => {
    const { error } = await supabase
      .from("crm_deals")
      .update({ status: "won" })
      .eq("id", deal.id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Negócio ganho!",
        description: "O negócio foi marcado como ganho.",
      });
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleLostDeal = async () => {
    const { error } = await supabase
      .from("crm_deals")
      .update({
        status: "lost",
        lost_reason: lostReason,
        lost_note: lostNote,
      })
      .eq("id", deal.id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Negócio perdido",
        description: "O negócio foi marcado como perdido.",
      });
      setLostDialog(false);
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("crm_deals")
      .delete()
      .eq("id", deal.id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Negócio excluído",
        description: "O negócio foi excluído com sucesso.",
      });
      setDeleteDialog(false);
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleLinkProject = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .is("crm_deal_id", null)
      .order("name");

    if (data) {
      setAvailableProjects(data);
      setIsLinkProjectOpen(true);
    }
  };

  const confirmLinkProject = async () => {
    if (!selectedProjectToLink) return;

    const { error } = await supabase
      .from("projects")
      .update({ crm_deal_id: deal.id })
      .eq("id", selectedProjectToLink);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Projeto vinculado",
        description: "O projeto foi vinculado ao negócio com sucesso.",
      });
      setIsLinkProjectOpen(false);
      fetchProject();
    }
  };

  const handleUnlinkProject = async () => {
    const { error } = await supabase
      .from("projects")
      .update({ crm_deal_id: null })
      .eq("id", project.id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Projeto desvinculado",
        description: "O projeto foi desvinculado do negócio.",
      });
      setIsUnlinkProjectOpen(false);
      setProject(null);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "won":
        return "default";
      case "lost":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-2xl mb-2">{deal.title}</SheetTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {deal.status && (
                  <Badge variant={getStatusVariant(deal.status)}>
                    {deal.status}
                  </Badge>
                )}
                {deal.ai_status && (
                  <Badge variant="outline" className="gap-1">
                    <TagIcon className="h-3 w-3" />
                    {deal.ai_status}
                  </Badge>
                )}
                {deal.from_ai && (
                  <Badge variant="secondary">
                    🤖 IA
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="actions">Ações & Projeto</TabsTrigger>
          </TabsList>

          {/* Tab: Informações */}
          <TabsContent value="info" className="space-y-4">
            {/* Cliente */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Cliente</h3>
              </div>
              <div className="space-y-2">
                {deal.architect?.name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{deal.architect.name}</span>
                  </div>
                )}
                {deal.architect?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${deal.architect.email}`} className="text-primary hover:underline">
                      {deal.architect.email}
                    </a>
                  </div>
                )}
                {deal.architect?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${deal.architect.phone}`} className="text-primary hover:underline">
                      {deal.architect.phone}
                    </a>
                  </div>
                )}
                {deal.architect?.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{deal.architect.city}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Dados do Negócio e Status */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Dados do Negócio</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-lg">
                      {deal.value
                        ? new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(deal.value)
                        : "—"}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    {deal.status && (
                      <Badge variant={getStatusVariant(deal.status)} className="text-sm">
                        {deal.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <TagIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{deal.categoria || "—"}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de Produto</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{deal.product_type || deal.tipo_produto || "—"}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{deal.centro_custo || "—"}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Criado em</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {deal.created_at
                        ? format(new Date(deal.created_at), "dd/MM/yyyy")
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
              {deal.note && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{deal.note}</p>
                </div>
              )}
            </Card>

            {/* Responsáveis */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Responsáveis</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Pipeline</Label>
                  <Select
                    value={selectedPipeline}
                    onValueChange={handlePipelineChange}
                    disabled={!allPipelines.length}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecionar pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {allPipelines.map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Etapa</Label>
                  <Select
                    value={selectedStage}
                    onValueChange={handleStageChange}
                    disabled={!allStages.length}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecionar etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {allStages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {deal.owner?.full_name && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Responsável</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{deal.owner.full_name}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Histórico com anexos */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Histórico</h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Em breve",
                        description: "Funcionalidade de anexar documento em desenvolvimento.",
                      });
                    }}
                    className="gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    Documento
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Em breve",
                        description: "Funcionalidade de anexar áudio em desenvolvimento.",
                      });
                    }}
                    className="gap-2"
                  >
                    <Mic className="h-4 w-4" />
                    Áudio
                  </Button>
                </div>
              </div>
              
              <DealTimeline dealId={deal.id} />
              
              {dealFiles.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-sm font-medium mb-2 block">Documentos Anexados</Label>
                  <div className="space-y-2">
                    {dealFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.file_size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const { data } = await supabase.storage
                              .from("deal-files")
                              .createSignedUrl(file.file_path, 60);
                            if (data?.signedUrl) {
                              window.open(data.signedUrl, "_blank");
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <DealFileUpload dealId={deal.id} files={dealFiles} onFilesChange={fetchDealFiles} />
              </div>
            </Card>
          </TabsContent>

          {/* Tab: Histórico */}
          <TabsContent value="history" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Histórico de Mudanças</h3>
              </div>
              <p className="text-sm text-muted-foreground">Histórico de mudanças do negócio.</p>
            </Card>
          </TabsContent>

          {/* Tab: Ações & Projeto */}
          <TabsContent value="actions" className="space-y-4">
            {/* Projeto */}
            {project ? (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Projeto Vinculado</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsProjectSheetOpen(true)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsUnlinkProjectOpen(true)}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">{project.name}</p>
                  {project.stage && (
                    <Badge variant="outline">{project.stage}</Badge>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Projeto</h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => setIsCreateProjectOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Criar Projeto
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleLinkProject}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Vincular Existente
                  </Button>
                </div>
              </Card>
            )}

            {/* Ações */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TagIcon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Ações</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={handleWinDeal}
                  disabled={deal.status === "won"}
                >
                  <CheckCircle className="h-4 w-4" />
                  Ganhar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={() => setLostDialog(true)}
                  disabled={deal.status === "lost"}
                >
                  <XCircle className="h-4 w-4" />
                  Perder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialog(true)}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <EditDealDialog
          deal={deal}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={onSuccess}
        />

        <AlertDialog open={lostDialog} onOpenChange={setLostDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Marcar negócio como perdido</AlertDialogTitle>
              <AlertDialogDescription>
                Por favor, informe o motivo da perda do negócio.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="lost-reason">Motivo da Perda</Label>
                <Select value={lostReason} onValueChange={setLostReason}>
                  <SelectTrigger id="lost-reason">
                    <SelectValue placeholder="Selecionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Preço</SelectItem>
                    <SelectItem value="competition">Concorrência</SelectItem>
                    <SelectItem value="timing">Timing</SelectItem>
                    <SelectItem value="no_budget">Sem Orçamento</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="lost-note">Observações</Label>
                <Textarea
                  id="lost-note"
                  value={lostNote}
                  onChange={(e) => setLostNote(e.target.value)}
                  placeholder="Detalhes adicionais..."
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleLostDeal}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir negócio</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este negócio? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {project && (
          <ProjectDetailSheet
            project={project}
            open={isProjectSheetOpen}
            onOpenChange={setIsProjectSheetOpen}
            onSuccess={() => {
              fetchProject();
              onSuccess();
            }}
          />
        )}

        <CreateProjectDialog
          open={isCreateProjectOpen}
          onOpenChange={setIsCreateProjectOpen}
          onSuccess={() => {
            fetchProject();
            onSuccess();
          }}
        />

        <AlertDialog open={isLinkProjectOpen} onOpenChange={setIsLinkProjectOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Vincular projeto existente</AlertDialogTitle>
              <AlertDialogDescription>
                Selecione um projeto existente para vincular a este negócio.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select value={selectedProjectToLink} onValueChange={setSelectedProjectToLink}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar projeto" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmLinkProject}>
                Vincular
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isUnlinkProjectOpen} onOpenChange={setIsUnlinkProjectOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desvincular projeto</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja desvincular este projeto do negócio?
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
      </SheetContent>
    </Sheet>
  );
}
