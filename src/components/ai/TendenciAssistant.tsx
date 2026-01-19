import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bot, Send, Loader2, Sparkles, TrendingUp, AlertTriangle, Target, BarChart3, Database, Cloud, CloudOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { streamChat, Message } from "@/utils/aiChat";
import { useAIChat } from "@/hooks/useAIChat";
import { ConversationsList } from "./ConversationsList";
import DOMPurify from "dompurify";

const quickQuestions = [
  { icon: BarChart3, text: "Como está meu pipeline?", color: "text-blue-500" },
  { icon: Target, text: "Comparar com mês anterior", color: "text-green-500" },
  { icon: AlertTriangle, text: "Onde está travando o funil?", color: "text-amber-500" },
  { icon: TrendingUp, text: "Previsão de fechamento do mês", color: "text-purple-500" },
];

// Helper function to escape HTML entities before markdown formatting
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to sanitize formatted HTML
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'code'],
    ALLOWED_ATTR: ['class'],
  });
}

// Componente para renderizar markdown básico
function MarkdownContent({ content }: { content: string }) {
  const renderLine = (line: string, index: number) => {
    // First escape any HTML in the content
    let escaped = escapeHtml(line);
    // Then apply markdown formatting
    let formatted = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
    // Itálico: *texto* (mas não confundir com negrito)
    formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    // Código inline: `código`
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>');
    
    // Headers
    if (line.startsWith('### ')) {
      return <h3 key={index} className="font-semibold text-base mt-3 mb-1">{line.slice(4)}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={index} className="font-semibold text-lg mt-3 mb-1">{line.slice(3)}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={index} className="font-bold text-xl mt-3 mb-1">{line.slice(2)}</h1>;
    }
    
    // Bullet points
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const bulletContent = formatted.slice(2);
      return (
        <div key={index} className="flex gap-2 ml-2">
          <span className="text-muted-foreground">•</span>
          <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(bulletContent) }} />
        </div>
      );
    }
    
    // Numbered lists
    const numberedMatch = escaped.match(/^(\d+)\.\s/);
    if (numberedMatch) {
      const numberedContent = formatted.slice(numberedMatch[0].length);
      return (
        <div key={index} className="flex gap-2 ml-2">
          <span className="text-muted-foreground min-w-[1.5rem]">{numberedMatch[1]}.</span>
          <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(numberedContent) }} />
        </div>
      );
    }
    
    // Linha normal
    if (line.trim() === '') {
      return <div key={index} className="h-2" />;
    }
    
    return <p key={index} dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatted) }} />;
  };

  return (
    <div className="space-y-1">
      {content.split('\n').map((line, i) => renderLine(line, i))}
    </div>
  );
}

export function TendenciAssistant() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    conversations,
    currentConversationId,
    messages,
    setMessages,
    isSaving,
    saveError,
    loadMessages,
    createConversation,
    saveMessage,
    generateTitle,
    deleteConversation,
    startNewConversation,
    loadMostRecentConversation,
    loadConversations,
  } = useAIChat();

  // Carregar conversa recente ao abrir
  useEffect(() => {
    if (isOpen) {
      loadConversations();
      if (!currentConversationId && messages.length === 0) {
        loadMostRecentConversation();
      }
    }
  }, [isOpen, currentConversationId, messages.length, loadMostRecentConversation, loadConversations]);

  // Auto-scroll quando mensagens mudam
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: textToSend,
    };

    // Atualizar UI imediatamente
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsAnalyzing(true);

    // Criar conversa se não existir
    let conversationId = currentConversationId;
    const isFirstMessage = messages.length === 0;

    if (!conversationId) {
      conversationId = await createConversation();
      
      // Se não conseguiu criar, parar e informar usuário
      if (!conversationId) {
        setIsLoading(false);
        setIsAnalyzing(false);
        toast({
          title: "Erro",
          description: "Não foi possível iniciar a conversa. Verifique sua conexão.",
          variant: "destructive",
        });
        // Remover mensagem da UI pois não foi salva
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
    }

    // Salvar mensagem do usuário
    await saveMessage("user", textToSend, conversationId);
    
    // Gerar título na primeira mensagem
    if (isFirstMessage) {
      await generateTitle(textToSend, conversationId);
    }

    let assistantContent = "";

    const updateAssistantMessage = (chunk: string) => {
      assistantContent += chunk;
      setIsAnalyzing(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMessage],
        onChunk: updateAssistantMessage,
        onDone: async () => {
          setIsLoading(false);
          setIsAnalyzing(false);
          
          // Salvar resposta do assistente
          if (conversationId && assistantContent) {
            await saveMessage("assistant", assistantContent, conversationId);
          }
        },
        onError: (error) => {
          setIsLoading(false);
          setIsAnalyzing(false);
          toast({
            title: "Erro",
            description: error,
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoading(false);
      setIsAnalyzing(false);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao enviar mensagem. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [input, isLoading, messages, currentConversationId, createConversation, saveMessage, generateTitle, setMessages, toast]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  const handleSelectConversation = (id: string) => {
    loadMessages(id);
  };

  const handleNewConversation = async () => {
    const newId = await startNewConversation();
    if (newId) {
      toast({
        title: "Nova conversa",
        description: "Iniciando nova conversa com o Agente CEO.",
      });
    }
  };

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 z-50 group"
        >
          <Sparkles className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="w-full sm:max-w-xl flex flex-col h-full"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-lg font-semibold">Agente Tendenci CEO</span>
              <p className="text-xs text-muted-foreground font-normal">
                Diretor Comercial Sênior • Análise Estratégica com IA Pro
              </p>
            </div>
            <div className="relative group">
              {isSaving ? (
                <Cloud className="h-4 w-4 text-primary animate-pulse" />
              ) : saveError ? (
                <CloudOff className="h-4 w-4 text-destructive" />
              ) : (
                <Cloud className="h-4 w-4 text-green-500" />
              )}
              <span className="absolute -bottom-8 right-0 text-xs bg-popover text-popover-foreground px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {isSaving ? "Salvando..." : saveError ? "Erro ao salvar" : "Sincronizado"}
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Lista de conversas anteriores */}
        <div className="pt-3">
          <ConversationsList
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onRefresh={loadConversations}
            isLoading={isLoading}
          />
        </div>

        <ScrollArea ref={scrollRef} className="flex-1 pr-4">
          {messages.length === 0 ? (
            <div className="flex flex-col h-full">
              <div className="text-center p-6 bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl mb-4">
                <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-3">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-medium mb-1">
                  Olá! Sou o Agente Tendenci
                </p>
                <p className="text-sm text-muted-foreground">
                  Especialista em gestão comercial e vendas B2B.
                  <br />
                  Analiso dados reais do seu sistema em tempo real.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                  Perguntas rápidas
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickQuestion(q.text)}
                      className="flex items-center gap-2 p-3 text-left text-sm rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-all group"
                    >
                      <q.icon className={`h-4 w-4 ${q.color} group-hover:scale-110 transition-transform`} />
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                        {q.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  💡 <strong>Dica:</strong> Pergunte sobre vendedores específicos, metas, projetos atrasados, leads quentes ou peça uma análise geral.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    <div className="text-sm leading-relaxed">
                      {msg.role === "assistant" ? (
                        <MarkdownContent content={msg.content} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {isAnalyzing ? (
                        <>
                          <Database className="h-4 w-4 animate-pulse" />
                          <span className="text-sm">Consultando dados...</span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Gerando análise...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            placeholder="Pergunte sobre vendas, metas, projetos..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="rounded-full"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="rounded-full shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
