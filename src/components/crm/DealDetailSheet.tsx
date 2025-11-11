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
  const [history, setHistory] = useState<any[]>([]);

  // Fetch histórico de movimentações
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

    fetchHistory();

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
  }, [deal?.id]);

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

    toast({
      title: "Sucesso",
      description: "Negócio marcado como ganho!",
    });
    onOpenChange(false);
    onSuccess();
  };

  const handleMarkAsLost = async () => {
    const { error } = await supabase
      .from("crm_deals")
      .update({ 
        status: "lost",
        lost_reason: "Perdido manualmente",
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
    setLostDialog(false);
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
            <CardContent className="pt-6">
              <div className="flex gap-2 flex-wrap">
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
              Tem certeza que deseja marcar este negócio como perdido?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsLost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
