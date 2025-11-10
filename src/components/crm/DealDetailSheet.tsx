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
  const architectName = deal.architect?.name || "Não atribuído";
  const stageName = deal.stage?.name || "N/A";
  const temperature = deal.lead?.temperature || "frio";
  const timeInStage = Math.floor(
    (new Date().getTime() - new Date(deal.stage_entered_at).getTime()) /
      (1000 * 60 * 60)
  );

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
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Título</p>
                  <p className="font-medium">{deal.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Arquiteto</p>
                  <p className="font-medium">{architectName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Temperatura</p>
                  <Badge variant={temperature === "quente" ? "default" : "secondary"}>
                    {temperature === "quente" ? "🔥 Quente" : "❄️ Frio"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estágio</p>
                  <Badge>{stageName}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor (R$)</p>
                  <p className="font-medium">
                    {Number(deal.value || 0).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="col-span-2">
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

              <div className="flex gap-2 pt-4 flex-wrap">
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

          {/* Atividades */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade registrada
              </p>
            </CardContent>
          </Card>

          {/* Tarefas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Nenhuma tarefa cadastrada
              </p>
            </CardContent>
          </Card>
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
