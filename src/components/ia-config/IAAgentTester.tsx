import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Send, Trash2, Loader2, RefreshCw, Lock, AlertCircle, Image, Video, Smile, MoreVertical } from "lucide-react";
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
  timestamp?: string;
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
  const mediaRegex = /\[(FOTO_PRODUTO|VIDEO_PRODUTO):(.+?):([^\]:]+)\]/g;
  const media: MediaItem[] = [];
  let match;
  
  while ((match = mediaRegex.exec(content)) !== null) {
    let url = match[2].trim();
    
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    media.push({
      type: match[1] === "FOTO_PRODUTO" ? "image" : "video",
      url: url,
      productName: match[3].trim()
    });
  }
  
  if (media.length > 0) {
    console.log("Mídia detectada:", media);
  }
  
  const cleanContent = content.replace(mediaRegex, "").trim();
  
  return { cleanContent, media };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function IAAgentTester({ isConfigComplete, completedSections, totalSections }: IAAgentTesterProps) {
  const progressPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

    const userMessage: Message = { 
      role: "user", 
      content: text.trim(),
      timestamp: formatTime(new Date())
    };
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

      setMessages(prev => [...prev, { role: "assistant", content: "", timestamp: formatTime(new Date()) }]);

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
            // JSON incompleto
          }
        }
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao conectar com o agente");
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
      <Card className="overflow-hidden">
        <div className="bg-[#075E54] text-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Assistente Tendenci</p>
              <p className="text-xs text-white/70">offline</p>
            </div>
          </div>
        </div>
        <div className="p-8 text-center space-y-4 bg-[#ECE5DD]">
          <div className="p-4 bg-white rounded-full w-fit mx-auto shadow-sm">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Configure as seções obrigatórias primeiro</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Negócio, Identidade e Comunicação são necessárias
            </p>
          </div>
          <div className="max-w-xs mx-auto space-y-2">
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completedSections} de {totalSections} seções ({progressPercentage}%)
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden flex flex-col h-[600px] md:h-[700px]">
      {/* Header WhatsApp */}
      <div className="bg-[#075E54] text-white p-3 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">Assistente Tendenci</p>
          <p className="text-xs text-white/70">
            {isLoading ? "digitando..." : isLoadingPrompt ? "carregando..." : "online"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 h-8 w-8"
            onClick={loadMasterPrompt}
            disabled={isLoadingPrompt}
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingPrompt && "animate-spin")} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 h-8 w-8"
            onClick={clearConversation}
            disabled={messages.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {completedSections < totalSections && (
        <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border-b border-yellow-500/20 shrink-0">
          <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
          <span className="text-xs" style={{ color: '#92400e' }}>
            Configuração incompleta ({completedSections}/{totalSections})
          </span>
        </div>
      )}

      {!masterPrompt && !isLoadingPrompt && (
        <div className="p-2 bg-red-500/10 border-b border-red-500/20 shrink-0">
          <span className="text-xs text-red-600">⚠️ Clique em atualizar para carregar configurações</span>
        </div>
      )}

      {/* Aviso sobre delay */}
      <div className="flex items-center gap-2 p-2 bg-blue-500/10 border-b border-blue-500/20 shrink-0">
        <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
        <span className="text-xs text-blue-700">
          ⏱️ O delay configurado será aplicado antes de cada resposta (simula o comportamento real)
        </span>
      </div>

      {/* Sugestões */}
      <div className="p-2 bg-[#ECE5DD] border-b shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {SUGESTOES.map((sugestao, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="cursor-pointer hover:bg-[#DCF8C6] bg-white text-xs py-1"
              style={{ color: '#111B21' }}
              onClick={() => sendMessage(sugestao)}
            >
              {sugestao}
            </Badge>
          ))}
        </div>
      </div>

      {/* Área de mensagens - WhatsApp style */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ 
          backgroundColor: '#ECE5DD',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c8c8' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="bg-[#FCF4CB] rounded-lg p-3 shadow-sm max-w-[280px] text-center">
              <p className="text-xs" style={{ color: '#54656F' }}>
                🔒 As mensagens são criptografadas de ponta a ponta. Ninguém fora desta conversa pode ler.
              </p>
            </div>
            <p className="text-xs mt-4" style={{ color: '#8696A0' }}>
              Envie uma mensagem para testar o agente
            </p>
          </div>
        ) : (
          messages.map((message, idx) => (
            <div
              key={idx}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "relative max-w-[85%] md:max-w-[70%] rounded-lg shadow-sm",
                  message.role === "user"
                    ? "bg-[#DCF8C6] rounded-tr-none"
                    : "bg-white rounded-tl-none"
                )}
              >
                {/* Tail da mensagem */}
                <div 
                  className={cn(
                    "absolute top-0 w-3 h-3",
                    message.role === "user" 
                      ? "-right-2 border-l-8 border-l-[#DCF8C6] border-t-8 border-t-transparent border-b-8 border-b-transparent"
                      : "-left-2 border-r-8 border-r-white border-t-8 border-t-transparent border-b-8 border-b-transparent"
                  )}
                />

                {/* Conteúdo da mensagem */}
                <div className="p-2 pb-4">
                  {message.content ? (
                    <p className="text-sm whitespace-pre-wrap break-words" style={{ color: '#111B21' }}>
                      {message.content}
                    </p>
                  ) : (
                    <div className="flex items-center gap-1 text-[#8696A0]">
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                  
                  {/* Mídia */}
                  {message.media && message.media.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.media.map((m, mediaIdx) => (
                        <div key={mediaIdx} className="rounded-lg overflow-hidden">
                          {m.type === "image" ? (
                            <div className="relative">
                              <img 
                                src={m.url} 
                                alt={m.productName} 
                                className="w-full max-w-[280px] h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(m.url, '_blank')}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden flex-col items-center justify-center h-32 bg-[#F0F2F5] rounded-lg text-[#8696A0]">
                                <Image className="h-8 w-8 mb-2 opacity-50" />
                                <span className="text-xs">Imagem indisponível</span>
                              </div>
                              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded text-white text-xs flex items-center gap-1">
                                <Image className="h-3 w-3" />
                                {m.productName}
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <video 
                                src={m.url} 
                                controls 
                                className="w-full max-w-[280px] h-auto rounded-lg"
                                onError={(e) => {
                                  (e.target as HTMLVideoElement).style.display = 'none';
                                  (e.target as HTMLVideoElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden flex-col items-center justify-center h-32 bg-[#F0F2F5] rounded-lg text-[#8696A0]">
                                <Video className="h-8 w-8 mb-2 opacity-50" />
                                <span className="text-xs">Vídeo indisponível</span>
                              </div>
                              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded text-white text-xs flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                {m.productName}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span 
                  className="absolute bottom-1 right-2 text-[10px]"
                  style={{ color: message.role === "user" ? '#667781' : '#8696A0' }}
                >
                  {message.timestamp}
                  {message.role === "user" && (
                    <span className="ml-1 text-[#53BDEB]">✓✓</span>
                  )}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input WhatsApp style */}
      <form onSubmit={handleSubmit} className="bg-[#F0F2F5] p-2 flex items-center gap-2 shrink-0">
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="text-[#54656F] hover:bg-transparent h-10 w-10 shrink-0"
        >
          <Smile className="h-6 w-6" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Mensagem"
          disabled={isLoading || !masterPrompt}
          className="flex-1 rounded-full bg-white border-0 h-10 text-sm placeholder:text-[#8696A0]"
          style={{ color: '#111B21' }}
        />
        <Button 
          type="submit" 
          size="icon"
          disabled={isLoading || !input.trim() || !masterPrompt}
          className="bg-[#00A884] hover:bg-[#008069] text-white rounded-full h-10 w-10 shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    </Card>
  );
}
