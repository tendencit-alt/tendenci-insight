import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Send, Trash2, Loader2, User, RefreshCw, MessageSquare, Lock, AlertCircle, Image, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MediaItem {
  type: "image" | "video";
  url: string;
  productName: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  media?: MediaItem[];
}

interface IAAgentTesterProps {
  isConfigComplete: boolean;
  completedSections: number;
  totalSections: number;
}

const SUGESTOES = [
  "Olá!",
  "Quero ver fotos dos produtos",
  "Me mostra a poltrona",
  "Quanto custa?",
  "Vocês fazem entrega?",
];

// Função para detectar e extrair marcadores de mídia do conteúdo
function parseMediaFromContent(content: string): { cleanContent: string; media: MediaItem[] } {
  const mediaRegex = /\[(IMAGE|VIDEO):([^\|]+)\|([^\]]+)\]/g;
  const media: MediaItem[] = [];
  let match;
  
  while ((match = mediaRegex.exec(content)) !== null) {
    media.push({
      type: match[1].toLowerCase() as "image" | "video",
      url: match[2],
      productName: match[3]
    });
  }
  
  // Remover marcadores do texto
  const cleanContent = content.replace(mediaRegex, "").trim();
  
  return { cleanContent, media };
}

export function IAAgentTester({ isConfigComplete, completedSections, totalSections }: IAAgentTesterProps) {
  const progressPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ao adicionar mensagens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Carregar master prompt ao montar
  useEffect(() => {
    loadMasterPrompt();
  }, []);

  const loadMasterPrompt = async () => {
    setIsLoadingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-master-prompt");
      
      if (error) throw error;
      
      if (data?.prompt) {
        setMasterPrompt(data.prompt);
        console.log("Master prompt carregado:", data.prompt.substring(0, 200) + "...");
      }
    } catch (error) {
      console.error("Erro ao carregar master prompt:", error);
      toast.error("Erro ao carregar configurações da IA");
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    if (!masterPrompt) {
      toast.error("Aguarde o carregamento das configurações da IA");
      return;
    }

    const userMessage: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-agent-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: text.trim() }],
            masterPrompt,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Limite de requisições excedido. Aguarde um momento.");
        }
        if (response.status === 402) {
          throw new Error("Créditos insuficientes. Adicione créditos à sua conta.");
        }
        throw new Error("Erro ao conectar com o agente");
      }

      if (!response.body) throw new Error("Sem resposta do servidor");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Adicionar mensagem vazia do assistente
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              
              // Parse mídia do conteúdo atual
              const { cleanContent, media } = parseMediaFromContent(assistantContent);
              
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.role === "assistant") {
                  updated[lastIdx] = { 
                    ...updated[lastIdx], 
                    content: cleanContent,
                    media: media.length > 0 ? media : undefined
                  };
                }
                return updated;
              });
            }
          } catch {
            // JSON incompleto, continuar
          }
        }
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao conectar com o agente");
      // Remover mensagem vazia se houver erro
      setMessages(prev => prev.filter(m => m.content !== ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearConversation = () => {
    setMessages([]);
    toast.success("Conversa limpa");
  };

  if (!isConfigComplete) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted/50 rounded-lg">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Testar Agente IA</CardTitle>
              <CardDescription>
                Complete as configurações mínimas para testar o agente
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">Configure as seções obrigatórias primeiro</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Negócio, Identidade e Comunicação são necessárias para o agente funcionar
              </p>
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {completedSections} de {totalSections} seções configuradas ({progressPercentage}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        {completedSections < totalSections && (
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">
              Algumas seções ainda não estão configuradas ({completedSections}/{totalSections}). 
              O agente pode não responder de forma ideal.
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Testar Agente IA
                {isLoadingPrompt && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                Simule uma conversa com o agente - suporta envio de fotos e vídeos
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadMasterPrompt} disabled={isLoadingPrompt}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingPrompt && "animate-spin")} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={clearConversation} disabled={messages.length === 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status do Master Prompt */}
        {!masterPrompt && !isLoadingPrompt && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg text-center">
            ⚠️ Não foi possível carregar as configurações. Clique em "Atualizar" para tentar novamente.
          </div>
        )}

        {/* Sugestões de mensagens */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Mensagens sugeridas:</span>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((sugestao, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => sendMessage(sugestao)}
              >
                {sugestao}
              </Badge>
            ))}
          </div>
        </div>

        {/* Área de chat */}
        <div className="border rounded-lg bg-muted/20">
          <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Envie uma mensagem para começar a conversa</p>
                <p className="text-xs mt-1">Experimente pedir para ver fotos dos produtos!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content || (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Digitando...
                          </span>
                        )}
                      </p>
                      
                      {/* Renderizar mídia */}
                      {message.media && message.media.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.media.map((m, mediaIdx) => (
                            <div key={mediaIdx} className="rounded-lg overflow-hidden border bg-background">
                              {m.type === "image" ? (
                                <div className="relative">
                                  <img 
                                    src={m.url} 
                                    alt={m.productName} 
                                    className="w-full h-auto max-h-48 object-cover"
                                    onError={(e) => {
                                      // Fallback para imagem quebrada
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="hidden flex-col items-center justify-center h-32 bg-muted text-muted-foreground">
                                    <Image className="h-8 w-8 mb-2 opacity-50" />
                                    <span className="text-xs">Imagem indisponível</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <video 
                                    src={m.url} 
                                    controls 
                                    className="w-full h-auto max-h-48"
                                    onError={(e) => {
                                      (e.target as HTMLVideoElement).style.display = 'none';
                                      (e.target as HTMLVideoElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="hidden flex-col items-center justify-center h-32 bg-muted text-muted-foreground">
                                    <Video className="h-8 w-8 mb-2 opacity-50" />
                                    <span className="text-xs">Vídeo indisponível</span>
                                  </div>
                                </div>
                              )}
                              <div className="p-2 bg-muted/50 flex items-center gap-2">
                                {m.type === "image" ? (
                                  <Image className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <Video className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="text-xs text-muted-foreground">{m.productName}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input de mensagem */}
          <form onSubmit={handleSubmit} className="border-t p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite como um cliente..."
              disabled={isLoading || !masterPrompt}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim() || !masterPrompt}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Este teste usa as configurações atuais. Peça para ver fotos dos produtos cadastrados!
        </p>
      </CardContent>
    </Card>
  );
}
