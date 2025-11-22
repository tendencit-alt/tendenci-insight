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
import { Edit, CheckCircle, XCircle, FileText, User, Users, Phone, Mail, MapPin, Package, TrendingUp, DollarSign, ExternalLink, Calendar, Tag as TagIcon, History, FolderOpen, Plus, Unlink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EditDealDialog } from "./EditDealDialog";

import { DealHistory } from "./DealHistory";
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
import { DealNotes } from "./DealNotes";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { logDealChange, logStageChange, getDisplayValue } from "@/utils/dealHistory";

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
  const { user } = useAuth();
  const { isMaster } = usePermissions();
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
  const [isUnlinkProjectOpen, setIsUnlinkProjectOpen] = useState(false);
  const [dealFiles, setDealFiles] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState("");

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

  const fetchOwners = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");
    
    if (data) {
      setOwners(data);
    }
  };

  useEffect(() => {
    if (open && deal?.id) {
      setSelectedStage(deal.stage_id);
      setSelectedPipeline(deal.pipeline_id);
      setSelectedOwner(deal.owner_id || "");
      fetchAllPipelines();
      fetchAllStages(deal.pipeline_id);
      fetchProject();
      fetchDealFiles();
      fetchOwners();
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

  const handleOwnerChange = async (ownerId: string) => {
    const actualOwnerId = ownerId === "none" ? "" : ownerId;
    const oldOwnerId = deal.owner_id || "";
    setSelectedOwner(actualOwnerId);

    const { error } = await supabase
      .from("crm_deals")
      .update({ owner_id: actualOwnerId || null })
      .eq("id", deal.id);

    if (error) {
      toast({
        title: "Erro ao atualizar vendedor",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const oldValue = await getDisplayValue('owner_id', oldOwnerId);
      const newValue = await getDisplayValue('owner_id', actualOwnerId);
      
      await logDealChange(deal.id, {
        field_name: 'owner_id',
        old_value: oldValue,
        new_value: newValue,
      });

      toast({
        title: "Vendedor atualizado",
        description: "O vendedor responsável foi atualizado com sucesso.",
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
      await logDealChange(deal.id, {
        field_name: 'status',
        old_value: deal.status || 'aberto',
        new_value: 'won',
      });

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
      const changes = [
        {
          field_name: 'status',
          old_value: deal.status || 'aberto',
          new_value: 'lost',
        }
      ];
      
      if (lostReason) {
        changes.push({
          field_name: 'lost_reason',
          old_value: deal.lost_reason || '',
          new_value: lostReason,
        });
      }
      
      if (lostNote) {
        changes.push({
          field_name: 'lost_note',
          old_value: deal.lost_note || '',
          new_value: lostNote,
        });
      }
      
      await logDealChange(deal.id, changes);

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

  if (!deal) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:max-w-3xl overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Permite interação com selects, popovers, date pickers e datetime-local
          if (e.target instanceof Element && (
            e.target.closest('[role="dialog"]') ||
            e.target.closest('[role="listbox"]') ||
            e.target.closest('.react-day-picker') ||
            e.target.closest('input[type="datetime-local"]') ||
            e.target.closest('input[type="date"]') ||
            e.target.closest('input[type="time"]')
          )) {
            e.preventDefault();
          }
        }}
      >
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp IA</TabsTrigger>
            <TabsTrigger value="actions">Ações & Projeto</TabsTrigger>
          </TabsList>

          {/* Tab: Informações */}
          <TabsContent value="info" className="space-y-4">
            {/* Cliente */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Cliente</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              {deal.lead?.client ? (
                <div className="space-y-2">
                  {deal.lead.client.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{deal.lead.client.name}</span>
                    </div>
                  )}
                  {deal.lead.client.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${deal.lead.client.email}`} className="text-primary hover:underline">
                        {deal.lead.client.email}
                      </a>
                    </div>
                  )}
                  {deal.lead.client.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${deal.lead.client.phone}`} className="text-primary hover:underline">
                        {deal.lead.client.phone}
                      </a>
                    </div>
                  )}
                  {deal.lead.client.city && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{deal.lead.client.city}</span>
                      {deal.lead.client.state && ` - ${deal.lead.client.state}`}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhum cliente vinculado
                </div>
              )}
            </Card>

            {/* Dados do Negócio e Status */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Dados do Negócio</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
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
            </Card>

            {/* Responsáveis - Visível apenas para o vendedor responsável ou admin */}
            {(isMaster || deal.owner_id === user?.id) && (
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
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Vendedor Responsável</Label>
                    <Select
                      value={selectedOwner || "none"}
                      onValueChange={handleOwnerChange}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecionar vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {owners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.full_name || owner.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            )}

          </TabsContent>

          {/* Tab: Histórico */}
          <TabsContent value="history" className="space-y-4">
            <DealHistory dealId={deal.id} />
          </TabsContent>

          {/* Tab: Tarefas */}
          <TabsContent value="tasks" className="space-y-4">
            <DealTasks dealId={deal.id} />
            
            {/* Observações/Histórico */}
            <DealNotes
              dealId={deal.id}
              currentNote={deal.note || ""}
              onNoteUpdate={(newNote) => {
                deal.note = newNote;
              }}
            />
          </TabsContent>

          {/* Tab: WhatsApp IA */}
          <TabsContent value="whatsapp" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Histórico do WhatsApp IA</h3>
              </div>
              {deal.conversation_history ? (
                <div className="space-y-2">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {deal.conversation_history}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    Nenhum histórico de conversas disponível
                  </p>
                  <p className="text-xs mt-2">
                    💬 As conversas via WhatsApp IA aparecerão aqui automaticamente
                  </p>
                </div>
              )}
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
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setIsCreateProjectOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Criar Projeto
                </Button>
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
