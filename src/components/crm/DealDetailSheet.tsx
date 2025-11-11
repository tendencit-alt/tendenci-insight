import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, CheckCircle, XCircle, ChevronDown, FileText, User, Users, MessageCircle, Phone, Settings, Clock, CheckSquare, History } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EditDealDialog } from "./EditDealDialog";
import { DealTimeline } from "./DealTimeline";
import { DealTasks } from "./DealTasks";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  
  // Estados para controlar seções abertas/fechadas
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    deal: false,
    client: false,
    owners: false,
    whatsapp: false,
    call: false,
    actions: false,
    history: false,
    tasks: false,
    timeline: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch histórico de movimentações e etapas
  useEffect(() => {
    if (!deal?.id) return;

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("crm_deal_history")
        .select(`
          *,
          from_stage:crm_stages!crm_deal_history_from_stage_id_fkey(name),
          to_stage:crm_stages!crm_deal_history_to_stage_id_fkey(name),
          user:profiles!crm_deal_history_moved_by_fkey(full_name, email)
        `)
        .eq("deal_id", deal.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar histórico:", error);
      }
      
      if (data) {
        console.log("Histórico carregado:", data.length, "registros");
        setHistory(data);
      }
    };

    const fetchStages = async (pipelineId?: string) => {
      const targetPipeline = pipelineId || deal.pipeline_id;
      if (!targetPipeline) return;
      
      const { data } = await supabase
        .from("crm_stages")
        .select("*")
        .eq("pipeline_id", targetPipeline)
        .order("position", { ascending: true });
      
      if (data) {
        // Filtrar apenas etapas normais (sem ganho/perdido)
        const normalStages = data.filter(s => {
          const name = s.name.toLowerCase();
          return !(name.includes('ganho') || name.includes('won') || name.startsWith('✅') ||
                   name.includes('perdido') || name.includes('lost') || name.startsWith('❌'));
        });
        setAllStages(normalStages);
      }
    };

    const fetchPipelines = async () => {
      const { data } = await supabase
        .from("crm_pipelines")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (data) {
        setAllPipelines(data);
      }
    };

    fetchHistory();
    fetchStages();
    fetchPipelines();

    // Configurar realtime
    const channel = supabase
      .channel("deal-history-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_deal_history",
          filter: `deal_id=eq.${deal.id}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deal?.id, deal?.pipeline_id]);

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
    
    // Aguardar um pouco para o trigger processar e então refetch
    setTimeout(() => {
      const refetchHistory = async () => {
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
      refetchHistory();
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
        lost_note: lostNote || null,
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
      title: "Negócio perdido",
      description: "Negócio marcado como perdido.",
    });
    
    // Aguardar um pouco para o trigger processar e então refetch
    setTimeout(() => {
      const refetchHistory = async () => {
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
      refetchHistory();
    }, 500);
    
    setLostDialog(false);
    setLostReason("");
    setLostNote("");
    onOpenChange(false);
    onSuccess();
  };

  const handleMoveToPipeline = async () => {
    if (!selectedPipeline) {
      toast({
        title: "Selecione um funil",
        description: "Por favor, selecione o funil de destino.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStage) {
      toast({
        title: "Selecione uma etapa",
        description: "Por favor, selecione a etapa de destino no novo funil.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("crm_deals")
      .update({
        pipeline_id: selectedPipeline,
        stage_id: selectedStage,
        stage_entered_at: new Date().toISOString(),
      })
      .eq("id", deal.id);

    if (error) {
      toast({
        title: "Erro ao mover negócio",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Negócio movido para outro funil com sucesso!",
    });
    
    setTimeout(() => {
      const refetchHistory = async () => {
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
      refetchHistory();
    }, 500);
    
    setSelectedPipeline("");
    setSelectedStage("");
    onOpenChange(false);
    onSuccess();
  };

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
    setSelectedStage("");
    fetchStages(pipelineId);
  };

  const fetchStages = async (pipelineId: string) => {
    const { data } = await supabase
      .from("crm_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("position", { ascending: true });
    
    if (data) {
      const normalStages = data.filter(s => {
        const name = s.name.toLowerCase();
        return !(name.includes('ganho') || name.includes('won') || name.startsWith('✅') ||
                 name.includes('perdido') || name.includes('lost') || name.startsWith('❌'));
      });
      setAllStages(normalStages);
    }
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes do Negócio</SheetTitle>
        </SheetHeader>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {/* Informações do Negócio */}
          <Collapsible open={openSections.deal} onOpenChange={() => toggleSection('deal')}>
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <FileText className="h-5 w-5" />
                    <span>Informações do Negócio</span>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.deal ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t p-4 space-y-4 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Título</p>
                      <p className="font-medium text-base">{deal.title}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Produto</p>
                      <p className="font-medium">{productType}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Estágio</p>
                      <Badge>{stageName}</Badge>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Valor (R$)</p>
                      <p className="font-medium text-lg">
                        {Number(deal.value || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo no estágio</p>
                      <p className="font-medium">{timeInStage}h</p>
                    </div>
                  </div>

                  {deal.note && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Observações</p>
                      <p className="text-sm mt-1">{deal.note}</p>
                    </div>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="w-full"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar Negócio
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Informações do Cliente */}
          <Collapsible open={openSections.client} onOpenChange={() => toggleSection('client')}>
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <User className="h-5 w-5" />
                    <span>Informações do Cliente</span>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.client ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t p-4 space-y-4 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Nome do Lead</p>
                      <p className="font-medium text-base">{clientName}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone / WhatsApp</p>
                      <p className="font-medium">{phone}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">E-mail</p>
                      <p className="font-medium">{email}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Localização</p>
                      <p className="font-medium">{location}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Temperatura do Lead</p>
                      <Badge variant={getTemperatureBadge().variant}>
                        {getTemperatureBadge().text}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Origem do Lead</p>
                      <p className="font-medium">{sourceName}</p>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Responsáveis */}
          <Collapsible open={openSections.owners} onOpenChange={() => toggleSection('owners')}>
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <Users className="h-5 w-5" />
                    <span>Responsáveis</span>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.owners ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t p-4 space-y-4 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Arquiteto</p>
                      <p className="font-medium">{architectName}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Responsável Principal</p>
                      <p className="font-medium">{ownerName}</p>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Histórico WhatsApp */}
          <Collapsible open={openSections.whatsapp} onOpenChange={() => toggleSection('whatsapp')}>
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <MessageCircle className="h-5 w-5" />
                    <span>Histórico de Mensagens WhatsApp</span>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.whatsapp ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t p-4 space-y-3 animate-in slide-in-from-top-2">
                  {deal.conversation_history ? (
                    <div className="bg-muted/30 p-4 rounded-md border border-border/50">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {deal.conversation_history}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">
                        Nenhuma mensagem registrada ainda.
                      </p>
                      <p className="text-xs mt-2">
                        As mensagens do agente IA/n8n aparecerão aqui automaticamente
                      </p>
                    </div>
                  )}

                  {deal.last_interaction && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Última Interação</p>
                      <p className="font-medium">
                        {new Date(deal.last_interaction).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  )}

                  {deal.ai_status && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Status IA</p>
                      <Badge variant="secondary">{deal.ai_status}</Badge>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Ligação Agendada */}
          {deal.scheduled_call && (
            <Collapsible open={openSections.call} onOpenChange={() => toggleSection('call')}>
              <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 font-semibold">
                      <Phone className="h-5 w-5" />
                      <span>Ligação Agendada</span>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSections.call ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t p-4 animate-in slide-in-from-top-2">
                    <p className="font-medium text-lg">
                      {new Date(deal.scheduled_call).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Ações */}
          <Collapsible open={openSections.actions} onOpenChange={() => toggleSection('actions')}>
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <Settings className="h-5 w-5" />
                    <span>Ações</span>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.actions ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t p-4 space-y-4 animate-in slide-in-from-top-2">
                  {/* Mover para Outro Funil */}
                  <div className="space-y-2">
                    <Label>Mover para Outro Funil</Label>
                    <div className="space-y-2">
                      <Select value={selectedPipeline} onValueChange={handlePipelineChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o funil..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allPipelines.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {selectedPipeline && (
                        <Select value={selectedStage} onValueChange={setSelectedStage}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a etapa..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allStages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      <Button 
                        onClick={handleMoveToPipeline} 
                        disabled={!selectedPipeline || !selectedStage}
                        className="w-full"
                      >
                        Mover para Funil Selecionado
                      </Button>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2 flex-wrap pt-2 border-t">
                    <Button size="sm" onClick={() => setIsEditDialogOpen(true)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button size="sm" variant="default" onClick={handleMarkAsWon}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Marcar como Ganho
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setLostDialog(true)}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Marcar como Perdido
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleteDialog(true)}>
                      Excluir Negócio
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Histórico de Ações */}
          <Collapsible open={openSections.history} onOpenChange={() => toggleSection('history')}>
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <Clock className="h-5 w-5" />
                    <span>Histórico de Ações</span>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.history ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t p-4 animate-in slide-in-from-top-2">
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma ação registrada
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((item) => {
                        const userName = item.user?.full_name || 
                                       item.user?.email || 
                                       "Sistema";
                        const date = new Date(item.created_at || item.moved_at).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        });

                        let actionText = "";
                        let actionIcon = "📝";

                        switch (item.action_type) {
                          case "created":
                            actionText = "Negócio criado";
                            actionIcon = "✨";
                            break;
                          case "stage_change":
                            const fromStage = item.from_stage?.name || "Início";
                            const toStage = item.to_stage?.name || "Desconhecido";
                            actionText = `Movido de "${fromStage}" para "${toStage}"`;
                            actionIcon = "➡️";
                            break;
                          case "won":
                            actionText = "Negócio marcado como ganho";
                            actionIcon = "✅";
                            break;
                          case "lost":
                            actionText = item.description || "Negócio marcado como perdido";
                            actionIcon = "❌";
                            break;
                          case "field_change":
                            const fieldLabels: Record<string, string> = {
                              title: "Título",
                              value: "Valor",
                              product_type: "Tipo de produto",
                              owner_id: "Responsável",
                              architect_id: "Arquiteto",
                            };
                            const fieldLabel = fieldLabels[item.field_name || ""] || item.field_name;
                            
                            if (item.field_name === "value") {
                              const oldVal = item.old_value ? `R$ ${Number(item.old_value).toLocaleString("pt-BR")}` : "N/A";
                              const newVal = item.new_value ? `R$ ${Number(item.new_value).toLocaleString("pt-BR")}` : "N/A";
                              actionText = `${fieldLabel} alterado de ${oldVal} para ${newVal}`;
                            } else if (item.old_value && item.new_value) {
                              actionText = `${fieldLabel} alterado de "${item.old_value}" para "${item.new_value}"`;
                            } else {
                              actionText = `${fieldLabel} alterado`;
                            }
                            actionIcon = "✏️";
                            break;
                          case "note_change":
                            actionText = "Observações atualizadas";
                            actionIcon = "📄";
                            break;
                          case "schedule_change":
                            actionText = item.description || "Agendamento alterado";
                            actionIcon = "📅";
                            break;
                          default:
                            actionText = item.description || "Ação realizada";
                            actionIcon = "🔔";
                        }

                        return (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 p-3 bg-muted/30 rounded-md"
                          >
                            <span className="text-lg">{actionIcon}</span>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium">{actionText}</p>
                              <p className="text-xs text-muted-foreground">
                                {userName} • {date}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Tarefas */}
          <Collapsible open={openSections.tasks} onOpenChange={() => toggleSection('tasks')}>
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckSquare className="h-5 w-5" />
                    <span>Tarefas</span>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.tasks ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t p-4 animate-in slide-in-from-top-2">
                  <DealTasks dealId={deal.id} />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Timeline Colaborativa */}
          <Collapsible open={openSections.timeline} onOpenChange={() => toggleSection('timeline')}>
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <History className="h-5 w-5" />
                    <span>Atualizações de Equipe</span>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.timeline ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t p-4 animate-in slide-in-from-top-2">
                  <DealTimeline dealId={deal.id} />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </SheetContent>

      <EditDealDialog
        deal={deal}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={onSuccess}
      />

      <AlertDialog open={lostDialog} onOpenChange={setLostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Perdido</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o motivo da perda deste negócio
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="lost-reason">Motivo da Perda *</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger id="lost-reason">
                  <SelectValue placeholder="Selecione o motivo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preço alto">💰 Preço alto</SelectItem>
                  <SelectItem value="Comprou com concorrente">🏢 Comprou com concorrente</SelectItem>
                  <SelectItem value="Não respondeu">📵 Não respondeu / Sem contato</SelectItem>
                  <SelectItem value="Desistiu do projeto">🚫 Desistiu do projeto</SelectItem>
                  <SelectItem value="Prazo inadequado">⏰ Prazo inadequado</SelectItem>
                  <SelectItem value="Falta de orçamento">💸 Falta de orçamento</SelectItem>
                  <SelectItem value="Produto não atende">📦 Produto não atende necessidade</SelectItem>
                  <SelectItem value="Outro">❓ Outro motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lost-note">Observações Adicionais</Label>
              <Textarea
                id="lost-note"
                value={lostNote}
                onChange={(e) => setLostNote(e.target.value)}
                placeholder="Adicione detalhes sobre o motivo da perda..."
                rows={3}
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
              Tem certeza que deseja excluir este negócio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
