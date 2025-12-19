import { useState, useEffect } from "react";
import { MessageSquare, Trash2, Plus, History, ChevronDown, ChevronUp, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIConversation } from "@/hooks/useAIChat";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface ConversationsListProps {
  conversations: AIConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function ConversationsList({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRefresh,
  isLoading,
}: ConversationsListProps) {
  // Abrir automaticamente se há conversas
  const [isOpen, setIsOpen] = useState(conversations.length > 0);

  // Atualizar estado quando conversas mudam
  useEffect(() => {
    if (conversations.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [conversations.length]);

  if (conversations.length === 0) {
    return (
      <div className="border-b pb-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <History className="h-3 w-3" />
            Histórico de Conversas
          </span>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewConversation}
              className="h-7 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Nova Conversa
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center py-3 bg-muted/30 rounded-lg">
          Nenhuma conversa salva ainda
        </p>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-b pb-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 hover:bg-muted/50">
            <History className="h-3 w-3" />
            <span className="font-medium text-muted-foreground uppercase tracking-wide">
              Histórico ({conversations.length})
            </span>
            {isOpen ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-7 w-7 p-0"
              title="Atualizar histórico"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewConversation}
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Nova
          </Button>
        </div>
      </div>
      
      <CollapsibleContent>
        <ScrollArea className="max-h-48">
          <div className="space-y-1 pr-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conv.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${
                  currentConversationId === conv.id ? "text-primary" : "text-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium truncate">
                      {conv.title || "Nova conversa"}
                    </p>
                    {currentConversationId === conv.id && (
                      <Badge variant="secondary" className="h-4 px-1 text-[9px] shrink-0">
                        <Check className="h-2 w-2 mr-0.5" />
                        Atual
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.updated_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}
