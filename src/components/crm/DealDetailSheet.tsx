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
        
        // Identificar etapas de Ganho e Perdido
        const wonStage = data.find(s => s.name.toLowerCase().includes('ganho') || s.name.toLowerCase().includes('won'));
        const lostStage = data.find(s => s.name.toLowerCase().includes('perdido') || s.name.toLowerCase().includes('lost'));
        
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
    const { data: userData } = await supabase.auth.getUser();
    
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

    // Registrar no histórico
    await supabase.from("crm_deal_history").insert({
      deal_id: deal.id,
      from_stage_id: deal.stage_id,
      to_stage_id: wonStageId,
      moved_by: userData.user?.id,
    });

    toast({
      title: "Sucesso",
      description: "Negócio marcado como ganho!",
    });
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

    const { data: userData } = await supabase.auth.getUser();

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

    // Registrar no histórico
    await supabase.from("crm_deal_history").insert({
      deal_id: deal.id,
      from_stage_id: deal.stage_id,
      to_stage_id: lostStageId,
      moved_by: userData.user?.id,
    });

    toast({
      title: "Negócio perdido",
      description: "Negócio marcado como perdido.",
    });
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

    const { data: userData } = await supabase.auth.getUser();

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

    // Registrar no histórico
    await supabase.from("crm_deal_history").insert({
      deal_id: deal.id,
      from_stage_id: deal.stage_id,
      to_stage_id: selectedStage,
      moved_by: userData.user?.id,
    });

    toast({
      title: "Sucesso",
      description: "Negócio movido com sucesso!",
    });
    setSelectedStage("");
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
            <CardHeader>
              <CardTitle className="text-lg">Informações do Negócio</CardTitle>
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
            <CardHeader>
              <CardTitle className="text-lg">Informações do Cliente</CardTitle>
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
            <CardHeader>
              <CardTitle className="text-lg">Responsáveis</CardTitle>
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
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Movimentação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Movimentação</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma movimentação registrada
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {item.from_stage && (
                            <>
                              <Badge variant="outline">{item.from_stage.name}</Badge>
                              <span className="text-muted-foreground">→</span>
                            </>
                          )}
                          <Badge>{item.to_stage.name}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.moved_at).toLocaleString("pt-BR")} •{" "}
                          {item.moved_by_user?.full_name || item.moved_by_user?.email || "Sistema"}
                        </p>
                      </div>
                    </div>
                  ))}
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
                placeholder="Detalhe o motivo da perda ou adicione observações relevantes..."
                value={lostNote}
                onChange={(e) => setLostNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setLostReason("");
              setLostNote("");
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsLost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Perda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
