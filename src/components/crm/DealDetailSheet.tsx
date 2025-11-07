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
  if (!deal) return null;

  const clientName = deal.lead?.client?.name || "Sem cliente";
  const phone = deal.lead?.client?.phone || "N/A";
  const architectName = deal.architect?.name || "Não atribuído";
  const stageName = deal.stage?.name || "N/A";
  const timeInStage = Math.floor(
    (new Date().getTime() - new Date(deal.stage_entered_at).getTime()) /
      (1000 * 60 * 60)
  );

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

              <div className="flex gap-2 pt-4">
                <Button size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button size="sm" variant="default">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Converter em Projeto
                </Button>
                <Button size="sm" variant="destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Marcar como Perdido
                </Button>
              </div>
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
    </Sheet>
  );
}
