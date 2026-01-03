// AI Helper Functions with Fallback and Retry Logic

// Model configuration - centralized
export const AI_MODELS = {
  primary: "google/gemini-3-pro-preview",
  fallback: "google/gemini-2.5-flash",
  lite: "google/gemini-2.5-flash-lite"
} as const;

export const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface AICallOptions {
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  timeout?: number;
}

interface AICallResult {
  response: Response | null;
  model: string;
  error?: string;
  retryCount: number;
  fallbackUsed: boolean;
}

// Retry with exponential backoff for rate limits
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<{ response: Response | null; error?: string; retryCount: number }> {
  let lastError: string | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.warn(`⚠️ Rate limited (429), waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      
      if (response.status === 402) {
        // Credits exhausted - don't retry
        console.error("❌ Credits exhausted (402)");
        return { 
          response: null, 
          error: "credits_exhausted",
          retryCount: i
        };
      }
      
      return { response, retryCount: i };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      console.error(`Network error on attempt ${i + 1}:`, lastError);
      
      if (i < maxRetries - 1) {
        const waitTime = Math.pow(2, i) * 500;
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }
  
  return { 
    response: null, 
    error: lastError || "Max retries exceeded",
    retryCount: maxRetries
  };
}

// Call AI with automatic fallback to other models
export async function callAIWithFallback(
  messages: { role: string; content: any }[],
  lovableApiKey: string,
  options: AICallOptions = {}
): Promise<AICallResult> {
  const {
    maxTokens = 1500,
    temperature = 0.7,
    maxRetries = 3,
    timeout = 30000
  } = options;
  
  const models = [AI_MODELS.primary, AI_MODELS.fallback, AI_MODELS.lite];
  let totalRetries = 0;
  let fallbackUsed = false;
  
  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex];
    
    if (modelIndex > 0) {
      fallbackUsed = true;
      console.log(`🔄 Trying fallback model: ${model}`);
    } else {
      console.log(`🧠 Calling primary model: ${model}`);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const { response, error, retryCount } = await fetchWithRetry(
        AI_GATEWAY_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
          }),
          signal: controller.signal
        },
        maxRetries
      );
      
      clearTimeout(timeoutId);
      totalRetries += retryCount;
      
      if (error === "credits_exhausted") {
        // Don't try other models if credits are exhausted
        return {
          response: null,
          model,
          error: "credits_exhausted",
          retryCount: totalRetries,
          fallbackUsed
        };
      }
      
      if (response && response.ok) {
        console.log(`✅ Success with model: ${model}`);
        return {
          response,
          model,
          retryCount: totalRetries,
          fallbackUsed
        };
      }
      
      // If response exists but not ok, log and try next model
      if (response) {
        const errorText = await response.text();
        console.warn(`⚠️ Model ${model} returned ${response.status}: ${errorText.substring(0, 100)}`);
      }
      
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn(`⏱️ Timeout for model ${model}`);
      } else {
        console.error(`❌ Error with model ${model}:`, err);
      }
    }
  }
  
  // All models failed
  return {
    response: null,
    model: models[models.length - 1],
    error: "all_models_failed",
    retryCount: totalRetries,
    fallbackUsed: true
  };
}

// Generate a graceful error message for the user
export function getGracefulErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "credits_exhausted":
      return "No momento estou com dificuldades técnicas. Por favor, tente novamente em alguns minutos ou fale com um atendente humano.";
    case "all_models_failed":
      return "Desculpe, estou temporariamente indisponível. Por favor, tente novamente em instantes.";
    case "timeout":
      return "Demorei muito para processar. Pode repetir sua mensagem?";
    default:
      return "Desculpe, não consegui processar sua mensagem. Tente novamente.";
  }
}

// Summarize conversation history for long contexts
export async function summarizeHistory(
  oldMessages: { role: string; content: string }[],
  lovableApiKey: string
): Promise<string> {
  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODELS.lite, // Use lite model for summarization
        messages: [
          { 
            role: "system", 
            content: "Resuma esta conversa em 3-5 pontos principais em português brasileiro. Foque em: produtos mencionados, preferências do cliente, decisões tomadas, informações coletadas." 
          },
          { 
            role: "user", 
            content: oldMessages.map(m => `${m.role === 'user' ? 'Cliente' : 'Atendente'}: ${m.content}`).join("\n") 
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    }
  } catch (err) {
    console.error("Error summarizing history:", err);
  }
  
  return "";
}
