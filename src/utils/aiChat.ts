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

    const data = await resp.json();
    
    if (data.error) {
      onError?.(data.error);
      return;
    }

    if (data.content) {
      onChunk(data.content);
      onDone();
    }
  } catch (error) {
    console.error("Stream chat error:", error);
    onError?.(error instanceof Error ? error.message : "Erro desconhecido");
  }
};
