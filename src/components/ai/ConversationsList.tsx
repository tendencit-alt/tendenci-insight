import { MessageSquare, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIConversation } from "@/hooks/useAIChat";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversationsListProps {
  conversations: AIConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function ConversationsList({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationsListProps) {
  if (conversations.length === 0) {
    return null;
  }

  return (
    <div className="border-b pb-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Conversas anteriores
        </span>
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
      <ScrollArea className="max-h-32">
        <div className="space-y-1">
          {conversations.slice(0, 5).map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                currentConversationId === conv.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {conv.title || "Nova conversa"}
                </p>
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
    </div>
  );
}
