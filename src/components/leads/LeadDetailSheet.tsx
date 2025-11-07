import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Edit, ArrowRight, FileText, Image as ImageIcon, Download, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadDetailSheetProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailSheet({ lead, open, onOpenChange }: LeadDetailSheetProps) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  useEffect(() => {
    if (open && lead) {
      fetchAttachments();
    }
  }, [open, lead]);

  const fetchAttachments = async () => {
    setLoadingAttachments(true);
    const { data, error } = await supabase
      .from('lead_attachments')
      .select('*')
      .eq('lead_id', lead.id)
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      setAttachments(data);
    }
    setLoadingAttachments(false);
  };

  const downloadFile = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('lead-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error('Erro ao baixar arquivo');
    }
  };

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

          {/* Anexos */}
          {attachments.length > 0 && (
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Anexos ({attachments.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => downloadFile(attachment)}
                  >
                    <div className="flex items-center gap-3">
                      {attachment.file_type.includes('pdf') ? (
                        <FileText className="w-8 h-8 text-red-500" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-blue-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(attachment.file_size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Download className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Conversas WhatsApp */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Conversas WhatsApp
            </h3>
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Cliente</p>
                  <p className="text-sm mt-1 p-2 bg-white dark:bg-card rounded">
                    Olá, gostaria de orçamento para mesa maciça
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Há 2 horas</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Atendente IA</p>
                  <p className="text-sm mt-1 p-2 bg-primary/10 rounded">
                    Olá! Claro, posso te ajudar com isso. Qual o tamanho que você procura?
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Há 2 horas</p>
                </div>
              </div>
              <div className="p-3 border-l-4 border-blue-500 bg-blue-500/5 rounded">
                <p className="text-xs text-muted-foreground">
                  💬 <strong>Integração WhatsApp:</strong> Este campo exibirá o histórico completo de conversas quando integrado com a API do WhatsApp
                </p>
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Histórico de Eventos</h3>
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
