import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Edit, ArrowRight } from "lucide-react";

interface LeadDetailSheetProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailSheet({ lead, open, onOpenChange }: LeadDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">Detalhes do Lead</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Info Card */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Informações Gerais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Nome</span>
                <p className="font-medium">{lead.client?.name || "N/A"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Telefone</span>
                <p className="font-medium">{lead.client?.phone || "N/A"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">E-mail</span>
                <p className="font-medium">{lead.client?.email || "N/A"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Origem</span>
                <Badge variant="outline">{lead.source?.name || "N/A"}</Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Temperatura</span>
                <Badge className="bg-orange-500">Quente</Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge>{lead.status}</Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Responsável</span>
                <p className="font-medium">{lead.architect?.name || "Não atribuído"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Score</span>
                <Badge className="bg-gradient-to-r from-primary to-accent text-white">85</Badge>
              </div>
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button className="flex-1 gap-2">
                <Edit className="w-4 h-4" />
                Editar
              </Button>
              <Button className="flex-1 gap-2" variant="secondary">
                <ArrowRight className="w-4 h-4" />
                Converter em Negócio
              </Button>
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Histórico Completo</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Lead criado via WhatsApp IA</p>
                  <p className="text-xs text-muted-foreground">Há 2 horas</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Primeira mensagem recebida</p>
                  <p className="text-xs text-muted-foreground">Há 2 horas</p>
                  <p className="text-sm mt-1 p-2 bg-muted rounded">
                    "Olá, gostaria de orçamento para mesa maciça"
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Lead qualificado pela IA</p>
                  <p className="text-xs text-muted-foreground">Há 1 hora</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
