import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, CheckCircle, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EditDealDialog } from "./EditDealDialog";
import { DealTimeline } from "./DealTimeline";
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
  const [wonStageId, setWonStageId] = useState<string | null>(null);
  const [lostStageId, setLostStageId] = useState<string | null>(null);

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
          moved_by_user:profiles(full_name, email)
        `)
        .eq("deal_id", deal.id)
        .order("moved_at", { ascending: false });

      if (!error && data) {
        setHistory(data);
      }
    };

    const fetchStages = async () => {
      if (!deal.pipeline_id) return;
      
      const { data } = await supabase
        .from("crm_stages")
        .select("*")
        .eq("pipeline_id", deal.pipeline_id)
        .order("position", { ascending: true });
      
      if (data) {
        setAllStages(data);
        
        // Buscar etapas de ganho e perdido
        const wonStage = data.find(s => {
          const name = s.name.toLowerCase();
          return name.includes('ganho') || name.includes('won') || name.startsWith('✅');
        });
        
        const lostStage = data.find(s => {
          const name = s.name.toLowerCase();
          return name.includes('perdido') || name.includes('lost') || name.startsWith('❌');
        });
        
        if (wonStage) setWonStageId(wonStage.id);
        if (lostStage) setLostStageId(lostStage.id);
      }
    };

    fetchHistory();
    fetchStages();

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
    if (!wonStageId) {
      toast({
        title: "Erro",
        description: "Etapa de ganho não encontrada no funil",
        variant: "destructive",
      });
      return;
    }
    
    const { error } = await supabase
      .from("crm_deals")
      .update({ 
        status: "won",
        stage_id: wonStageId,
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

    if (!lostStageId) {
      toast({
        title: "Erro",
        description: "Etapa de perdido não encontrada no funil",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("crm_deals")
      .update({ 
        status: "lost",
        stage_id: lostStageId,
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

  const handleMoveToStage = async () => {
    if (!selectedStage) {
      toast({
        title: "Selecione uma etapa",
        description: "Por favor, selecione a etapa de destino.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("crm_deals")
      .update({
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
      description: "Negócio movido com sucesso!",
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
    
    setSelectedStage("");
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes do Negócio</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Informações principais */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Informações do Negócio</CardTitle>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
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
                  <p className="text-sm text-muted-foreground">
                    Tempo no estágio
                  </p>
                  <p className="font-medium">{timeInStage}h</p>
                </div>
              </div>

              {deal.note && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="text-sm mt-1">{deal.note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações do Cliente */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Informações do Cliente</CardTitle>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>

          {/* Responsáveis */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Responsáveis</CardTitle>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>

          {/* Comunicação */}
          {(deal.conversation_history || deal.scheduled_call) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comunicação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deal.scheduled_call && (
                  <div>
                    <p className="text-sm text-muted-foreground">Ligação Agendada</p>
                    <p className="font-medium">
                      {new Date(deal.scheduled_call).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                )}
                
                {deal.conversation_history && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Histórico de Mensagens (IA / WhatsApp)
                    </p>
                    <div className="bg-muted/30 p-3 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{deal.conversation_history}</p>
                    </div>
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
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mover para Etapa */}
              <div className="space-y-2">
                <Label>Mover para Etapa</Label>
                <div className="flex gap-2">
                  <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger className="flex-1">
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
                  <Button onClick={handleMoveToStage} disabled={!selectedStage}>
                    Mover
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
            </CardContent>
          </Card>

          {/* Histórico de Ações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Ações</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma ação registrada
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => {
                    const userName = item.moved_by_user?.full_name || 
                                   item.moved_by_user?.email || 
                                   "Sistema";
                    const date = new Date(item.moved_at).toLocaleString("pt-BR", {
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
            </CardContent>
          </Card>

          {/* Timeline Colaborativa */}
          <DealTimeline dealId={deal.id} />
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
