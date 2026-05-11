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
import { Edit, CheckCircle, XCircle, User, Users, Phone, Mail, MapPin, Package, TrendingUp, DollarSign, ExternalLink, Calendar, Tag as TagIcon, FolderOpen, Plus, Unlink, Building, Repeat, ShoppingCart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EditDealDialog } from "./EditDealDialog";
import { EditClientDialog } from "./EditClientDialog";
import { CreateArchitectDialog } from "@/components/architects/CreateArchitectDialog";
import { CreateOrderDialog } from "@/components/orders/CreateOrderDialog";

import { DealHistory } from "./DealHistory";
import { DealTasks } from "./DealTasks";
import { DealArchitectIndication } from "./DealArchitectIndication";
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

import { DealNotes } from "./DealNotes";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { logDealChange, getDisplayValue } from "@/utils/dealHistory";

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
  
  const [owners, setOwners] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [architects, setArchitects] = useState<any[]>([]);
  const [selectedArchitect, setSelectedArchitect] = useState("");
  const [isEditingArchitect, setIsEditingArchitect] = useState(false);
  const [isArchitectDialogOpen, setIsArchitectDialogOpen] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [showCreateOrderPrompt, setShowCreateOrderPrompt] = useState(false);
  const [followupEnabled, setFollowupEnabled] = useState(deal?.followup_enabled ?? true);
  const [isUpdatingFollowup, setIsUpdatingFollowup] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);

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


  const fetchOwners = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");
    
    if (data) {
      setOwners(data);
    }
  };

  const fetchArchitects = async () => {
    const { data } = await supabase
      .from("architects")
      .select("id, name, company, phone")
      .eq("active", true)
      .order("name");
    
    if (data) {
      setArchitects(data);
    }
  };

  useEffect(() => {
    if (open && deal?.id) {
      setSelectedStage(deal.stage_id);
      setSelectedPipeline(deal.pipeline_id);
      setSelectedOwner(deal.owner_id || "");
      setSelectedArchitect(deal.architect_id || "");
      setFollowupEnabled(deal.followup_enabled ?? true);
      setIsEditingArchitect(false);
      fetchAllPipelines();
      fetchAllStages(deal.pipeline_id);
      fetchProject();
      
      fetchOwners();
      fetchArchitects();
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
    if (isUpdating) return;
    setIsUpdating(true);
    
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
        moved_by: user?.id || null,
      });

      toast({
        title: "Etapa atualizada",
        description: "A etapa do negócio foi atualizada com sucesso.",
      });
      onSuccess();
    }
    
    setIsUpdating(false);
  };

  const handleOwnerChange = async (ownerId: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    
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
    
    setIsUpdating(false);
  };

  const handleArchitectChange = async (architectId: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    
    const actualArchitectId = architectId === "none" ? "" : architectId;
    const oldArchitectId = deal.architect_id || "";
    setSelectedArchitect(actualArchitectId);
    setIsEditingArchitect(false);

    const { error } = await supabase
      .from("crm_deals")
      .update({ architect_id: actualArchitectId || null })
      .eq("id", deal.id);

    if (error) {
      toast({
        title: "Erro ao atualizar parceiro profissional",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const oldValue = await getDisplayValue('architect_id', oldArchitectId);
      const newValue = await getDisplayValue('architect_id', actualArchitectId);
      
      await logDealChange(deal.id, {
        field_name: 'architect_id',
        old_value: oldValue,
        new_value: newValue,
      });

      toast({
        title: "Parceiro Profissional atualizado",
        description: "O parceiro profissional foi atualizado com sucesso.",
      });
      onSuccess();
    }
    
    setIsUpdating(false);
  };

  const handleArchitectCreated = async (architectId: string) => {
    await fetchArchitects();
    await handleArchitectChange(architectId);
    setIsArchitectDialogOpen(false);
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
      return;
    }

    await logDealChange(deal.id, {
      field_name: 'status',
      old_value: deal.status || 'aberto',
      new_value: 'won',
    });

    // Verificar se tem cliente vinculado para informar usuário
    // O TRIGGER no banco cria o pedido automaticamente
    let hasClient = deal.lead?.client?.id || deal.lead?.client_id;
    
    if (!hasClient && deal.lead_id) {
      const { data: leadData } = await supabase
        .from("leads")
        .select("client_id")
        .eq("id", deal.lead_id)
        .single();
      hasClient = !!leadData?.client_id;
    }

    // Buscar o pedido criado pelo trigger
    const { data: order } = await supabase
      .from("orders")
      .select("order_number")
      .eq("deal_id", deal.id)
      .maybeSingle();

    if (order) {
      toast({
        title: "🎉 Negócio ganho!",
        description: `Pedido #${order.order_number} criado automaticamente em rascunho.`,
      });
    } else if (!hasClient) {
      toast({
        title: "🎉 Negócio ganho!",
        description: "Pedido não criado: cliente não vinculado ao negócio.",
      });
    } else {
      toast({
        title: "🎉 Negócio ganho!",
        description: "Negócio marcado como ganho com sucesso.",
      });
    }

    onSuccess();
    onOpenChange(false);
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

  const handleFollowupToggle = async (enabled: boolean) => {
    if (isUpdatingFollowup) return;
    setIsUpdatingFollowup(true);
    setFollowupEnabled(enabled);

    const { error } = await supabase
      .from("crm_deals")
      .update({ followup_enabled: enabled })
      .eq("id", deal.id);

    if (error) {
      toast({
        title: "Erro ao atualizar follow-up",
        description: error.message,
        variant: "destructive",
      });
      setFollowupEnabled(!enabled);
    } else {
      toast({
        title: enabled ? "Follow-up ativado" : "Follow-up desativado",
        description: enabled 
          ? "O sistema enviará mensagens automáticas a cada 2 dias." 
          : "Follow-ups automáticos foram pausados.",
      });
      onSuccess();
    }
    
    setIsUpdatingFollowup(false);
  };

  const getNextFollowupTime = () => {
    if (!deal?.last_followup_at && !deal?.last_interaction) return null;
    
    const lastTime = deal.last_followup_at || deal.last_interaction;
    const nextTime = new Date(lastTime);
    nextTime.setDate(nextTime.getDate() + 2);
    
    const now = new Date();
    const diffMs = nextTime.getTime() - now.getTime();
    
    if (diffMs < 0) return "Pendente de envio";
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    
    if (diffDays > 0) {
      return `${diffDays} dia${diffDays > 1 ? 's' : ''} e ${hours}h`;
    }
    return `${diffHours}h`;
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
                {deal.lead?.client?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditClientOpen(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
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
                  {deal.lead.client.notes && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-md border-l-2 border-primary/40">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">📋 Observações do Cliente:</p>
                      <p className="text-sm whitespace-pre-wrap">{deal.lead.client.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhum cliente vinculado
                </div>
              )}
            </Card>

            {/* Parceiro Profissional */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Parceiro Profissional</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingArchitect(!isEditingArchitect)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              
              {deal.architect && !isEditingArchitect ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{deal.architect.name}</span>
                  </div>
                  {deal.architect.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{deal.architect.company}</span>
                    </div>
                  )}
                  {deal.architect.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`https://wa.me/55${deal.architect.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {deal.architect.phone}
                      </a>
                    </div>
                  )}
                </div>
              ) : !deal.architect && !isEditingArchitect ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Cliente sem parceiro profissional vinculado
                </div>
              ) : null}
              
              {isEditingArchitect && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Selecionar Parceiro Profissional</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsArchitectDialogOpen(true)}
                      className="h-7 text-xs"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Novo Parceiro Profissional
                    </Button>
                  </div>
                  <Select
                    value={selectedArchitect || "none"}
                    onValueChange={handleArchitectChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar parceiro profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Cliente sem parceiro profissional</SelectItem>
                      {architects.map((arch) => (
                        <SelectItem key={arch.id} value={arch.id}>
                          {arch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            
            {/* Separador visual entre Tarefas e Observações */}
            <div className="h-6" />
            
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
            {/* Card de Configuração de Follow-up */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Follow-up Automático</h3>
                </div>
                <Switch
                  checked={followupEnabled}
                  onCheckedChange={handleFollowupToggle}
                  disabled={isUpdatingFollowup}
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={followupEnabled ? "default" : "secondary"}>
                    {followupEnabled ? "Ativo" : "Pausado"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Follow-ups enviados:</span>
                  <span className="font-semibold">
                    {deal.followup_count || 0} / {deal.max_followups || 5}
                  </span>
                </div>
                {followupEnabled && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Próximo follow-up:</span>
                    <span className="font-semibold text-primary">
                      {getNextFollowupTime() || "Calculando..."}
                    </span>
                  </div>
                )}
              </div>
              {followupEnabled && (
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  💬 A IA enviará mensagens personalizadas a cada 2 dias baseadas no histórico de conversa
                </div>
              )}
            </Card>

            {/* Card de Histórico de Conversas */}
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

            {/* Indicação de Parceiro Profissional */}
            <DealArchitectIndication
              dealId={deal.id}
              dealCategoria={deal.categoria || undefined}
              dealCentroCusto={deal.centro_custo || undefined}
              dealTipoProduto={deal.product_type || undefined}
            />

            {/* Ações */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TagIcon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Ações</h3>
              </div>
              <div className="flex flex-wrap gap-2">
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
              </div>
              
              {/* Botão criar pedido para deals ganhos */}
              {deal.status === "won" && (
                <Button
                  variant="outline"
                  className="w-full mt-3 gap-2 border-primary text-primary hover:bg-primary/10"
                  onClick={() => setIsCreateOrderOpen(true)}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Criar Pedido
                </Button>
              )}
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

        <CreateArchitectDialog
          open={isArchitectDialogOpen}
          onOpenChange={setIsArchitectDialogOpen}
          onSuccess={handleArchitectCreated}
        />

        {/* Dialog para criar pedido */}
        <CreateOrderDialog
          open={isCreateOrderOpen}
          onOpenChange={setIsCreateOrderOpen}
          onSuccess={() => {
            setIsCreateOrderOpen(false);
            onSuccess();
          }}
          dealId={deal?.id}
          clientId={deal?.lead?.client?.id}
        />

        {/* Prompt após ganhar negócio */}
        <AlertDialog open={showCreateOrderPrompt} onOpenChange={setShowCreateOrderPrompt}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Criar Pedido?
              </AlertDialogTitle>
              <AlertDialogDescription>
                O negócio foi marcado como ganho! Deseja criar um pedido para este cliente?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowCreateOrderPrompt(false);
                onOpenChange(false);
              }}>
                Agora Não
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowCreateOrderPrompt(false);
                setIsCreateOrderOpen(true);
              }}>
                Criar Pedido
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Client Dialog */}
        {deal.lead?.client?.id && (
          <EditClientDialog
            open={isEditClientOpen}
            onOpenChange={setIsEditClientOpen}
            clientId={deal.lead.client.id}
            onSuccess={onSuccess}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
