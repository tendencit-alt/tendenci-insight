const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tendenci-assistant`;

export type Message = { 
  role: "user" | "assistant"; 
  content: string;
};

export const streamChat = async ({
  messages,
  onChunk,
  onDone,
  onError,
}: {
  messages: Message[];
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError?: (error: string) => void;
}) => {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        onError?.("Limite de requisições excedido. Tente novamente em alguns instantes.");
        return;
      }
      if (resp.status === 402) {
        onError?.("Créditos insuficientes. Entre em contato com o administrador.");
        return;
      }
      throw new Error("Falha ao iniciar conversa");
    }

    const contentType = resp.headers.get("content-type") || "";
    
    // Se for JSON (resposta antiga sem streaming)
    if (contentType.includes("application/json")) {
      const data = await resp.json();
      if (data.error) {
        onError?.(data.error);
        return;
      }
      if (data.content) {
        onChunk(data.content);
        onDone();
      }
      return;
    }

    // Se for SSE (streaming)
    if (!resp.body) {
      throw new Error("Sem corpo de resposta");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      // Processar linha por linha
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        // Remover \r se existir (CRLF)
        if (line.endsWith("\r")) line = line.slice(0, -1);
        
        // Ignorar linhas vazias e comentários SSE
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        
        // Fim do stream
        if (jsonStr === "[DONE]") {
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            onChunk(content);
          }
        } catch {
          // JSON incompleto - colocar de volta no buffer
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Processar qualquer conteúdo restante no buffer
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onChunk(content);
        } catch {
          // Ignorar fragmentos incompletos
        }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream chat error:", error);
    onError?.(error instanceof Error ? error.message : "Erro desconhecido");
  }
};
