import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== CENTRALIZED AI CONFIGURATION ==========
const AI_MODELS = {
  primary: "google/gemini-3-pro-preview",
  fallback: "google/gemini-2.5-flash",
  lite: "google/gemini-2.5-flash-lite"
} as const;

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Debounce time will be loaded from config (default 3 seconds)
let DEBOUNCE_MS = 3000;
// Maximum messages to keep in context (increased from 50 to 100)
const MAX_CONTEXT_MESSAGES = 100;
// Threshold for when to summarize older messages
const SUMMARIZE_THRESHOLD = 80;

// ========== IN-MEMORY CACHE ==========
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const configCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = configCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    configCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  configCache.set(key, { data, timestamp: Date.now() });
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface IAConfig {
  section: string;
  config: Record<string, unknown>;
}

interface Product {
  id: string;
  nome: string;
  descricao: string;
  preco_base: number;
  categoria: string;
  imagem_url: string | null;
  video_url: string | null;
  videos: Array<{nome: string; url: string}> | null;
  quando_oferecer: string | null;
  diferenciais: string[] | null;
  ativo: boolean;
}

interface Knowledge {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  ativo: boolean;
}

interface ClientMemory {
  id: string;
  phone_number: string;
  instance_name: string;
  client_name: string | null;
  preferences: unknown[];
  notes: string | null;
  interaction_count: number;
}

// ========== AI CALL WITH FALLBACK AND RETRY ==========
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
        const waitTime = Math.pow(2, i) * 1000;
        console.warn(`⚠️ Rate limited (429), waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      
      if (response.status === 402) {
        console.error("❌ Credits exhausted (402)");
        return { response: null, error: "credits_exhausted", retryCount: i };
      }
      
      return { response, retryCount: i };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      console.error(`Network error on attempt ${i + 1}:`, lastError);
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 500));
      }
    }
  }
  
  return { response: null, error: lastError || "Max retries exceeded", retryCount: maxRetries };
}

async function callAIWithFallback(
  messages: { role: string; content: any }[],
  lovableApiKey: string,
  options: { maxTokens?: number; temperature?: number; timeout?: number } = {}
): Promise<{ response: Response | null; model: string; error?: string; fallbackUsed: boolean }> {
  const { maxTokens = 1500, temperature = 0.7, timeout = 30000 } = options;
  const models = [AI_MODELS.primary, AI_MODELS.fallback, AI_MODELS.lite];
  let fallbackUsed = false;
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (i > 0) {
      fallbackUsed = true;
      console.log(`🔄 Trying fallback model: ${model}`);
    } else {
      console.log(`🧠 Calling primary model: ${model}`);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const { response, error } = await fetchWithRetry(
        AI_GATEWAY_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
          signal: controller.signal
        },
        3
      );
      
      clearTimeout(timeoutId);
      
      if (error === "credits_exhausted") {
        return { response: null, model, error: "credits_exhausted", fallbackUsed };
      }
      
      if (response && response.ok) {
        console.log(`✅ Success with model: ${model}`);
        return { response, model, fallbackUsed };
      }
      
      if (response) {
        const errorText = await response.text();
        console.warn(`⚠️ Model ${model} returned ${response.status}: ${errorText.substring(0, 100)}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(`❌ Error with model ${model}:`, err);
    }
  }
  
  return { response: null, model: models[models.length - 1], error: "all_models_failed", fallbackUsed: true };
}

function getGracefulErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "credits_exhausted":
      return "No momento estou com dificuldades técnicas. Por favor, tente novamente em alguns minutos ou fale com um atendente humano.";
    case "all_models_failed":
      return "Desculpe, estou temporariamente indisponível. Por favor, tente novamente em instantes.";
    default:
      return "Desculpe, não consegui processar sua mensagem. Tente novamente.";
  }
}

// ========== HISTORY SUMMARIZATION ==========
async function summarizeOldHistory(
  oldMessages: Message[],
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
        model: AI_MODELS.lite,
        messages: [
          { role: "system", content: "Resuma esta conversa em 3-5 pontos principais em português brasileiro. Foque em: produtos mencionados, preferências do cliente, decisões tomadas." },
          { role: "user", content: oldMessages.map(m => `${m.role === 'user' ? 'Cliente' : 'Atendente'}: ${m.content}`).join("\n") }
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
  const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");

  // Validar variáveis de ambiente críticas
  if (!evolutionApiUrl || !evolutionApiKey) {
    console.error("❌ Evolution API credentials not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Evolution API not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { payload, instanceName } = await req.json();
    
    console.log(`🤖 Processing IA message for instance: ${instanceName}`);
    console.log(`📦 Payload event: ${payload?.event}`);

    // Extract message data from Evolution API payload
    const messageData = payload?.data;
    if (!messageData) {
      console.log("⚠️ No message data in payload");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process incoming messages (not sent by us)
    const key = messageData.key;
    if (key?.fromMe) {
      console.log("⏭️ Skipping message sent by us");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender phone number
    const remoteJid = key?.remoteJid || "";
    if (!remoteJid || remoteJid.includes("@g.us")) {
      console.log("⏭️ Skipping group message or invalid jid");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneNumber = remoteJid.replace("@s.whatsapp.net", "");
    const pushName = messageData.pushName || "";
    console.log(`📱 From: ${phoneNumber} (${pushName})`);

    // Extract message content
    const message = messageData.message;
    let userMessage = "";
    let mediaType = "text";
    let mediaUrl: string | null = null;

    if (message?.conversation) {
      userMessage = message.conversation;
    } else if (message?.extendedTextMessage?.text) {
      userMessage = message.extendedTextMessage.text;
    } else if (message?.audioMessage) {
      mediaType = "audio";
      const audioUrl = messageData.media?.url || message.audioMessage?.url;
      const audioBase64 = messageData.media?.base64;
      const mimetype = message.audioMessage?.mimetype || "audio/ogg";
      
      console.log(`🎙️ Audio message received - URL: ${audioUrl ? 'yes' : 'no'}, Base64: ${audioBase64 ? 'yes' : 'no'}`);
      
      if (audioUrl || audioBase64) {
        try {
          const transcribeResponse = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio-gemini`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              audio: audioUrl || audioBase64,
              mimeType: mimetype,
            }),
          });
          
          if (transcribeResponse.ok) {
            const transcribeResult = await transcribeResponse.json();
            userMessage = transcribeResult.text || "[Áudio não transcrito]";
            console.log(`🎙️ Transcribed audio: ${userMessage.substring(0, 100)}...`);
          } else {
            const errorText = await transcribeResponse.text();
            console.error(`🎙️ Transcription failed (${transcribeResponse.status}): ${errorText}`);
            userMessage = "[Mensagem de áudio - não foi possível transcrever]";
          }
        } catch (e) {
          console.error("🎙️ Error transcribing audio:", e);
          userMessage = "[Mensagem de áudio - erro na transcrição]";
        }
      } else {
        console.warn("🎙️ Audio message without URL or base64 data");
        userMessage = "[Áudio recebido - dados não disponíveis]";
      }
    } else if (message?.imageMessage) {
      mediaType = "image";
      mediaUrl = messageData.media?.url || null;
      const imageBase64 = messageData.media?.base64 || null;
      const imageCaption = message.imageMessage.caption || "";
      
      console.log(`🖼️ Image message received - URL: ${mediaUrl ? 'yes' : 'no'}, Base64: ${imageBase64 ? 'yes' : 'no'}`);
      
      // Analyze image using Gemini multimodal if we have image data
      if (imageBase64 || mediaUrl) {
        try {
          console.log("🖼️ Analyzing image with Gemini Vision...");
          
          // Build image content for Gemini
          let imageContent: any;
          if (imageBase64) {
            // Use base64 directly
            imageContent = {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            };
          } else if (mediaUrl) {
            // Use URL directly - Gemini can fetch it
            imageContent = {
              type: "image_url",
              image_url: {
                url: mediaUrl
              }
            };
          }
          
          // Enhanced OCR + Description prompt
          const imageAnalysisPrompt = `Analise esta imagem enviada por um cliente em contexto de atendimento comercial.

INSTRUÇÕES:
1. Se houver TEXTO na imagem (prints, documentos, notas):
   - Transcreva TODO o texto visível de forma exata
   - Mantenha formatação (quebras de linha, listas)

2. Se for uma FOTO de produto/ambiente:
   - Descreva detalhadamente o que vê
   - Identifique produtos, marcas, cores, materiais
   - Mencione estado/condição se relevante

3. Se for um DOCUMENTO (nota fiscal, orçamento, contrato):
   - Extraia valores, datas, nomes
   - Identifique tipo do documento
   - Destaque informações principais

4. Se for um SCREENSHOT de conversa:
   - Transcreva as mensagens
   - Identifique contexto

Responda em português brasileiro de forma clara e organizada.`;

          const imageAnalysisResponse = await fetch(AI_GATEWAY_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: AI_MODELS.primary,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: imageAnalysisPrompt
                    },
                    imageContent
                  ]
                }
              ],
              max_tokens: 800,
            }),
          });
          
          if (imageAnalysisResponse.ok) {
            const analysisData = await imageAnalysisResponse.json();
            const imageDescription = analysisData.choices?.[0]?.message?.content;
            
            if (imageDescription) {
              userMessage = `[O cliente enviou uma imagem]\n\n📷 Descrição da imagem: ${imageDescription}${imageCaption ? `\n\n💬 Legenda do cliente: ${imageCaption}` : ""}`;
              console.log(`🖼️ Image analyzed successfully: ${imageDescription.substring(0, 100)}...`);
            } else {
              userMessage = imageCaption || "[Imagem enviada - descrição não disponível]";
            }
          } else {
            const errorText = await imageAnalysisResponse.text();
            console.error(`🖼️ Image analysis failed (${imageAnalysisResponse.status}): ${errorText}`);
            userMessage = imageCaption || "[Imagem enviada - não foi possível analisar]";
          }
        } catch (e) {
          console.error("🖼️ Error analyzing image:", e);
          userMessage = imageCaption || "[Imagem enviada - erro na análise]";
        }
      } else {
        console.warn("🖼️ Image message without URL or base64 data");
        userMessage = imageCaption || "[Imagem recebida - dados não disponíveis]";
      }
    } else {
      console.log("⏭️ Unsupported message type");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`💬 Message: ${userMessage.substring(0, 100)}...`);

    // ========== DEBOUNCE SYSTEM WITH ATOMIC LOCK ==========
    // Registrar timestamp de início para cálculo de delay total
    const processingStartTime = Date.now();
    
    // PASSO 1: Salvar mensagem como pendente PRIMEIRO (antes de qualquer verificação)
    const { data: insertedMessage, error: insertError } = await supabase
      .from("ia_pending_messages")
      .insert({
        phone_number: phoneNumber,
        instance_name: instanceName,
        content: userMessage,
        processed: false,
        is_processing: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error inserting pending message:", insertError);
    } else {
      console.log(`📥 Mensagem salva como pendente: ${insertedMessage?.id}`);
    }

    // PASSO 2: AGUARDAR o período de debounce ANTES de tentar processar
    // Este é o delay OBRIGATÓRIO de 5 segundos antes de responder
    console.log(`⏳ AGUARDANDO ${DEBOUNCE_MS}ms OBRIGATÓRIO antes de processar...`);
    await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS));

    // PASSO 3: Tentar adquirir lock atômico de processamento
    // Apenas UMA instância conseguirá obter o lock
    const { data: lockAcquired, error: lockError } = await supabase
      .from("ia_pending_messages")
      .update({ is_processing: true })
      .eq("phone_number", phoneNumber)
      .eq("instance_name", instanceName)
      .eq("processed", false)
      .eq("is_processing", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .select()
      .single();

    if (lockError || !lockAcquired) {
      console.log(`🔒 Outra instância está processando ou sem mensagens pendentes. Saindo graciosamente.`);
      return new Response(JSON.stringify({ success: true, skipped: "another_instance_processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🔓 Lock adquirido! Somos o processador. Lock ID: ${lockAcquired.id}`);

    // PASSO 4: Buscar TODAS as mensagens pendentes deste cliente
    const { data: allPendingMessages } = await supabase
      .from("ia_pending_messages")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("instance_name", instanceName)
      .eq("processed", false)
      .order("created_at", { ascending: true });

    // PASSO 5: Marcar todas como processadas atomicamente
    if (allPendingMessages && allPendingMessages.length > 0) {
      const ids = allPendingMessages.map(m => m.id);
      await supabase
        .from("ia_pending_messages")
        .update({ processed: true, is_processing: false })
        .in("id", ids);
      console.log(`✅ ${ids.length} mensagens marcadas como processadas`);
    }

    // PASSO 6: Consolidar mensagens
    const consolidatedMessages = allPendingMessages?.map(m => m.content) || [userMessage];
    const combinedMessage = consolidatedMessages.length > 1 
      ? `[O cliente enviou ${consolidatedMessages.length} mensagens seguidas]\n\n${consolidatedMessages.join("\n\n")}`
      : consolidatedMessages[0];

    console.log(`📨 Processando ${consolidatedMessages.length} mensagem(ns) consolidada(s)`);

    // ========== CLIENT MEMORY ==========
    // Load or create client memory
    let clientMemory: ClientMemory | null = null;
    
    const { data: existingMemory } = await supabase
      .from("ia_client_memory")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("instance_name", instanceName)
      .single();

    // Determine the best name: pushName has priority for new names
    const determineBestName = (existingName: string | null, newPushName: string): string | null => {
      // If we have a real pushName from WhatsApp, use it
      if (newPushName && newPushName.trim().length > 0) {
        // If existing name is generic (starts with "Cliente") or empty, prefer pushName
        if (!existingName || existingName.startsWith('Cliente ')) {
          return newPushName.trim();
        }
      }
      return existingName;
    };

    if (existingMemory) {
      clientMemory = existingMemory as ClientMemory;
      const bestName = determineBestName(clientMemory.client_name, pushName);
      
      // Update interaction count and name if we have a better one
      await supabase
        .from("ia_client_memory")
        .update({ 
          interaction_count: (clientMemory.interaction_count || 0) + 1,
          last_interaction: new Date().toISOString(),
          client_name: bestName,
        })
        .eq("id", clientMemory.id);
      
      // Update the local reference
      clientMemory.client_name = bestName;
      
      console.log(`📝 Client memory updated: name="${bestName}", interactions=${(clientMemory.interaction_count || 0) + 1}`);
    } else {
      // Create new memory with pushName
      const initialName = pushName?.trim() || null;
      const { data: newMemory } = await supabase
        .from("ia_client_memory")
        .insert({
          phone_number: phoneNumber,
          instance_name: instanceName,
          client_name: initialName,
          interaction_count: 1,
        })
        .select()
        .single();
      
      clientMemory = newMemory as ClientMemory;
      console.log(`📝 New client memory created: name="${initialName}"`);
    }

    // ========== LOAD CONFIGURATIONS (with cache) ==========
    const configCacheKey = `ia_configs_${instanceName}`;
    let configs: Record<string, Record<string, unknown>> = getCached<Record<string, Record<string, unknown>>>(configCacheKey) || {};
    
    if (Object.keys(configs).length === 0) {
      console.log("📦 Loading configs from database (cache miss)");
      const { data: configsData } = await supabase
        .from("tendenci_ia_config")
        .select("section, config");

      (configsData as IAConfig[] || []).forEach((c) => {
        configs[c.section] = c.config || {};
      });
      setCache(configCacheKey, configs);
    } else {
      console.log("📦 Using cached configs");
    }

    // Load products (with cache)
    const productsCacheKey = `ia_products_${instanceName}`;
    let products: Product[] = getCached<Product[]>(productsCacheKey) || [];
    
    if (products.length === 0) {
      const { data: productsData } = await supabase
        .from("tendenci_ia_produtos")
        .select("id, nome, descricao, preco_base, categoria, imagem_url, video_url, videos, quando_oferecer, diferenciais, ativo")
        .eq("ativo", true);

      products = (productsData as Product[]) || [];
      setCache(productsCacheKey, products);
      console.log(`📦 Loaded ${products.length} products from database`);
    } else {
      console.log(`📦 Using ${products.length} cached products`);
    }

    // Load knowledge base (with cache)
    const knowledgeCacheKey = `ia_knowledge_${instanceName}`;
    let knowledge: Knowledge[] = getCached<Knowledge[]>(knowledgeCacheKey) || [];
    
    if (knowledge.length === 0) {
      const { data: knowledgeData } = await supabase
        .from("tendenci_ia_conhecimento")
        .select("*")
        .eq("ativo", true);

      knowledge = (knowledgeData as Knowledge[]) || [];
      setCache(knowledgeCacheKey, knowledge);
    }

    // ========== CONVERSATION HISTORY (100 messages with smart summarization) ==========
    const { data: historyData } = await supabase
      .from("ia_conversations")
      .select("role, content, created_at")
      .eq("phone_number", phoneNumber)
      .eq("instance_name", instanceName)
      .order("created_at", { ascending: false })
      .limit(MAX_CONTEXT_MESSAGES);

    let conversationHistory: Message[] = (historyData || [])
      .reverse()
      .map((h) => ({ role: h.role as "user" | "assistant", content: h.content }));

    // If history is large, summarize older messages
    let historySummary: string | null = null;
    if (conversationHistory.length > SUMMARIZE_THRESHOLD) {
      console.log(`📚 History large (${conversationHistory.length}), summarizing older messages...`);
      const oldMessages = conversationHistory.slice(0, conversationHistory.length - 30);
      conversationHistory = conversationHistory.slice(-30);
      
      historySummary = await summarizeOldHistory(oldMessages, lovableApiKey!);
      if (historySummary) {
        console.log(`📚 Summary created: ${historySummary.substring(0, 100)}...`);
      }
    }

    console.log(`📚 Using ${conversationHistory.length} messages of context${historySummary ? ' + summary' : ''}`);

    // Build master prompt
    const masterPrompt = buildMasterPrompt(configs, products, knowledge, clientMemory, conversationHistory);

    // Build messages array for AI
    const messages: Message[] = [
      { role: "system", content: masterPrompt },
    ];
    
    // Add history summary if available
    if (historySummary) {
      messages.push({ role: "system", content: `[RESUMO DA CONVERSA ANTERIOR]\n${historySummary}` });
    }
    
    messages.push(...conversationHistory);
    messages.push({ role: "user", content: combinedMessage });

    // Call Lovable AI with fallback
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Calculate maxTokens based on character limit (1 token ≈ 3-4 chars in Portuguese)
    const comunicacaoConfig = configs.comunicacao || {};
    const limiteCaracteresConfig = Number(comunicacaoConfig.limite_caracteres) || 0;
    const temLimite = limiteCaracteresConfig > 0;
    const maxTokens = temLimite ? Math.ceil(limiteCaracteresConfig / 3) + 100 : 1500; // +100 buffer for safety
    
    console.log(`🧠 Calling Lovable AI with fallback support... (maxTokens: ${maxTokens}, limite: ${limiteCaracteresConfig})`);

    const startTime = Date.now();
    const { response: aiResponse, model: usedModel, error: aiError, fallbackUsed } = await callAIWithFallback(
      messages,
      lovableApiKey,
      { maxTokens, temperature: 0.7 }
    );
    const aiDuration = Date.now() - startTime;
    console.log(`⏱️ AI responded in ${aiDuration}ms using ${usedModel}${fallbackUsed ? ' (fallback)' : ''}`);

    if (!aiResponse || aiError) {
      console.error("AI call failed:", aiError);
      const gracefulMessage = getGracefulErrorMessage(aiError || "unknown");
      
      // Send graceful error message to user
      await processAndSendResponse(
        evolutionApiUrl!,
        evolutionApiKey!,
        instanceName,
        phoneNumber,
        gracefulMessage
      );
      
      return new Response(JSON.stringify({ success: true, fallback: true, error: aiError }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded - try again later");
      }
      if (aiResponse.status === 402) {
        throw new Error("Insufficient credits - add funds to workspace");
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let assistantMessage = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";
    
    console.log(`🤖 AI Response (${assistantMessage.length} chars): ${assistantMessage.substring(0, 100)}...`);

    // ========== FORCE CHARACTER LIMIT ==========
    const limiteCaracteres = limiteCaracteresConfig; // Use the pre-calculated value
    if (limiteCaracteres > 0 && assistantMessage.length > limiteCaracteres) {
      console.log(`⚠️ Resposta excede limite (${assistantMessage.length}/${limiteCaracteres}). Truncando...`);
      
      // Cortar no último espaço antes do limite para não cortar palavras
      const textoTruncado = assistantMessage.substring(0, limiteCaracteres - 3); // -3 para o "..."
      const ultimoEspaco = textoTruncado.lastIndexOf(' ');
      
      if (ultimoEspaco > limiteCaracteres * 0.7) {
        assistantMessage = textoTruncado.substring(0, ultimoEspaco) + "...";
      } else {
        assistantMessage = textoTruncado + "...";
      }
      
      console.log(`✅ Resposta truncada para ${assistantMessage.length} caracteres`);
    }

    // ========== CHECK FOR REPETITION ==========
    const lastAssistantMessages = conversationHistory
      .filter(m => m.role === "assistant")
      .slice(-5)
      .map(m => m.content);

    if (isResponseTooSimilar(assistantMessage, lastAssistantMessages)) {
      console.log("⚠️ Response too similar to previous, asking for reformulation...");
      
      const reformulateResponse = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODELS.fallback, // Use fallback for reformulation (faster)
          messages: [
            ...messages,
            { role: "assistant", content: assistantMessage },
            { role: "user", content: "SISTEMA: Sua resposta está muito similar a mensagens anteriores. Reformule de forma diferente, mais natural e variada, mantendo a mesma informação essencial. Use palavras diferentes, estrutura diferente." }
          ],
          max_tokens: 1500,
          temperature: 0.9,
        }),
      });

      if (reformulateResponse.ok) {
        const reformulateData = await reformulateResponse.json();
        const newMessage = reformulateData.choices?.[0]?.message?.content;
        if (newMessage) {
          assistantMessage = newMessage;
          console.log("✅ Response reformulated successfully");
          
          // Re-apply character limit after reformulation
          if (limiteCaracteres > 0 && assistantMessage.length > limiteCaracteres) {
            const textoTruncado = assistantMessage.substring(0, limiteCaracteres - 3);
            const ultimoEspaco = textoTruncado.lastIndexOf(' ');
            if (ultimoEspaco > limiteCaracteres * 0.7) {
              assistantMessage = textoTruncado.substring(0, ultimoEspaco) + "...";
            } else {
              assistantMessage = textoTruncado + "...";
            }
          }
        }
      }
    }

    // ========== DELAY GARANTIDO ANTES DE ENVIAR ==========
    // Calcular quanto tempo já passou desde o início do processamento
    const tempoDecorrido = Date.now() - processingStartTime;
    
    // Use configured delay from comunicacao settings - SEM MÍNIMO FORÇADO
    const configuredDelay = Number(comunicacaoConfig?.tempo_resposta_ms) || 3000;
    
    // Calculate typing time based on message length (~60ms per char for slower typing, max 12s)
    const calculatedTypingTime = Math.min(assistantMessage.length * 60, 12000);
    
    // Delay total desejado = máximo entre delay configurado e tempo de digitação
    const delayTotalDesejado = Math.max(configuredDelay, calculatedTypingTime);
    
    // Calcular delay restante
    const delayRestante = Math.max(0, delayTotalDesejado - tempoDecorrido);

    console.log(`⏱️ DELAY CONFIG: ${configuredDelay}ms | TYPING: ${calculatedTypingTime}ms | DESEJADO: ${delayTotalDesejado}ms | DECORRIDO: ${tempoDecorrido}ms | RESTANTE: ${delayRestante}ms`);
    
    // Enviar indicador de digitação ANTES do delay
    try {
      await fetch(`${evolutionApiUrl}/chat/presence/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: evolutionApiKey,
        },
        body: JSON.stringify({
          number: phoneNumber.replace(/\D/g, ""),
          presence: "composing",
        }),
      });
    } catch (e) {
      console.log("Could not send typing indicator:", e);
    }

    // Aguardar delay restante para completar o tempo mínimo
    if (delayRestante > 0) {
      console.log(`⏳ Aguardando ${delayRestante}ms adicionais...`);
      await new Promise(resolve => setTimeout(resolve, delayRestante));
    }

    // Process media markers and send response
    await processAndSendResponse(
      evolutionApiUrl!,
      evolutionApiKey!,
      instanceName,
      phoneNumber,
      assistantMessage
    );

    // Save conversation to history
    await supabase.from("ia_conversations").insert([
      {
        phone_number: phoneNumber,
        instance_name: instanceName,
        role: "user",
        content: combinedMessage,
        media_type: mediaType,
        media_url: mediaUrl,
        metadata: { pushName: messageData.pushName, messagesConsolidated: consolidatedMessages.length },
      },
      {
        phone_number: phoneNumber,
        instance_name: instanceName,
        role: "assistant",
        content: assistantMessage,
        media_type: "text",
      },
    ]);

    // Try to extract client name if mentioned
    await extractAndSaveClientInfo(supabase, phoneNumber, instanceName, combinedMessage, clientMemory);

    // ========== CRM INTEGRATION - AUTO CREATE/UPDATE LEAD ==========
    try {
      const updatedHistory: Message[] = [
        ...conversationHistory,
        { role: "user", content: combinedMessage },
        { role: "assistant", content: assistantMessage },
      ];

      console.log(`📋 CRM Check: Starting integration for phone ${phoneNumber.slice(-4)}`);
      console.log(`📋 CRM Check: History has ${updatedHistory.length} messages (${updatedHistory.filter(m => m.role === 'assistant').length} from AI)`);
      console.log(`📋 CRM Check: Last AI response: ${assistantMessage.slice(0, 80)}...`);

      const { shouldCreate, temperature } = shouldCreateLead(updatedHistory, combinedMessage);
      
      console.log(`📋 CRM Check: shouldCreate=${shouldCreate}, temperature=${temperature}`);
      
      if (shouldCreate) {
        console.log(`📋 Creating/updating CRM lead with temperature: ${temperature}`);
        
        // Extract product information from conversation
        const productInfo = extractProductInfo(updatedHistory, products);
        
        await createOrUpdateDealFromIA(
          supabase,
          phoneNumber,
          clientMemory?.client_name || pushName || null,
          updatedHistory,
          temperature,
          productInfo
        );
      } else {
        // Even if we don't create a new lead, update existing deal's history
        console.log(`📋 Updating existing deal history only`);
        await updateExistingDealHistory(supabase, phoneNumber, updatedHistory);
      }
      
      console.log(`📋 CRM: Integration completed successfully`);
    } catch (crmError) {
      console.error(`❌ CRM Integration Error:`, crmError);
      // Log error but don't fail the response
      await supabase.from("system_errors").insert({
        title: "Erro na integração CRM",
        description: crmError instanceof Error ? crmError.message : "Unknown CRM error",
        module: "ia_atendimento",
        severity: "medium",
        source: "edge_function",
        metadata: { function: "process-ia-message", section: "crm_integration", phone: phoneNumber.slice(-4) },
      });
    }

    console.log("✅ Message processed successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error processing IA message:", error);

    // Log error to system
    await supabase.from("system_errors").insert({
      title: "Erro no processamento IA",
      description: error instanceof Error ? error.message : "Unknown error",
      module: "ia_atendimento",
      severity: "high",
      source: "edge_function",
      metadata: { function: "process-ia-message" },
    });

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Check if response is too similar to previous messages
function isResponseTooSimilar(newMessage: string, previousMessages: string[]): boolean {
  if (previousMessages.length === 0) return false;

  const normalize = (text: string) => 
    text.toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const newNormalized = normalize(newMessage);
  
  for (const prev of previousMessages) {
    const prevNormalized = normalize(prev);
    
    // Check for high similarity (>70% of words match)
    const newWords = new Set(newNormalized.split(" "));
    const prevWords = new Set(prevNormalized.split(" "));
    
    let matchCount = 0;
    for (const word of newWords) {
      if (prevWords.has(word)) matchCount++;
    }
    
    const similarity = matchCount / Math.max(newWords.size, prevWords.size);
    if (similarity > 0.7) {
      console.log(`⚠️ Similarity ${(similarity * 100).toFixed(1)}% with previous message`);
      return true;
    }
  }
  
  return false;
}

// Extract client info from message and update all related records
async function extractAndSaveClientInfo(
  supabase: any,
  phoneNumber: string,
  instanceName: string,
  message: string,
  currentMemory: ClientMemory | null
): Promise<void> {
  // Only try to extract if we don't have a real name yet (not generic)
  const hasRealName = currentMemory?.client_name && !currentMemory.client_name.startsWith('Cliente ');
  if (hasRealName) return;

  // Expanded patterns to extract names from various contexts
  const namePatterns = [
    // Self-introduction patterns
    /(?:meu nome é|me chamo|sou o|sou a|aqui é o|aqui é a|eu sou|pode me chamar de)\s+([A-ZÀ-Úa-zà-ú][a-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú][a-zà-ú]+)?)/i,
    /^([A-ZÀ-Ú][a-zà-ú]+)\s+(?:aqui|falando|do\s+whatsapp)/i,
    // Simple "sou X" at start of message
    /^(?:oi|olá|ola|bom\s+dia|boa\s+tarde|boa\s+noite)?\s*,?\s*(?:sou|aqui\s+é)\s+(?:o\s+|a\s+)?([A-ZÀ-Úa-zà-ú][a-zà-ú]+)/i,
    // Response to "qual seu nome" type questions
    /^([A-ZÀ-Úa-zà-ú][a-zà-ú]+)(?:\s+[A-ZÀ-Úa-zà-ú][a-zà-ú]+)?$/i,
    // "Olá [Nome] aqui"
    /^(?:oi|olá|ola),?\s+([A-ZÀ-Úa-zà-ú][a-zà-ú]+)\s+aqui/i,
  ];

  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const extractedName = match[1].trim();
      
      // Skip if it's too short or looks like a common word
      const commonWords = ['oi', 'ola', 'olá', 'bom', 'boa', 'tudo', 'bem', 'dia', 'tarde', 'noite', 'sim', 'nao', 'não', 'quero', 'preciso', 'tenho'];
      if (extractedName.length < 3 || commonWords.includes(extractedName.toLowerCase())) {
        continue;
      }
      
      // Capitalize first letter
      const formattedName = extractedName.charAt(0).toUpperCase() + extractedName.slice(1).toLowerCase();
      
      console.log(`📝 Extracted client name from message: ${formattedName}`);
      
      // Update client memory
      await supabase
        .from("ia_client_memory")
        .update({ client_name: formattedName })
        .eq("phone_number", phoneNumber)
        .eq("instance_name", instanceName);
      
      // Also update the clients table if exists
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id, name')
        .or(`phone.eq.${formattedPhone},phone.ilike.%${formattedPhone.slice(-8)}%`)
        .maybeSingle();
      
      if (existingClient && existingClient.name?.startsWith('Cliente ')) {
        await supabase
          .from('clients')
          .update({ name: formattedName })
          .eq('id', existingClient.id);
        console.log(`📝 Updated client table name: ${formattedName}`);
        
        // Also update the lead and deal title
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('client_id', existingClient.id)
          .maybeSingle();
        
        if (lead) {
          // Note: leads table doesn't have name field - name is stored in clients table
          
          // Update deal title
          const { data: deal } = await supabase
            .from('crm_deals')
            .select('id, title')
            .eq('lead_id', lead.id)
            .eq('from_ai', true)
            .maybeSingle();
          
          if (deal && deal.title?.includes('Cliente ')) {
            const newTitle = deal.title.replace(/Cliente\s+\d+/, formattedName);
            await supabase
              .from('crm_deals')
              .update({ title: `Lead IA - ${formattedName}` })
              .eq('id', deal.id);
            console.log(`📝 Updated deal title: Lead IA - ${formattedName}`);
          }
        }
      }
      
      break;
    }
  }
}

// ========== CRM INTEGRATION FUNCTIONS ==========

// Extract product information from conversation
interface ProductInfo {
  tipoProduto: string | null;
  categoria: string | null;
  centroCusto: string | null;
  observacoes: string;
}

function extractProductInfo(history: Message[], products: Product[]): ProductInfo {
  // Combine all messages for analysis
  const allText = history.map(m => m.content).join(' ').toLowerCase();
  
  // Product type keywords mapping
  const tipoKeywords: Record<string, string[]> = {
    'Sofá': ['sofá', 'sofa', 'estofado', 'sofas', 'sofás'],
    'Poltrona': ['poltrona', 'poltronas', 'poltrona decorativa'],
    'Mesa': ['mesa', 'mesa de jantar', 'mesa de centro', 'mesa lateral', 'mesa de apoio', 'mesas'],
    'Cadeira': ['cadeira', 'cadeiras', 'cadeira de jantar'],
    'Banqueta': ['banqueta', 'banquetas', 'banco', 'bancos'],
    'Aparador': ['aparador', 'aparadores', 'buffet'],
    'Rack': ['rack', 'painel', 'painel de tv', 'home theater'],
    'Estante': ['estante', 'estantes', 'prateleira'],
    'Cama': ['cama', 'cabeceira', 'base de cama'],
    'Criado-mudo': ['criado', 'criado-mudo', 'mesa de cabeceira'],
    'Chaise': ['chaise', 'divã', 'recamier'],
    'Pufe': ['pufe', 'puff', 'pufes'],
    'Cômoda': ['cômoda', 'comoda', 'gaveteiro'],
    'Armário': ['armário', 'armario', 'guarda-roupa', 'closet'],
    'Cozinha': ['cozinha', 'cozinha planejada', 'armário de cozinha'],
  };

  // Category keywords
  const categoriaKeywords: Record<string, string[]> = {
    'Planejados': ['planejado', 'planejada', 'sob medida', 'marcenaria', 'closet', 'armário embutido', 'cozinha planejada', 'móvel planejado'],
    'Móveis Soltos': ['sofá', 'sofa', 'mesa', 'poltrona', 'cadeira', 'banqueta', 'aparador', 'rack', 'estante', 'pufe', 'chaise'],
  };

  // Centro de custo keywords
  const centroKeywords: Record<string, string[]> = {
    'Náutico': ['barco', 'iate', 'lancha', 'náutico', 'nautico', 'marítimo', 'maritimo', 'embarcação', 'embarcacao', 'veleiro'],
    'Rústico': ['rústico', 'rustico', 'madeira maciça', 'fazenda', 'country', 'campo', 'chácara', 'chacara', 'sítio', 'sitio'],
    'Industrial': ['industrial', 'loft', 'metal', 'ferro', 'aço', 'aco', 'moderno industrial'],
    'Residencial': ['casa', 'apartamento', 'apto', 'residência', 'residencia', 'moradia', 'sala', 'quarto', 'varanda'],
  };

  // Detect product type
  let tipoProduto: string | null = null;
  for (const [tipo, keywords] of Object.entries(tipoKeywords)) {
    for (const keyword of keywords) {
      if (allText.includes(keyword)) {
        tipoProduto = tipo;
        break;
      }
    }
    if (tipoProduto) break;
  }

  // Try to match with registered products
  if (!tipoProduto && products.length > 0) {
    for (const product of products) {
      const productName = product.nome.toLowerCase();
      if (allText.includes(productName.split(' ')[0])) {
        tipoProduto = product.categoria || product.nome;
        break;
      }
    }
  }

  // Detect category
  let categoria: string | null = null;
  for (const [cat, keywords] of Object.entries(categoriaKeywords)) {
    for (const keyword of keywords) {
      if (allText.includes(keyword)) {
        categoria = cat;
        break;
      }
    }
    if (categoria) break;
  }

  // Detect centro de custo
  let centroCusto: string | null = null;
  for (const [centro, keywords] of Object.entries(centroKeywords)) {
    for (const keyword of keywords) {
      if (allText.includes(keyword)) {
        centroCusto = centro;
        break;
      }
    }
    if (centroCusto) break;
  }

  // Extract characteristics
  const observacoesParts: string[] = [];

  // Places/seats
  const lugaresMatch = allText.match(/(\d+)\s*(?:lugares?|pessoas?|assentos?)/i);
  if (lugaresMatch) {
    observacoesParts.push(`Lugares: ${lugaresMatch[1]}`);
  }

  // Dimensions/measurements
  const medidasPatterns = [
    /(\d+[,.]?\d*)\s*(?:metros?|m)\s*(?:x|por)\s*(\d+[,.]?\d*)\s*(?:metros?|m)?/gi,
    /(\d+[,.]?\d*)\s*(?:cm|centímetros?)\s*(?:x|por)\s*(\d+[,.]?\d*)\s*(?:cm)?/gi,
    /(?:largura|larg\.?)\s*(?:de\s*)?(\d+[,.]?\d*)\s*(?:m|cm|metros?)?/gi,
    /(?:comprimento|comp\.?)\s*(?:de\s*)?(\d+[,.]?\d*)\s*(?:m|cm|metros?)?/gi,
    /(?:altura|alt\.?)\s*(?:de\s*)?(\d+[,.]?\d*)\s*(?:m|cm|metros?)?/gi,
    /(\d+[,.]?\d*)\s*(?:metros?|m)\b/gi,
  ];

  const medidasEncontradas: string[] = [];
  for (const pattern of medidasPatterns) {
    const matches = allText.matchAll(pattern);
    for (const match of matches) {
      if (match[0] && !medidasEncontradas.includes(match[0])) {
        medidasEncontradas.push(match[0]);
      }
    }
  }
  if (medidasEncontradas.length > 0) {
    observacoesParts.push(`Medidas: ${medidasEncontradas.slice(0, 3).join(', ')}`);
  }

  // Materials
  const materiaisKeywords = [
    'couro', 'couro natural', 'couro sintético', 'courino',
    'tecido', 'linho', 'veludo', 'suede', 'chenille', 'sarja',
    'madeira', 'mdf', 'mdp', 'compensado', 'pinus', 'carvalho', 'freijó',
    'mármore', 'granito', 'vidro', 'espelho',
    'aço', 'ferro', 'metal', 'alumínio',
    'impermeável', 'impermeavel', 'lavável', 'lavavel',
  ];
  const materiaisEncontrados = materiaisKeywords.filter(m => allText.includes(m));
  if (materiaisEncontrados.length > 0) {
    observacoesParts.push(`Material: ${materiaisEncontrados.slice(0, 3).join(', ')}`);
  }

  // Colors
  const coresKeywords = [
    'branco', 'preto', 'cinza', 'bege', 'marrom', 'caramelo',
    'azul', 'verde', 'amarelo', 'vermelho', 'rosa', 'roxo',
    'terracota', 'mostarda', 'nude', 'off-white', 'creme',
    'natural', 'amadeirado', 'claro', 'escuro',
  ];
  const coresEncontradas = coresKeywords.filter(c => allText.includes(c));
  if (coresEncontradas.length > 0) {
    observacoesParts.push(`Cor: ${coresEncontradas.slice(0, 2).join(', ')}`);
  }

  // Environments
  const ambientesKeywords = [
    'sala', 'sala de estar', 'living', 'sala de jantar',
    'quarto', 'suíte', 'suite', 'dormitório', 'dormitorio',
    'cozinha', 'área gourmet', 'area gourmet', 'varanda', 'sacada', 'terraço', 'terraco',
    'escritório', 'escritorio', 'home office', 'lavabo', 'banheiro',
    'área externa', 'area externa', 'jardim', 'piscina',
  ];
  const ambientesEncontrados = ambientesKeywords.filter(a => allText.includes(a));
  if (ambientesEncontrados.length > 0) {
    observacoesParts.push(`Ambiente: ${ambientesEncontrados.slice(0, 2).join(', ')}`);
  }

  // Style preferences
  const estiloKeywords = [
    'moderno', 'contemporâneo', 'contemporaneo', 'minimalista',
    'clássico', 'classico', 'rústico', 'rustico', 'industrial',
    'escandinavo', 'boho', 'retrô', 'retro', 'vintage',
  ];
  const estilosEncontrados = estiloKeywords.filter(e => allText.includes(e));
  if (estilosEncontrados.length > 0) {
    observacoesParts.push(`Estilo: ${estilosEncontrados.join(', ')}`);
  }

  // Build observations string
  const observacoes = observacoesParts.length > 0 
    ? observacoesParts.join(' | ') 
    : '';

  console.log(`📦 Product extraction: tipo=${tipoProduto}, cat=${categoria}, centro=${centroCusto}, obs=${observacoes.substring(0, 50)}...`);

  return {
    tipoProduto,
    categoria,
    centroCusto,
    observacoes,
  };
}

// Detect if we should create a lead based on conversation
function shouldCreateLead(
  conversationHistory: Message[],
  userMessage: string
): { shouldCreate: boolean; temperature: string } {
  const combined = userMessage.toLowerCase();
  
  const keywords = {
    quente: ['orçamento', 'orcamento', 'comprar', 'preço', 'preco', 'agendar', 'visita', 'medidas', 'fechar', 'pagar', 'pagamento'],
    morno: ['interesse', 'interessado', 'informações', 'informacoes', 'catálogo', 'catalogo', 'ver mais', 'opções', 'opcoes', 'saber mais'],
  };
  
  // Check for hot keywords
  if (keywords.quente.some(k => combined.includes(k))) {
    return { shouldCreate: true, temperature: 'quente' };
  }
  
  // Check for warm keywords
  if (keywords.morno.some(k => combined.includes(k))) {
    return { shouldCreate: true, temperature: 'morno' };
  }
  
  // After 6 messages (3 exchanges), create cold lead
  if (conversationHistory.length >= 6) {
    return { shouldCreate: true, temperature: 'frio' };
  }
  
  return { shouldCreate: false, temperature: 'frio' };
}

// Format complete conversation history for CRM
function formatCompleteHistory(history: Message[]): string {
  console.log(`📋 Formatting history: ${history.length} messages (${history.filter(m => m.role === 'assistant').length} from AI)`);
  
  // Validate history has content
  if (history.length === 0) {
    console.log(`⚠️ Empty history passed to formatCompleteHistory`);
    return '[Histórico vazio]';
  }
  
  return history.map((m, idx) => {
    const sender = m.role === 'user' ? '👤 Cliente' : '🤖 IA';
    // Use a timestamp that reflects the order of messages
    const timestamp = new Date(Date.now() - (history.length - idx) * 60000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    // Ensure content is never empty
    const content = m.content?.trim() || '[mensagem vazia]';
    return `[${timestamp}] ${sender}:\n${content}`;
  }).join('\n\n---\n\n');
}

// Create or update CRM deal from IA conversation
async function createOrUpdateDealFromIA(
  supabase: any,
  phoneNumber: string,
  clientName: string | null,
  conversationHistory: Message[],
  temperature: string,
  productInfo: ProductInfo
): Promise<void> {
  try {
    // Use real name if available, otherwise use phone suffix
    const hasRealName = clientName && !clientName.startsWith('Cliente ');
    const displayName = hasRealName ? clientName : `Cliente ${phoneNumber.slice(-4)}`;
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    
    console.log(`📋 CRM: Creating/updating deal for ${displayName} (hasRealName=${hasRealName})`);
    
    // Search for existing client by phone - try multiple formats
    let clientId: string | null = null;
    const phoneSuffix8 = formattedPhone.slice(-8);
    const phoneSuffix9 = formattedPhone.slice(-9);
    
    console.log(`📋 Client search: phone=${formattedPhone}, suffix8=${phoneSuffix8}`);
    
    const { data: existingClient, error: clientSearchError } = await supabase
      .from('clients')
      .select('id, name, phone')
      .or(`phone.eq.${formattedPhone},phone.ilike.%${phoneSuffix8}%,phone.ilike.%${phoneSuffix9}%`)
      .limit(1)
      .maybeSingle();

    if (clientSearchError) {
      console.error('❌ Error searching client:', clientSearchError);
    }

    if (existingClient) {
      clientId = existingClient.id;
      console.log(`📋 Found existing client: ${existingClient.name} (phone: ${existingClient.phone})`);
      
      // Update name if we have a real name and existing is generic
      const hasRealClientName = clientName && !clientName.startsWith('Cliente ');
      const existingIsGeneric = existingClient.name?.startsWith('Cliente ');
      
      if (hasRealClientName && existingIsGeneric) {
        await supabase
          .from('clients')
          .update({ name: clientName })
          .eq('id', clientId);
        console.log(`📋 Updated client name from generic to: ${clientName}`);
      }
    } else {
      console.log(`📋 No client found, creating new one: ${displayName}`);
      
      // Create new client with upsert (handles race conditions)
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .upsert({ 
          name: displayName,
          phone: formattedPhone,
          notes: 'Cliente criado automaticamente via IA WhatsApp'
        }, { 
          onConflict: 'phone',
          ignoreDuplicates: false 
        })
        .select('id')
        .single();
      
      if (clientError) {
        console.error('❌ Error creating/upserting client:', clientError);
        
        // Try to find if it was created by another process
        const { data: retryClient } = await supabase
          .from('clients')
          .select('id')
          .or(`phone.eq.${formattedPhone},phone.ilike.%${phoneSuffix8}%`)
          .limit(1)
          .maybeSingle();
        
        if (retryClient) {
          clientId = retryClient.id;
          console.log(`📋 Found client on retry: ${clientId}`);
        } else {
          console.error('❌ Could not create or find client, aborting CRM integration');
          return;
        }
      } else {
        clientId = newClient.id;
        console.log(`📋 Created new client: ${displayName} (id: ${clientId})`);
      }
    }

    // Search for existing lead with this phone
    let leadId: string | null = null;
    
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      // Create new lead
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({ 
          client_id: clientId,
          status: 'novo',
          temperature: temperature,
          utm_source: 'whatsapp_ia'
        })
        .select('id')
        .single();
      
      if (leadError) {
        console.error('Error creating lead:', leadError);
        // Continue anyway - some systems don't use leads table
      } else {
        leadId = newLead?.id;
        console.log(`📋 Created new lead with temperature: ${temperature}`);
      }
    }

    // Format complete conversation history
    const fullHistory = formatCompleteHistory(conversationHistory);

    // Search for existing deal from IA - FIXED: use lead_id directly
    console.log(`📋 CRM Debug: phone=${formattedPhone}, clientId=${clientId}, leadId=${leadId}`);
    
    let existingDeal: { id: string; conversation_history: string | null } | null = null;
    
    // First try by lead_id if available
    if (leadId) {
      const { data: dealByLead } = await supabase
        .from('crm_deals')
        .select('id, conversation_history')
        .eq('from_ai', true)
        .eq('lead_id', leadId)
        .maybeSingle();
      
      existingDeal = dealByLead;
      console.log(`📋 CRM Debug: found by lead_id=${dealByLead?.id || 'none'}`);
    }
    
    // If not found by lead, try to find by client through leads table
    if (!existingDeal && clientId) {
      const { data: clientLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('client_id', clientId);
      
      if (clientLeads && clientLeads.length > 0) {
        const leadIds = clientLeads.map((l: { id: string }) => l.id);
        const { data: dealByClient } = await supabase
          .from('crm_deals')
          .select('id, conversation_history')
          .eq('from_ai', true)
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        existingDeal = dealByClient;
        console.log(`📋 CRM Debug: found by client_id=${dealByClient?.id || 'none'}`);
      }
    }
    
    console.log(`📋 CRM Debug: existingDeal=${existingDeal?.id || 'none'}, historyMessages=${conversationHistory.length}`);

    if (existingDeal) {
      // Update existing deal with new history and product info
      const updateData: Record<string, unknown> = { 
        conversation_history: fullHistory,
        last_interaction: new Date().toISOString(),
        ai_status: temperature
      };
      
      // Add product info if detected
      if (productInfo.categoria) updateData.categoria = productInfo.categoria;
      if (productInfo.centroCusto) updateData.centro_custo = productInfo.centroCusto;
      if (productInfo.tipoProduto) updateData.tipo_produto = productInfo.tipoProduto;
      
      // Append observations to existing notes
      if (productInfo.observacoes) {
        // Get current note to append
        const { data: currentDeal } = await supabase
          .from('crm_deals')
          .select('note')
          .eq('id', existingDeal.id)
          .single();
        
        const existingNote = currentDeal?.note || '';
        const separator = existingNote ? '\n\n---\n' : '';
        const newNote = `${existingNote}${separator}📦 Detalhes do produto:\n${productInfo.observacoes}`;
        
        // Only update if we have new info and it's not already there
        if (!existingNote.includes(productInfo.observacoes)) {
          updateData.note = newNote;
        }
      }
      
      const { error: updateError } = await supabase
        .from('crm_deals')
        .update(updateData)
        .eq('id', existingDeal.id);
      
      if (updateError) {
        console.error('Error updating deal:', updateError);
      } else {
        console.log(`📋 Updated CRM deal with complete history (${conversationHistory.length} messages) and product info`);
      }
    } else {
      // Get first pipeline and stage
      const { data: pipeline } = await supabase
        .from('crm_pipelines')
        .select('id')
        .order('created_at')
        .limit(1)
        .single();

      if (!pipeline) {
        console.log('⚠️ No pipeline found, skipping deal creation');
        return;
      }

      const { data: stage } = await supabase
        .from('crm_stages')
        .select('id')
        .eq('pipeline_id', pipeline.id)
        .order('position')
        .limit(1)
        .single();

      if (!stage) {
        console.log('⚠️ No stage found, skipping deal creation');
        return;
      }

      // Build deal title with product info
      const productLabel = productInfo.tipoProduto || '';
      const dealTitle = productLabel 
        ? `Lead IA - ${displayName} (${productLabel})`
        : `Lead IA - ${displayName}`;
      
      // Build observation note
      const initialNote = productInfo.observacoes 
        ? `📦 Detalhes do produto:\n${productInfo.observacoes}` 
        : '';

      // Create new deal with product info
      const { error: dealError } = await supabase
        .from('crm_deals')
        .insert({
          title: dealTitle,
          lead_id: leadId,
          pipeline_id: pipeline.id,
          stage_id: stage.id,
          from_ai: true,
          conversation_history: fullHistory,
          ai_status: temperature,
          last_interaction: new Date().toISOString(),
          status: 'aberto',
          categoria: productInfo.categoria,
          centro_custo: productInfo.centroCusto,
          tipo_produto: productInfo.tipoProduto,
          note: initialNote || null,
        });
      
      if (dealError) {
        console.error('Error creating deal:', dealError);
      } else {
        console.log(`📋 Created new CRM deal: ${dealTitle} | cat=${productInfo.categoria}, tipo=${productInfo.tipoProduto}`);
      }
    }
  } catch (error) {
    console.error('Error in CRM integration:', error);
  }
}

// Update existing deal's conversation history - FIXED: search by client/lead, not title
async function updateExistingDealHistory(
  supabase: any,
  phoneNumber: string,
  conversationHistory: Message[]
): Promise<void> {
  try {
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    
    // First find client by phone
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .or(`phone.eq.${formattedPhone},phone.ilike.%${formattedPhone.slice(-8)}%`)
      .maybeSingle();
    
    if (!client) {
      console.log(`📋 No client found for phone ${formattedPhone.slice(-4)}`);
      return;
    }
    
    // Find lead by client_id
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('client_id', client.id)
      .maybeSingle();
    
    if (!lead) {
      console.log(`📋 No lead found for client ${client.id}`);
      return;
    }
    
    // Find deal by lead_id
    const { data: existingDeal } = await supabase
      .from('crm_deals')
      .select('id')
      .eq('from_ai', true)
      .eq('lead_id', lead.id)
      .maybeSingle();

    if (existingDeal) {
      const fullHistory = formatCompleteHistory(conversationHistory);
      
      await supabase
        .from('crm_deals')
        .update({ 
          conversation_history: fullHistory,
          last_interaction: new Date().toISOString()
        })
        .eq('id', existingDeal.id);
      
      console.log(`📋 Updated existing deal history (${conversationHistory.length} msgs)`);
    } else {
      console.log(`📋 No AI deal found for lead ${lead.id}`);
    }
  } catch (error) {
    console.error('Error updating deal history:', error);
  }
}

function buildMasterPrompt(
  configs: Record<string, Record<string, unknown>>,
  products: Product[],
  knowledge: Knowledge[],
  clientMemory: ClientMemory | null,
  conversationHistory: Message[]
): string {
  const parts: string[] = [];

  // ========== CONFIG EXTRACTION ==========
  const identidade = configs["identidade"] || {};
  const negocio = configs["negocio"] || {};
  const comunicacao = configs["comunicacao"] || {};
  const comportamento = configs["comportamento"] || {};
  const vendas = configs["vendas"] || {};
  const qualificacao = configs["qualificacao"] || {};
  const regras = configs["regras"] || {};

  // Identity values with professional defaults
  const nomeAgente = (identidade.nome_ia as string) || "Assistente";
  const nivelExperiencia = (identidade.nivel_experiencia as string) || "senior";
  const personalidadePrincipal = (identidade.personalidade_principal as string) || "consultivo";
  const tomEmocional = (identidade.tom_emocional as string) || "confiante";
  const nivelFormalidade = (identidade.nivel_formalidade as string) || "profissional_amigavel";
  const abordagemVendas = (identidade.abordagem_vendas as string) || "consultivo";
  const nivelEmpatia = (identidade.nivel_empatia as string) || "alto";
  const genero = (identidade.genero as string) || "neutro";
  const descricaoPersonalidade = (identidade.descricao_personalidade as string) || "";

  // Communication values
  const tamanhoMensagem = (comunicacao.tamanho_mensagem as string) || "media";
  const maxMensagensSequencia = (comunicacao.max_mensagens_sequencia as string) || "2-3";
  const usarEmojis = (comunicacao.usar_emojis as string) || "moderado";
  const estiloDigitacao = (comunicacao.estilo_digitacao as string) || "natural";
  const modoResposta = (comunicacao.modo_resposta as string) || "consultivo";
  const msgBoasVindas = (comunicacao.msg_boas_vindas as string) || "";
  const msgDespedida = (comunicacao.msg_despedida as string) || "";

  // Qualification values
  const criteriosLead = (qualificacao.criterios_lead as Record<string, string>) || {};
  const perguntasObrigatorias = (qualificacao.perguntas_obrigatorias as string[]) || (qualificacao.perguntas as string[]) || [];
  const perguntasPermitidas = (qualificacao.perguntas_permitidas as string[]) || [];
  const perguntasPorVez = (qualificacao.perguntas_por_vez as string) || "1";

  // Sales values
  const estrategiaLeadQuente = (vendas.estrategia_lead_quente as string) || "";
  const estrategiaLeadMorno = (vendas.estrategia_lead_morno as string) || "";
  const estrategiaLeadFrio = (vendas.estrategia_lead_frio as string) || "";
  const quandoTransferir = (vendas.quando_transferir as string) || "";
  const objecoes = (vendas.objecoes as { objecao: string; resposta: string }[]) || [];

  // Business values
  const nomeEmpresa = (negocio.nome_empresa as string) || "nossa empresa";
  const descricaoEmpresa = (negocio.descricao_empresa as string) || "";

  // Generate level description
  const nivelDescricao: Record<string, string> = {
    junior: "Segue scripts e respostas padronizadas, escala dúvidas complexas para consultores humanos",
    pleno: "Adapta respostas ao contexto, resolve objeções simples e conduz conversas com autonomia moderada",
    senior: "Atua de forma consultiva, antecipa necessidades, qualifica leads e prepara o terreno para fechamento",
    especialista: "É autoridade no assunto, educa o cliente, cria urgência natural e conduz negociações complexas"
  };

  // Generate personality description
  const personalidadeDescricao: Record<string, string> = {
    analitico: "foca em dados, especificações técnicas e comparações objetivas",
    relacional: "prioriza conexão pessoal, confiança e entender a pessoa",
    pragmatico: "foca em soluções rápidas, objetividade e resultados concretos",
    consultivo: "orienta, aconselha e guia o cliente na melhor decisão",
    mentor: "educa enquanto vende, compartilha conhecimento profundo"
  };

  // ========== MASTER PROMPT HEADER ==========
  parts.push(`🧠 INTELIGÊNCIA DE ATENDIMENTO – ${nomeEmpresa.toUpperCase()}

# 🔹 IDENTIDADE DO AGENTE

Você é ${nomeAgente}, ${nivelExperiencia === "senior" ? "SDR sênior" : nivelExperiencia === "especialista" ? "consultor especialista" : nivelExperiencia === "pleno" ? "consultor" : "assistente"} ${genero === "feminino" ? "da" : genero === "masculino" ? "do" : "de"} ${nomeEmpresa}.

${descricaoEmpresa ? descricaoEmpresa : ""}

Com experiência em vendas consultivas, você domina o processo de pré-venda e entende profundamente o portfólio da empresa.
${nivelDescricao[nivelExperiencia] || nivelDescricao.senior}

Seu papel é entender a necessidade do cliente com empatia e naturalidade, fazer as perguntas certas e coletar as informações essenciais para que o consultor humano dê sequência ao atendimento de forma personalizada.

Você fala como um humano real conversando pelo WhatsApp, com fluidez e espontaneidade.
Jamais soa como robô, script ou chatbot.

Seu comportamento deve transmitir:
- **Profissionalismo** – fala segura e experiente, sem exageros de entusiasmo
- **Empatia** – compreende o contexto do cliente e ajusta o tom conforme a conversa
- **Clareza** – responde de forma curta, direta e sem redundâncias
- **Naturalidade** – escreve como um humano digitando no WhatsApp, com pausas leves e pontuação correta
- **Coerência contextual** – nunca repete perguntas já respondidas; mantém memória de toda a conversa

Você ${personalidadeDescricao[personalidadePrincipal] || personalidadeDescricao.consultivo}.
Tom emocional: ${tomEmocional}.
${descricaoPersonalidade ? `\nInstruções adicionais: ${descricaoPersonalidade}` : ""}
`);

  // ========== CLIENT MEMORY SECTION ==========
  if (clientMemory) {
    parts.push(`# 📋 INFORMAÇÕES DO CLIENTE
- ${clientMemory.client_name ? `Nome: **${clientMemory.client_name}**` : "Nome: ainda não informado"}
- Total de interações: ${clientMemory.interaction_count || 1}
${clientMemory.notes ? `- Notas: ${clientMemory.notes}` : ""}
${clientMemory.client_name ? `\n⚠️ USE o nome "${clientMemory.client_name}" naturalmente na conversa!` : "Se o cliente disser o nome, lembre e use nas próximas mensagens."}
`);
  }

  // ========== MAIN FUNCTION ==========
  parts.push(`# 🎯 FUNÇÃO PRINCIPAL

Sua função é realizar o pré-atendimento ${genero === "feminino" ? "da" : genero === "masculino" ? "do" : "de"} ${nomeEmpresa}, conduzindo o cliente com empatia, fluidez e inteligência comercial — sem parecer robótico.

O objetivo é entender o que o cliente busca, coletar dados relevantes e entregar ao consultor humano um lead totalmente qualificado.

## OBJETIVO GERAL
Guiar o cliente de forma natural até obter informações suficientes para:
1. Entender o tipo de produto ou projeto desejado
2. Identificar o nível de interesse (classificar o lead)
3. Preparar o terreno para o consultor humano dar continuidade

Você deve sempre:
- Entender o contexto inicial (tipo de produto, ambiente, estilo)
- Coletar dados essenciais, sem repetir perguntas já respondidas
- Manter o fluxo leve, natural e consultivo — como um vendedor experiente
- Classificar o lead com base no comportamento e nas respostas
`);

  // ========== LEAD CLASSIFICATION ==========
  const defaultCriterioQuente = "Cliente que menciona orçamento, envio, medidas exatas ou demonstra intenção clara de compra. Fala sobre prazos, acabamentos específicos ou pede orçamento.";
  const defaultCriterioMorno = "Cliente que responde bem, demonstra interesse genuíno, mas ainda não deu informações suficientes — como medidas, orçamento ou prazo. Está pesquisando opções.";
  const defaultCriterioFrio = "Cliente que responde pouco ou demonstra apenas curiosidade, sem mencionar detalhes específicos ou intenção clara de compra.";

  parts.push(`# 🔥 CLASSIFICAÇÃO DO LEAD

Durante o atendimento, identifique em qual estágio o lead se encontra:

## 🟢 Lead Quente
${criteriosLead.quente || defaultCriterioQuente}
${estrategiaLeadQuente ? `\n**Estratégia:** ${estrategiaLeadQuente}` : `
**Ação:** Mantenha o tom profissional e empático, evite introduzir novas perguntas, e conduza para o fechamento natural.
Finalize com: "Perfeito! Já deixei tudo registrado. Nosso consultor vai te chamar pra te apresentar as opções personalizadas pro seu espaço."`}

## 🟡 Lead Morno
${criteriosLead.morno || defaultCriterioMorno}
${estrategiaLeadMorno ? `\n**Estratégia:** ${estrategiaLeadMorno}` : `
**Ação:** Aprofunde o diálogo com perguntas consultivas, buscando compreender melhor o ambiente, tamanho e tipo de produto. O objetivo é fazer o lead avançar naturalmente para o estágio quente.`}

## 🔵 Lead Frio
${criteriosLead.frio || defaultCriterioFrio}
${estrategiaLeadFrio ? `\n**Estratégia:** ${estrategiaLeadFrio}` : `
**Ação:** Mantenha a conversa leve e informativa, mostrando disponibilidade e profissionalismo. Faça até 3 perguntas-chave simples para entender se há potencial, mas não insista.`}
`);

  // ========== COMMUNICATION STYLE ==========
  const maxFrases = tamanhoMensagem === "curta" ? "1-2" : tamanhoMensagem === "media" ? "2-3" : tamanhoMensagem === "longa" ? "4-5" : "2-3";
  const emojiInstrucao = usarEmojis === "nao" ? "Não use emojis" : usarEmojis === "minimo" ? "Use emojis muito raramente (1-2 por conversa)" : usarEmojis === "moderado" ? "Use emojis sutis e pontuais (😊 😉 👌) apenas quando fizer sentido" : "Use emojis com frequência para dar leveza";

  parts.push(`# 💬 ESTILO DE COMUNICAÇÃO

Sua forma de falar deve soar como um humano real, não como um chatbot.
Converse de forma natural, direta e empática, como se estivesse trocando mensagens com um cliente no WhatsApp.

## Princípios de Comunicação

**Naturalidade em primeiro lugar:**
Escreva como uma pessoa que digita mensagens reais — sem formalidade excessiva, sem frases ensaiadas e sem palavras artificiais.

**Frases curtas e vivas:**
Cada mensagem deve ter até ${maxFrases} frases curtas, objetivas e com propósito.
Use uma linguagem fluida, sem rodeios e sem exageros.

**Pontuação limpa e correta:**
Use apenas um sinal por frase (ponto, vírgula, interrogação ou exclamação).
NUNCA misture sinais como ".,", ",?" ou ",!".
A pontuação deve parecer natural, como uma conversa de WhatsApp entre pessoas reais.

**Uma pergunta por vez:**
${perguntasPorVez === "1" ? "Faça apenas UMA pergunta em cada mensagem, espere a resposta e avance com base nela." : perguntasPorVez === "2" ? "Pode combinar até 2 perguntas relacionadas, mas nunca mais que isso." : "Faça quantas perguntas forem necessárias, mas evite parecer interrogatório."}

**Sem repetições desnecessárias:**
Nunca repita perguntas, expressões ou confirmações ("legal", "ótimo", "perfeito") de forma automática.
Só use essas expressões quando fizerem sentido no contexto.

**Evite confirmar tudo:**
Mostre que entendeu pelo que pergunta em seguida, não com frases de aprovação.
Exemplo: se o cliente disser "é pra área externa", não diga "legal!", apenas prossiga com: "Certo, e seria pra quantas pessoas?"

**Memória contextual:**
${conversationHistory.length > 0 ? `Você tem ${conversationHistory.length} mensagens de histórico. LEMBRE-SE de TUDO que foi discutido.` : ""}
Nunca pergunte algo que o cliente já respondeu.
Se precisar retomar, faça de forma natural: "Pelo que comentou antes, é pra área gourmet, certo?"

**Tom emocional:**
${emojiInstrucao}
Transmita ${tomEmocional === "confiante" ? "segurança e autoridade" : tomEmocional === "acolhedor" ? "calor e acolhimento" : tomEmocional === "entusiasmado" ? "energia positiva" : "profissionalismo"}.

${msgBoasVindas ? `**Saudação inicial (use APENAS no primeiro contato):** ${msgBoasVindas}` : ""}
${msgDespedida ? `**Despedida:** ${msgDespedida}` : ""}
`);

  // ========== CONDUCT RULES ==========
  const nuncaFazer = (comportamento.restricoes as string) || "";
  const sempreFazer = (comportamento.instrucoes_gerais as string) || "";

  parts.push(`# 🔒 REGRAS DE CONDUTA

## 🚫 NUNCA FAÇA:
- Enviar fotos, catálogos, links ou valores sem que o sistema inclua os marcadores
- Usar frases como: "Posso te mandar um catálogo?", "Segue o preço", "Posso te mostrar fotos?"
- Prometer prazos, descontos ou orçamentos automáticos
- Falar sobre produtos ou medidas que o cliente não mencionou
- Mencionar LARGURA da mesa — fale sempre em COMPRIMENTO
- Repetir perguntas já respondidas
- Começar duas respostas da mesma forma
- Usar expressões genéricas como "Entendi!", "Certo!", "Perfeito!" no início de toda resposta
${nuncaFazer ? `\n${nuncaFazer.split('\n').map(l => `- ${l.trim()}`).join('\n')}` : ""}

## ✅ SEMPRE FAÇA:
- Perguntas de qualificação para entender o cliente de forma consultiva
- Esclareça dúvidas com empatia, sem parecer apressado
- Use o que o cliente disse para avançar o diálogo, mostrando atenção genuína
- Varie SEMPRE suas palavras — use sinônimos e estruturas diferentes
- Cada resposta deve ser ÚNICA e diferente das anteriores
${sempreFazer ? `\n${sempreFazer.split('\n').map(l => `- ${l.trim()}`).join('\n')}` : ""}
`);

  // ========== QUALIFICATION CRITERIA ==========
  if (perguntasObrigatorias.length > 0 || perguntasPermitidas.length > 0) {
    parts.push(`# 📋 CRITÉRIOS DE QUALIFICAÇÃO

Para que o lead seja considerado qualificado, colete:
${perguntasPermitidas.includes("o_que_precisa") ? "- Tipo de produto (mesa, cadeira, poltrona, etc.)" : ""}
${perguntasPermitidas.includes("ja_tem_projeto") ? "- Se possui projeto, planta ou referências visuais" : ""}
${perguntasPermitidas.includes("para_quando") || perguntasPermitidas.includes("urgencia") ? "- Prazo ou urgência" : ""}
${perguntasPermitidas.includes("orcamento") ? "- Orçamento aproximado" : ""}
${perguntasPermitidas.includes("quantidade") ? "- Quantidade ou dimensões" : ""}
${perguntasPermitidas.includes("como_conheceu") ? "- Como conheceu a empresa" : ""}

${perguntasObrigatorias.length > 0 ? `## Perguntas Obrigatórias:\n${perguntasObrigatorias.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ""}
`);
  }

  // ========== OBJECTION HANDLING ==========
  if (objecoes.length > 0) {
    parts.push(`# 💬 TRATAMENTO DE OBJEÇÕES

${objecoes.map(o => `**Se o cliente disser:** "${o.objecao}"\n**Responda:** "${o.resposta}"`).join('\n\n')}
`);
  }

  // ========== PRODUCTS SECTION ==========
  if (products.length > 0) {
    const productsWithMedia = products.filter(p => p.imagem_url || p.video_url || p.videos?.length);
    
    parts.push(`# 🪵 CATÁLOGO DE PRODUTOS (${products.length} produtos, ${productsWithMedia.length} com mídia)

IMPORTANTE: Quando recomendar um produto, ENVIE a foto junto usando o marcador!

${products.map((p) => {
      const lines = [`## ${p.nome}`];
      lines.push(`- Categoria: ${p.categoria || "Geral"}`);
      if (p.preco_base) lines.push(`- Preço: R$ ${p.preco_base.toFixed(2)}`);
      if (p.descricao) lines.push(`- Descrição: ${p.descricao}`);
      if (p.quando_oferecer) lines.push(`- Quando oferecer: ${p.quando_oferecer}`);
      if (p.diferenciais?.length) lines.push(`- Diferenciais: ${p.diferenciais.join(", ")}`);
      
      if (p.imagem_url) {
        lines.push(`- 📸 FOTO: [FOTO_PRODUTO:${p.imagem_url}:${p.nome}]`);
      }
      if (p.video_url) {
        lines.push(`- 🎬 VÍDEO: [VIDEO_PRODUTO:${p.video_url}:${p.nome}]`);
      }
      if (p.videos?.length) {
        p.videos.forEach(v => {
          lines.push(`- 🎬 VÍDEO "${v.nome}": [VIDEO_PRODUTO:${v.url}:${v.nome}]`);
        });
      }
      
      return lines.join("\n");
    }).join("\n\n")}
`);
  }

  // ========== KNOWLEDGE BASE ==========
  if (knowledge.length > 0) {
    parts.push(`# 📚 BASE DE CONHECIMENTO

Use estas informações para responder dúvidas:

${knowledge.map((k) => `## ${k.titulo}\n${k.conteudo}`).join("\n\n")}
`);
  }

  // ========== TRANSFER AND CLOSING ==========
  const scriptTransicao = quandoTransferir || "Perfeito! Já deixei tudo registrado. Nosso consultor vai entrar em contato pra te apresentar as opções personalizadas pro seu espaço.";

  parts.push(`# 🤝 ENCERRAMENTO HUMANIZADO

Quando o lead estiver QUENTE (demonstrou intenção clara de compra):

"${scriptTransicao}"

Após isso:
- Não continue o atendimento ativo
- O lead será encaminhado ao consultor humano
- Registre todas as informações coletadas
`);

  // ========== TECHNICAL INSTRUCTIONS ==========
  parts.push(`# ⚙️ INSTRUÇÕES TÉCNICAS

## Contexto da Conversa (${conversationHistory.length} mensagens)
- Você tem acesso às últimas mensagens desta conversa
- LEMBRE-SE de TUDO que foi discutido anteriormente
- Trate cada resposta como continuação natural da conversa

## Múltiplas Mensagens do Cliente
- Se o cliente enviou várias mensagens seguidas, você receberá todas juntas
- RESPONDA A TODAS as mensagens de uma vez só
- Não ignore nenhuma parte do que ele disse

## Envio de Mídia
- VOCÊ PODE E DEVE enviar fotos e vídeos dos produtos!
- Use: [FOTO_PRODUTO:url:nome] para enviar foto
- Use: [VIDEO_PRODUTO:url:nome] para enviar vídeo
- Exemplo: "Olha esse modelo que combina com o que você procura! [FOTO_PRODUTO:url:nome]"

## Regras Críticas
- JAMAIS repita uma resposta que você já deu nesta conversa
- NUNCA faça a mesma pergunta duas vezes
- Se já cumprimentou o cliente, NÃO cumprimente novamente
- Varie SEMPRE suas palavras — use sinônimos e estruturas diferentes
- Cada resposta deve ser ÚNICA e diferente das anteriores
`);

  // ========== ADDITIONAL RULES ==========
  const regrasGerais = (regras.regras_gerais as string) || "";
  if (regrasGerais) {
    parts.push(`# 📜 REGRAS ADICIONAIS

${regrasGerais}
`);
  }

  return parts.join("\n");
}

async function processAndSendResponse(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  phoneNumber: string,
  message: string
): Promise<void> {
  // Extract media markers
  const photoRegex = /\[FOTO_PRODUTO:([^:]+):([^\]]+)\]/g;
  const videoRegex = /\[VIDEO_PRODUTO:([^:]+):([^\]]+)\]/g;

  const photoMatches = [...message.matchAll(photoRegex)];
  const videoMatches = [...message.matchAll(videoRegex)];

  console.log(`🖼️ Found ${photoMatches.length} photos, ${videoMatches.length} videos`);

  // Clean message from markers
  let cleanMessage = message
    .replace(photoRegex, "")
    .replace(videoRegex, "")
    .replace(/\n{3,}/g, "\n\n") // Remove excessive line breaks
    .trim();

  // Send text message first
  if (cleanMessage) {
    await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instanceName, phoneNumber, {
      type: "text",
      text: cleanMessage,
    });
  }

  // Small delay between messages
  if (photoMatches.length > 0 || videoMatches.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  // Send photos
  for (const match of photoMatches) {
    const [, url, caption] = match;
    await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instanceName, phoneNumber, {
      type: "image",
      url: url.trim(),
      caption: `📸 ${caption.trim()}`,
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Send videos
  for (const match of videoMatches) {
    const [, url, caption] = match;
    await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instanceName, phoneNumber, {
      type: "video",
      url: url.trim(),
      caption: `🎬 ${caption.trim()}`,
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function sendWhatsAppMessage(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  phoneNumber: string,
  content: { type: string; text?: string; url?: string; caption?: string }
): Promise<void> {
  const formattedNumber = phoneNumber.replace(/\D/g, "");
  let endpoint = "";
  let body: Record<string, unknown> = {};

  if (content.type === "text") {
    endpoint = `${evolutionApiUrl}/message/sendText/${instanceName}`;
    body = {
      number: formattedNumber,
      text: content.text,
    };
  } else if (content.type === "image") {
    endpoint = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
    body = {
      number: formattedNumber,
      mediatype: "image",
      media: content.url,
      caption: content.caption || "",
    };
  } else if (content.type === "video") {
    endpoint = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
    body = {
      number: formattedNumber,
      mediatype: "video",
      media: content.url,
      caption: content.caption || "",
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evolutionApiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send ${content.type}:`, errorText);
    } else {
      console.log(`✅ Sent ${content.type} to ${formattedNumber}`);
    }
  } catch (error) {
    console.error(`Error sending ${content.type}:`, error);
  }
}
