import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Flame, Snowflake, User, Bot, X, Mic, Paperclip } from "lucide-react";
import { useEffect, useState, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DealCardProps {
  deal: any;
  timeInStage: number;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDelete?: (dealId: string) => void;
}

function DealCardComponent({ deal, timeInStage, onClick, onDragStart, onDelete }: DealCardProps) {
  const [audioCount, setAudioCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);

  const fetchFiles = useCallback(async () => {
    const { data } = await supabase
      .from("crm_deal_files")
      .select("file_type")
      .eq("deal_id", deal.id);

    if (data) {
      const audios = data.filter(f => f.file_type?.startsWith('audio/')).length;
      const files = data.filter(f => !f.file_type?.startsWith('audio/')).length;
      setAudioCount(audios);
      setFileCount(files);
    }
  }, [deal.id]);

  useEffect(() => {
    if (deal.id) {
      fetchFiles();
    }
  }, [deal.id, fetchFiles]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(deal.id);
    }
  };
  const clientName = deal.lead?.client?.name || "Sem cliente";
  const phone = deal.lead?.client?.phone || "";
  const temperature = deal.lead?.temperature || "frio";
  const productType = deal.product_type;
  const ownerName = deal.owner?.full_name || deal.owner?.email?.split("@")[0] || "";
  const fromAI = deal.from_ai === true;

  const getTemperatureIcon = () => {
    switch (temperature.toLowerCase()) {
      case "quente":
        return <Flame className="h-3 w-3 text-red-500" />;
      case "morno":
        return <Flame className="h-3 w-3 text-orange-500" />;
      case "frio":
        return <Snowflake className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <Card
      className="cursor-move hover:shadow-lg hover:border-primary/50 transition-all duration-200 hover:scale-[1.01] animate-fade-in relative group border-border/50 hover:bg-accent/5"
      onClick={onClick}
      draggable={true}
      onDragStart={onDragStart}
    >
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <X className="h-3.5 w-3.5 text-destructive" />
        </Button>
      )}
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Nome do cliente em destaque com tag IA */}
          <div className="flex items-center gap-2 flex-wrap">
            {fromAI && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex-shrink-0">
                <Bot className="h-3 w-3 mr-1" />
                IA
              </Badge>
            )}
            <p className="font-bold text-base line-clamp-1 flex-1 min-w-0">{clientName}</p>
          </div>
          
          {/* Título do negócio com indicador de etapa Lead */}
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground flex-1 line-clamp-1">{deal.title}</p>
          </div>
          
          {/* Telefone */}
          {phone && (
            <p className="text-xs text-muted-foreground truncate">{phone}</p>
          )}
          
          {/* Última Observação */}
          {deal.note && (
            <div className="p-2 bg-muted/50 rounded-md border-l-3 border-primary/40">
              <p className="text-xs font-semibold text-muted-foreground mb-1">📋 Última Observação:</p>
              <p className="text-xs line-clamp-2 leading-relaxed">{deal.note}</p>
            </div>
          )}

          {/* Arquivos e Áudios */}
          {(audioCount > 0 || fileCount > 0) && (
            <div className="flex gap-1 flex-wrap">
              {audioCount > 0 && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Mic className="h-3 w-3" />
                  {audioCount}
                </Badge>
              )}
              {fileCount > 0 && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {fileCount}
                </Badge>
              )}
            </div>
          )}
          
          {/* Badges: Temperatura e Tipo de Produto */}
          <div className="flex flex-wrap gap-1.5">
            {temperature && (
              <Badge variant="outline" className="text-xs flex items-center gap-1.5 flex-shrink-0 px-2 py-1">
                {getTemperatureIcon()}
                <span className="truncate font-medium">{temperature.charAt(0).toUpperCase() + temperature.slice(1)}</span>
              </Badge>
            )}
            {productType && (
              <Badge variant="secondary" className="text-xs truncate px-2 py-1 font-medium">
                {productType}
              </Badge>
            )}
          </div>
          
          {/* Responsável */}
          {ownerName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{ownerName}</span>
            </div>
          )}
          
          {/* Valor e Tempo */}
          <div className="flex items-center justify-between pt-3 border-t gap-2">
            <Badge variant="secondary" className="text-sm font-bold truncate px-3 py-1.5">
              R$ {Number(deal.value || 0).toLocaleString("pt-BR")}
            </Badge>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-shrink-0">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{timeInStage}h</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Exportar componente com React.memo para otimização
export const DealCard = memo(DealCardComponent);
