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
  galeria: string[] | null;
  video_url: string | null;
  videos: Array<{nome: string; url: string}> | null;
  quando_oferecer: string | null;
  diferenciais: string[] | null;
  ativo: boolean;
  // NOVOS CAMPOS
  estoque?: number;
  permite_venda_sem_estoque?: boolean;
  prazo_entrega_dias?: number;
  comprimento?: number;
  largura?: number;
  altura?: number;
  unidade_medida?: string;
}

interface Knowledge {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  tipo?: string;
  nivel_autoridade?: string;
  grau_certeza?: string;
  aplicacao?: string[];
  contexto_uso?: string;
  palavras_chave?: string[];
  prioridade?: number;
  fonte?: string;
  validade?: string;
  arquivos?: string[];
  videos?: Array<{nome: string; url: string}>;
  arquivo_url?: string;
  tipo_arquivo?: string;
  autor?: string;
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

    // DEBUG: Log message structure to understand where contextInfo is
    const message = messageData.message;
    console.log(`📦 Message structure keys: ${Object.keys(message || {}).join(', ')}`);
    console.log(`📦 MessageData has contextInfo: ${!!messageData?.contextInfo}`);
    if (messageData?.contextInfo?.quotedMessage) {
      console.log(`📎 Found quotedMessage in messageData.contextInfo!`);
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
    let userMessage = "";
    let mediaType = "text";
    let mediaUrl: string | null = null;
    
    // ========== EXTRACT QUOTED MESSAGE CONTEXT ==========
    // Evolution API can have contextInfo in different places depending on message type
    let quotedContext = "";
    
    // Try multiple locations where contextInfo can be
    const contextInfo = messageData?.contextInfo ||                    // Direct on messageData
                        message?.extendedTextMessage?.contextInfo ||   // In extendedTextMessage
                        message?.imageMessage?.contextInfo ||          // In image replies
                        message?.videoMessage?.contextInfo ||          // In video replies
                        message?.documentMessage?.contextInfo;         // In document replies
    
    const quotedMessage = contextInfo?.quotedMessage;
    
    if (quotedMessage) {
      // Extract text from different quoted message types
      const quotedText = quotedMessage?.conversation || 
                         quotedMessage?.extendedTextMessage?.text ||
                         quotedMessage?.imageMessage?.caption ||
                         quotedMessage?.videoMessage?.caption ||
                         quotedMessage?.documentMessage?.caption || "";
      
      if (quotedText && quotedText.trim().length > 0) {
        quotedContext = `[📎 MENSAGEM CITADA: O cliente está RESPONDENDO a esta mensagem específica: "${quotedText.substring(0, 500)}"]`;
        console.log(`📎 Quoted message detected from contextInfo: "${quotedText.substring(0, 100)}..."`);
      } else {
        // Fallback: even without text, mark that there's a quoted message
        const stanzaId = contextInfo?.stanzaId;
        if (stanzaId) {
          console.log(`📎 Quoted message has stanzaId: ${stanzaId} but no text extracted`);
          quotedContext = `[📎 AVISO: O cliente RESPONDEU/MARCOU uma mensagem anterior. Identifique o produto mencionado recentemente.]`;
        }
      }
    }
    
    // Also log raw contextInfo for debugging
    if (contextInfo) {
      console.log(`📎 Raw contextInfo:`, JSON.stringify(contextInfo).substring(0, 500));
    }

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

    // PASSO 2.5: LIMPEZA DE LOCKS EXPIRADOS (>30 segundos)
    // Isso evita que mensagens fiquem presas indefinidamente
    try {
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      const { data: expiredLocks } = await supabase
        .from("ia_pending_messages")
        .update({ is_processing: false })
        .eq("is_processing", true)
        .lt("created_at", thirtySecondsAgo)
        .select("id");
      
      if (expiredLocks && expiredLocks.length > 0) {
        console.log(`🧹 Liberados ${expiredLocks.length} locks expirados (>30s)`);
      }
    } catch (cleanupError) {
      console.warn("⚠️ Erro na limpeza de locks:", cleanupError);
    }

    // PASSO 3: Tentar adquirir lock atômico de processamento COM RETRY
    // Implementa retry com backoff exponencial para evitar race conditions
    let lockAcquired: any = null;
    let lockAttempts = 0;
    const maxLockAttempts = 3;

    while (!lockAcquired && lockAttempts < maxLockAttempts) {
      lockAttempts++;
      console.log(`🔒 Tentativa ${lockAttempts}/${maxLockAttempts} de adquirir lock...`);
      
      const { data: lockData, error: lockError } = await supabase
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

      if (lockData && !lockError) {
        lockAcquired = lockData;
        console.log(`✅ Lock adquirido na tentativa ${lockAttempts}`);
        break;
      }

      // Delay aleatório antes de retry (200-700ms)
      if (lockAttempts < maxLockAttempts) {
        const retryDelay = 200 + Math.random() * 500;
        console.log(`⏳ Aguardando ${Math.round(retryDelay)}ms antes de retry...`);
        await new Promise(r => setTimeout(r, retryDelay));
      }
    }

    // FALLBACK: Verificar se existem mensagens órfãs (antigas não processadas)
    if (!lockAcquired) {
      console.log(`🔍 Lock falhou após ${maxLockAttempts} tentativas. Verificando mensagens órfãs...`);
      
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { data: orphanMessages } = await supabase
        .from("ia_pending_messages")
        .select("*")
        .eq("phone_number", phoneNumber)
        .eq("instance_name", instanceName)
        .eq("processed", false)
        .eq("is_processing", false)
        .lt("created_at", oneMinuteAgo)
        .order("created_at", { ascending: true })
        .limit(1);

      if (orphanMessages && orphanMessages.length > 0) {
        const orphan = orphanMessages[0];
        console.log(`🧹 Encontrada mensagem órfã (${orphan.id}), forçando processamento...`);
        
        // Forçar aquisição do lock na mensagem órfã
        const { data: forcedLock, error: forceError } = await supabase
          .from("ia_pending_messages")
          .update({ is_processing: true })
          .eq("id", orphan.id)
          .eq("is_processing", false)
          .select()
          .single();

        if (forcedLock && !forceError) {
          lockAcquired = forcedLock;
          console.log(`✅ Lock forçado com sucesso na mensagem órfã`);
        }
      }
    }

    if (!lockAcquired) {
      console.log(`🔒 Nenhum lock adquirido após todas tentativas. Saindo graciosamente.`);
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
    let combinedMessage = consolidatedMessages.length > 1 
      ? `[O cliente enviou ${consolidatedMessages.length} mensagens seguidas]\n\n${consolidatedMessages.join("\n\n")}`
      : consolidatedMessages[0];
    
    // ========== ADD QUOTED CONTEXT IF EXISTS ==========
    // If user replied to a specific message, prepend that context
    if (quotedContext) {
      combinedMessage = `${quotedContext}\n\n${combinedMessage}`;
      console.log(`📎 Added quoted context to combined message`);
    }

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
        .select("id, nome, descricao, preco_base, categoria, imagem_url, galeria, video_url, videos, quando_oferecer, diferenciais, ativo, estoque, permite_venda_sem_estoque, prazo_entrega_dias, comprimento, largura, altura, unidade_medida")
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
      .select("role, content, created_at, sent_product_ids")
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

    // ========== EXTRACT ALREADY PROVIDED INFO (Anti-Repetition) ==========
    function extractAlreadyProvidedInfo(history: Message[]): string[] {
      const provided: string[] = [];
      
      for (const msg of history) {
        if (msg.role === "assistant") {
          // Check for price mentions
          if (/R\$\s*[\d.,]+/.test(msg.content)) {
            const priceMatch = msg.content.match(/R\$\s*[\d.,]+/g);
            if (priceMatch) {
              provided.push(`Preço já informado: ${priceMatch[0]}`);
            }
          }
          
          // Check for material mentions (pés, base, estrutura)
          if (/pés?|base|estrutura/i.test(msg.content) && /aço|metal|ferro|carbono|madeira/i.test(msg.content)) {
            provided.push("Material dos pés/base já explicado");
          }
          
          // Check for size mentions
          if (/\d+[\s,]*m(?:etros?)?|\d+\s*cm|\d+,\d+\s*m/i.test(msg.content) && /mesa|banco|cadeira/i.test(msg.content)) {
            provided.push("Tamanho/medidas já informados");
          }
          
          // Check for prazo/entrega
          if (/prazo|dias úteis|semanas|entrega/i.test(msg.content) && /\d+\s*(dias?|semanas?)/i.test(msg.content)) {
            provided.push("Prazo de entrega já mencionado");
          }
          
          // Check for acabamento
          if (/acabamento|óleo|verniz|laca|pintura/i.test(msg.content)) {
            provided.push("Acabamento já explicado");
          }
        }
      }
      
      return [...new Set(provided)]; // Remove duplicates
    }

    const alreadyProvidedInfo = extractAlreadyProvidedInfo(conversationHistory);

    // ========== LAST SENT PRODUCT CONTEXT ==========
    // Find the last assistant message that sent a product photo
    let lastSentProductContext = "";
    
    // Helper function to extract product IDs from FOTO_PRODUTO markers
    function extractProductIdsFromContent(content: string, productsRef: Product[]): string[] {
      const ids: string[] = [];
      const markers = content.match(/\[FOTO_PRODUTO:[^\]]+\]/g) || [];
      
      for (const marker of markers) {
        // Try multiple patterns for ID extraction
        const patterns = [
          /\(ID:([a-z0-9-]+)\)/i,           // (ID:abc123)
          /\[ID:([a-z0-9-]+)\]/i,           // [ID:abc123]
          /ID:\s*([a-z0-9-]+)/i,            // ID: abc123
        ];
        
        let foundId = false;
        for (const pattern of patterns) {
          const match = marker.match(pattern);
          if (match && match[1]) {
            ids.push(match[1].substring(0, 8));
            foundId = true;
            break;
          }
        }
        
        // If no ID found, try to find product by name in the marker caption
        if (!foundId) {
          const captionMatch = marker.match(/:([^:\]]+)\]$/);
          if (captionMatch) {
            const caption = captionMatch[1].toLowerCase().trim();
            // Remove common suffixes like "(ID:xxx)" or "- Foto X"
            const cleanCaption = caption.replace(/\(id:[^)]+\)/gi, '').replace(/-\s*foto\s*\d+/gi, '').trim();
            
            const product = productsRef.find(p => {
              const pName = p.nome.toLowerCase();
              // Check if caption contains product name or vice versa
              return cleanCaption.includes(pName) || pName.includes(cleanCaption) ||
                     // Also check first 3 words
                     cleanCaption.split(' ').slice(0, 3).join(' ').includes(pName.split(' ').slice(0, 3).join(' '));
            });
            if (product) {
              ids.push(product.id.substring(0, 8));
            }
          }
        }
      }
      
      return [...new Set(ids)]; // Remove duplicates
    }
    
    // First: try by sent_product_ids field
    let assistantWithProducts = (historyData || [])
      .filter((h: any) => h.role === "assistant" && h.sent_product_ids && h.sent_product_ids.length > 0)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Second: if no sent_product_ids found, scan content for FOTO_PRODUTO markers
    if (assistantWithProducts.length === 0) {
      console.log("📸 No sent_product_ids found, scanning content for FOTO_PRODUTO markers...");
      const recentAssistantMessages = (historyData || [])
        .filter((h: any) => h.role === "assistant" && h.content)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5); // Last 5 assistant messages
      
      for (const msg of recentAssistantMessages) {
        const idsFromContent = extractProductIdsFromContent(msg.content || '', products);
        if (idsFromContent.length > 0) {
          console.log(`📸 Found ${idsFromContent.length} product IDs from content analysis: ${idsFromContent.join(', ')}`);
          assistantWithProducts = [{ ...msg, sent_product_ids: idsFromContent }];
          break;
        }
      }
    }
    
    if (assistantWithProducts.length > 0) {
      const lastSentIds = assistantWithProducts[0].sent_product_ids as string[];
      console.log(`📸 Found ${lastSentIds.length} products sent in last message with photos: ${lastSentIds.join(', ')}`);
      
      // Find the actual products
      const sentProducts = products.filter(p => 
        lastSentIds.some(id => p.id.startsWith(id) || p.id === id)
      );
      
      if (sentProducts.length > 0) {
        const productInfo = sentProducts.map(p => {
          const shortId = p.id.substring(0, 8);
          const hasGallery = p.galeria && p.galeria.length > 0;
          const galleryCount = hasGallery ? p.galeria!.length : 0;
          
          // Build gallery URLs for easy reference
          let galleryMarkers = "";
          if (hasGallery) {
            galleryMarkers = p.galeria!.slice(0, 4).map((url, idx) => 
              `    - [FOTO_PRODUTO:${url}:${p.nome} (ID:${shortId}) - Foto ${idx + 1}]`
            ).join('\n');
          }
          
          return `### ${p.nome} [ID:${shortId}]
- Preço: R$ ${p.preco_base?.toLocaleString('pt-BR') || 'N/I'}
- Categoria: ${p.categoria || 'N/I'}
- Fotos disponíveis: ${galleryCount > 0 ? `${galleryCount} fotos na galeria` : 'Apenas foto principal'}
- Imagem principal: [FOTO_PRODUTO:${p.imagem_url}:${p.nome} (ID:${shortId})]
${hasGallery ? `- **GALERIA (use estas para "mais foto"):**\n${galleryMarkers}` : '- ⚠️ Sem galeria - apenas foto principal disponível'}`;
        }).join('\n\n');
        
        lastSentProductContext = `\n\n# 📸 ÚLTIMO(S) PRODUTO(S) ENVIADO(S) - MEMORIZE!

⚠️ **ATENÇÃO:** Este é o produto que você ACABOU de mostrar ao cliente!
Se o cliente pedir "mais foto", "outra imagem", "tem mais?", você DEVE usar este produto!

${productInfo}

## 🎯 INSTRUÇÕES PARA "MAIS FOTO" / "OUTRA IMAGEM":

1. **O QUE FAZER:** Enviar fotos da GALERIA do produto acima (mesmo ID!)
2. **COMO FAZER:** Copie os marcadores da galeria listados acima
3. **SE NÃO TIVER GALERIA:** Diga "Dessa peça específica tenho apenas essa imagem. Quer ver outras opções parecidas?"
4. **NUNCA:** Envie foto de outro produto sem perguntar primeiro!
`;
        console.log(`📸 Added last sent product context for: ${sentProducts.map(p => p.nome).join(', ')}`);
      }
    }

    // ========== EXTRACT ANTI-REPETITION AND CONTEXT DATA ==========
    const askedQuestions = extractAskedQuestions(conversationHistory);
    const conversationContext = extractConversationContext(conversationHistory);
    
    console.log(`📋 Anti-repetição: ${askedQuestions.length} perguntas já feitas detectadas`);
    console.log(`📋 Contexto extraído:`, JSON.stringify(conversationContext));

    // ========== DETECT CONFUSION OR LOOP ==========
    const confusionResult = detectConfusionOrLoop(conversationHistory);
    if (confusionResult.isConfused) {
      console.log(`🚨 [CONFUSION] Detectado: ${confusionResult.reason}`);
    }

    // Build master prompt with last sent product context + anti-repetition + semantic context
    const masterPrompt = buildMasterPrompt(configs, products, knowledge, clientMemory, conversationHistory, alreadyProvidedInfo, askedQuestions, conversationContext) + lastSentProductContext;

    // Build messages array for AI
    const messages: Message[] = [
      { role: "system", content: masterPrompt },
    ];
    
    // Add history summary if available
    if (historySummary) {
      messages.push({ role: "system", content: `[RESUMO DA CONVERSA ANTERIOR]\n${historySummary}` });
    }
    
    // ========== INJECT TRANSFER INSTRUCTION IF CONFUSED ==========
    if (confusionResult.shouldTransfer) {
      const clientName = clientMemory?.client_name || "cliente";
      messages.push({ 
        role: "system", 
        content: `
⚠️ ATENÇÃO CRÍTICA - TRANSFERÊNCIA OBRIGATÓRIA ⚠️

Foi detectado que o cliente pode estar confuso ou frustrado.
Razão: ${confusionResult.reason}

SUA PRÓXIMA RESPOSTA DEVE OBRIGATORIAMENTE:
1. Reconhecer a situação com empatia (sem pedir desculpas excessivas)
2. Informar que vai transferir para um consultor humano
3. Usar EXATAMENTE este script:

"Entendi, ${clientName}! Para te atender melhor nesse caso, vou passar você para um dos nossos consultores especialistas. Ele vai entrar em contato em breve para dar continuidade ao seu atendimento de forma personalizada. 🙌"

REGRAS ABSOLUTAS:
- NÃO continue fazendo perguntas
- NÃO tente resolver sozinho
- NÃO peça mais informações
- Apenas faça a transferência com empatia
` 
      });
      
      console.log(`📤 [TRANSFER] Instrução de transferência injetada no prompt`);
    }
    
    messages.push(...conversationHistory);
    messages.push({ role: "user", content: combinedMessage });

    // Call Lovable AI with fallback
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Calculate maxTokens based on character limit
    // 1 token ≈ 4-5 chars em português, então limite/4 é mais apropriado
    // PLUS: Add buffer for media markers (each marker ~50-80 chars = ~20 tokens, reserve 200 tokens for up to 3 markers)
    const comunicacaoConfig = configs.comunicacao || {};
    const limiteCaracteresConfig = Number(comunicacaoConfig.limite_caracteres) || 0;
    const temLimite = limiteCaracteresConfig > 0;
    const textTokens = Math.max(50, Math.ceil(limiteCaracteresConfig / 4));
    const mediaTokensBuffer = 200; // Buffer for FOTO_PRODUTO markers
    const maxTokens = temLimite ? textTokens + mediaTokensBuffer : 1500;
    
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

    // ========== FORCE CHARACTER LIMIT (PRESERVING MEDIA MARKERS) ==========
    const limiteCaracteres = limiteCaracteresConfig;
    
    // Extract media markers BEFORE character limit check
    const photoRegex = /\[FOTO_PRODUTO:[^\]]+\]/g;
    const videoRegex = /\[VIDEO_PRODUTO:[^\]]+\]/g;
    const photoMarkers = assistantMessage.match(photoRegex) || [];
    const videoMarkers = assistantMessage.match(videoRegex) || [];
    
    console.log(`📸 Media markers in AI response: ${photoMarkers.length} photos, ${videoMarkers.length} videos`);
    if (photoMarkers.length > 0) {
      console.log(`📸 Photo markers found:`, photoMarkers);
    }
    if (videoMarkers.length > 0) {
      console.log(`🎬 Video markers found:`, videoMarkers);
    }
    
    // Calculate text length WITHOUT media markers for limit check
    const textWithoutMarkers = assistantMessage
      .replace(photoRegex, '')
      .replace(videoRegex, '')
      .trim();
    
    if (limiteCaracteres > 0 && textWithoutMarkers.length > limiteCaracteres) {
      console.log(`⚠️ Texto excede limite (${textWithoutMarkers.length}/${limiteCaracteres}). Truncando...`);
      
      let cleanText = textWithoutMarkers.substring(0, limiteCaracteres);
      
      // Procurar por fim de frase (. ! ?) para corte mais natural
      const lastSentenceEnd = Math.max(
        cleanText.lastIndexOf('.'),
        cleanText.lastIndexOf('!'),
        cleanText.lastIndexOf('?')
      );
      
      if (lastSentenceEnd > limiteCaracteres * 0.5) {
        // Corta no fim da frase
        cleanText = cleanText.substring(0, lastSentenceEnd + 1);
      } else {
        // Corta na última palavra
        const lastSpace = cleanText.lastIndexOf(' ');
        if (lastSpace > limiteCaracteres * 0.7) {
          cleanText = cleanText.substring(0, lastSpace);
        }
      }
      
      // Re-append all media markers (they are NOT counted in char limit)
      const allMarkers = [...photoMarkers, ...videoMarkers].join(' ');
      assistantMessage = cleanText.trim() + (allMarkers ? ' ' + allMarkers : '');
      
      console.log(`✅ Texto truncado para ${cleanText.length} chars, marcadores preservados: ${allMarkers.length} chars`);
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
          
          // Re-apply character limit after reformulation (preserving media markers)
          const reformPhotoMarkers = assistantMessage.match(photoRegex) || [];
          const reformVideoMarkers = assistantMessage.match(videoRegex) || [];
          const reformTextWithoutMarkers = assistantMessage
            .replace(photoRegex, '')
            .replace(videoRegex, '')
            .trim();
          
          if (limiteCaracteres > 0 && reformTextWithoutMarkers.length > limiteCaracteres) {
            const textoTruncado = reformTextWithoutMarkers.substring(0, limiteCaracteres - 3);
            const ultimoEspaco = textoTruncado.lastIndexOf(' ');
            let cleanText;
            if (ultimoEspaco > limiteCaracteres * 0.7) {
              cleanText = textoTruncado.substring(0, ultimoEspaco) + "...";
            } else {
              cleanText = textoTruncado + "...";
            }
            // Re-append markers
            const allMarkers = [...reformPhotoMarkers, ...reformVideoMarkers].join(' ');
            assistantMessage = cleanText + (allMarkers ? ' ' + allMarkers : '');
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

    // ========== CLEAN MESSAGE FORMAT (Remove markdown formatting) ==========
    function cleanMessageFormat(msg: string): string {
      let cleaned = msg;
      
      // Remove markdown bold (**text** or __text__)
      cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
      cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
      
      // Remove markdown italic (*text* or _text_) - careful not to break markers
      // Only remove single asterisks that are NOT part of [FOTO_PRODUTO:...] markers
      cleaned = cleaned.replace(/(?<!\[FOTO_PRODUTO:[^\]]*)\*([^*\[\]]+)\*(?![^\[]*\])/g, '$1');
      
      // Remove numbered lists at start of lines (1. 2. 3.)
      cleaned = cleaned.replace(/^\d+\.\s+/gm, '');
      
      // Remove bullet points with asterisks at start of lines
      cleaned = cleaned.replace(/^\*\s+/gm, '');
      
      return cleaned.trim();
    }
    
    // Apply cleaning to assistant message
    const cleanedMessage = cleanMessageFormat(assistantMessage);
    console.log(`🧹 Message cleaned of markdown formatting`);

    // Process media markers and send response
    await processAndSendResponse(
      evolutionApiUrl!,
      evolutionApiKey!,
      instanceName,
      phoneNumber,
      cleanedMessage
    );

    // Extract product IDs from FOTO_PRODUTO markers using robust extraction
    const sentProductIds: string[] = [];
    const photoMarkersForTracking = assistantMessage.match(/\[FOTO_PRODUTO:[^\]]+\]/g) || [];
    
    console.log(`📸 Found ${photoMarkersForTracking.length} FOTO_PRODUTO markers to track`);
    
    for (const marker of photoMarkersForTracking) {
      // Try multiple patterns for ID extraction
      const patterns = [
        /\(ID:([a-z0-9-]+)\)/i,           // (ID:abc123)
        /\[ID:([a-z0-9-]+)\]/i,           // [ID:abc123]
        /ID:\s*([a-z0-9-]+)/i,            // ID: abc123
      ];
      
      let foundId = false;
      for (const pattern of patterns) {
        const match = marker.match(pattern);
        if (match && match[1]) {
          const shortId = match[1].substring(0, 8);
          if (!sentProductIds.includes(shortId)) {
            sentProductIds.push(shortId);
          }
          foundId = true;
          console.log(`📸 Extracted ID from marker: ${shortId}`);
          break;
        }
      }
      
      // Fallback: find product by name in the caption
      if (!foundId) {
        const captionMatch = marker.match(/:([^:\]]+)\]$/);
        if (captionMatch) {
          const caption = captionMatch[1].toLowerCase().trim();
          // Remove common suffixes
          const cleanCaption = caption.replace(/\(id:[^)]+\)/gi, '').replace(/-\s*foto\s*\d+/gi, '').trim();
          
          const matchedProduct = products.find(p => {
            const pName = p.nome.toLowerCase();
            return cleanCaption.includes(pName) || pName.includes(cleanCaption) ||
                   cleanCaption.split(' ').slice(0, 3).join(' ').includes(pName.split(' ').slice(0, 3).join(' '));
          });
          
          if (matchedProduct) {
            const shortId = matchedProduct.id.substring(0, 8);
            if (!sentProductIds.includes(shortId)) {
              sentProductIds.push(shortId);
            }
            console.log(`📸 Matched product by name: ${matchedProduct.nome} (${shortId})`);
          } else {
            console.log(`⚠️ Could not match product for caption: ${cleanCaption}`);
          }
        }
      }
    }
    
    if (sentProductIds.length > 0) {
      console.log(`📸 Tracking ${sentProductIds.length} sent products: ${sentProductIds.join(', ')}`);
    }

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
        sent_product_ids: sentProductIds.length > 0 ? sentProductIds : null,
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
  
  // ========== DETECÇÃO DE PERGUNTAS GENÉRICAS REPETIDAS ==========
  const genericQuestionPatterns = [
    /como posso (?:te )?ajudar/i,
    /o que (?:você )?busca/i,
    /está procurando algo/i,
    /quer ver/i,
    /gostaria de conhecer/i,
    /posso mostrar/i,
    /me conta (?:um pouco )?mais/i,
    /qual (?:é |seria )?(?:o )?(?:seu )?ambiente/i,
    /para qual (?:ambiente|espaço|cômodo)/i,
    /quantas pessoas/i,
    /qual (?:o )?tamanho/i,
  ];
  
  const newHasGenericQuestion = genericQuestionPatterns.some(p => p.test(newMessage));
  
  if (newHasGenericQuestion) {
    // Verificar se alguma mensagem anterior já fez pergunta genérica similar
    for (const prev of previousMessages) {
      if (genericQuestionPatterns.some(p => p.test(prev))) {
        console.log(`⚠️ Blocking duplicate generic question pattern`);
        return true;
      }
    }
  }
  
  // ========== VERIFICAÇÃO DE SIMILARIDADE POR PALAVRAS ==========
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

// ========== SEMANTIC QUESTION GROUPS - Perguntas Semanticamente Similares ==========
const QUESTION_SEMANTIC_GROUPS: Record<string, { label: string; patterns: RegExp[] }> = {
  documentacao_tecnica: {
    label: "Documentação técnica (planta/projeto/medidas)",
    patterns: [
      /planta/i, /projeto/i, /medidas/i, /dimensões/i, /dimensoes/i,
      /arquiteto/i, /executivo/i, /metragem/i, /tamanho.*espaço/i,
      /quantos\s*metros/i, /m²/i, /metros\s*quadrados/i
    ]
  },
  ambiente_local: {
    label: "Local/ambiente (onde será instalado)",
    patterns: [
      /ambiente/i, /cômodo/i, /comodo/i, /espaço/i, /espaco/i,
      /sala/i, /quarto/i, /cozinha/i, /varanda/i,
      /onde.*vai/i, /pra\s*(que|qual)\s*lugar/i, /qual.*local/i
    ]
  },
  quantidade_pessoas: {
    label: "Quantidade de pessoas/lugares",
    patterns: [
      /quantas?\s*pessoas/i, /pra\s*quantos/i, /lugares/i,
      /assentos/i, /capacidade/i
    ]
  },
  orcamento_valor: {
    label: "Orçamento/valor",
    patterns: [
      /orçamento/i, /orcamento/i, /quanto.*gastar/i, /valor/i,
      /budget/i, /investir/i, /investimento/i, /faixa\s*de\s*preço/i
    ]
  },
  estilo_preferencia: {
    label: "Estilo/preferência",
    patterns: [
      /estilo/i, /preferência/i, /preferencia/i, /gosta.*de/i,
      /tipo.*de/i, /modelo/i, /cor.*prefer/i
    ]
  },
  prazo_urgencia: {
    label: "Prazo/urgência",
    patterns: [
      /prazo/i, /urgência/i, /urgencia/i, /quando.*precisa/i,
      /pra\s*quando/i, /entrega/i, /data.*limite/i
    ]
  },
  uso_finalidade: {
    label: "Uso/finalidade",
    patterns: [
      /pra\s*que/i, /para\s*que/i, /finalidade/i, /uso/i,
      /vai\s*usar/i, /objetivo/i, /função/i
    ]
  }
};

// ========== EXTRACT ASKED QUESTIONS (Anti-Repetition) - SEMANTIC VERSION ==========
function extractAskedQuestions(history: Message[]): string[] {
  const questions: string[] = [];
  const askedGroups = new Set<string>();
  
  for (const msg of history) {
    if (msg.role === "assistant") {
      const content = msg.content.toLowerCase();
      
      // Detectar grupos semânticos perguntados
      for (const [groupKey, group] of Object.entries(QUESTION_SEMANTIC_GROUPS)) {
        if (group.patterns.some(p => p.test(content))) {
          askedGroups.add(groupKey);
        }
      }
      
      // Extrair perguntas específicas (frases com ?)
      const questionMatches = content.match(/[^.!?]*\?/g) || [];
      for (const q of questionMatches) {
        const trimmed = q.trim();
        if (trimmed.length > 10 && trimmed.length < 200) {
          questions.push(trimmed);
        }
      }
    }
  }
  
  // Adicionar grupos semânticos como perguntas resumidas
  const groupLabels = Array.from(askedGroups).map(key => 
    `[TEMA JÁ PERGUNTADO: ${QUESTION_SEMANTIC_GROUPS[key]?.label || key}]`
  );
  
  return [...groupLabels, ...questions.slice(-5)];
}

// ========== DETECT CONFUSION OR LOOP ==========
interface ConfusionResult {
  isConfused: boolean;
  reason: string | null;
  shouldTransfer: boolean;
}

function detectConfusionOrLoop(history: Message[]): ConfusionResult {
  const userMessages = history.filter(m => m.role === "user");
  const assistantMessages = history.filter(m => m.role === "assistant");
  
  if (userMessages.length < 2) {
    return { isConfused: false, reason: null, shouldTransfer: false };
  }
  
  // 1. Detectar se cliente repete a mesma coisa 2+ vezes
  const recentUserMsgs = userMessages.slice(-5).map(m => m.content.toLowerCase().trim());
  
  for (let i = 0; i < recentUserMsgs.length; i++) {
    const msg = recentUserMsgs[i];
    if (msg.length < 5) continue;
    
    let repeatCount = 0;
    for (let j = 0; j < recentUserMsgs.length; j++) {
      if (i !== j) {
        const other = recentUserMsgs[j];
        // Verifica se mensagens são muito similares
        const similarity = calculateSimilarity(msg, other);
        if (similarity > 0.6) repeatCount++;
      }
    }
    
    if (repeatCount >= 2) {
      console.log(`⚠️ [CONFUSION DETECTOR] Cliente repetiu mesma info ${repeatCount + 1} vezes`);
      return {
        isConfused: true,
        reason: "Cliente repetiu a mesma informação várias vezes sem que a IA entendesse",
        shouldTransfer: true
      };
    }
  }
  
  // 2. Detectar sinais de frustração
  const frustrationPatterns = [
    /já\s+falei/i, /já\s+disse/i, /já\s+respondi/i,
    /não\s+entend/i, /nao\s+entend/i, /o\s+que\s*\?/i,
    /repet/i, /de\s*novo/i, /outra\s*vez/i,
    /robô/i, /robo/i, /humano/i, /atendente/i, /pessoa\s*real/i,
    /falar\s+com\s+alguém/i, /falar\s+com\s+alguem/i,
    /quero\s+(?:um\s+)?humano/i, /tem\s+alguém\s+aí/i,
    /isso\s+é\s+(?:um\s+)?robô/i, /você\s+é\s+(?:um\s+)?robô/i,
    /que\s+merda/i, /que\s+droga/i, /pqp/i, /vtnc/i,
    /socorro/i, /me\s+ajuda/i,
  ];
  
  const lastUserMsg = userMessages.at(-1)?.content || "";
  const secondLastUserMsg = userMessages.at(-2)?.content || "";
  
  // Verificar frustração nas últimas 2 mensagens
  const hasRecentFrustration = [lastUserMsg, secondLastUserMsg].some(msg => 
    frustrationPatterns.some(p => p.test(msg))
  );
  
  if (hasRecentFrustration) {
    console.log(`⚠️ [CONFUSION DETECTOR] Detectada frustração do cliente`);
    return {
      isConfused: true,
      reason: "Cliente demonstrou frustração ou pediu atendente humano",
      shouldTransfer: true
    };
  }
  
  // 3. Conversa longa sem progresso (>15 mensagens sem coleta de dados essenciais)
  if (history.length > 30) {
    // Verificar se IA ainda está fazendo perguntas básicas
    const lastAssistantMsgs = assistantMessages.slice(-3).map(m => m.content.toLowerCase());
    const stillAskingBasics = lastAssistantMsgs.some(msg => 
      /qual.*ambiente/i.test(msg) || 
      /como.*ajudar/i.test(msg) ||
      /o que.*busca/i.test(msg)
    );
    
    if (stillAskingBasics) {
      console.log(`⚠️ [CONFUSION DETECTOR] Conversa longa (${history.length} msgs) sem progresso`);
      return {
        isConfused: true,
        reason: "Conversa muito longa sem progresso - IA ainda fazendo perguntas básicas",
        shouldTransfer: true
      };
    }
  }
  
  return { isConfused: false, reason: null, shouldTransfer: false };
}

// Helper: Calcula similaridade entre duas strings
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let matches = 0;
  for (const word of words1) {
    if (words2.has(word)) matches++;
  }
  
  return matches / Math.max(words1.size, words2.size);
}

// ========== EXTRACT CONVERSATION CONTEXT (Semantic Understanding) ==========
function extractConversationContext(history: Message[]): Record<string, string> {
  const context: Record<string, string> = {};
  
  for (const msg of history) {
    if (msg.role === "user") {
      const content = msg.content.toLowerCase();
      
      // Detectar tipo de ambiente/projeto
      if (/clínica|clinica|consultório|consultorio|escritório|escritorio|loja|comercial|corporativo|empresa/.test(content)) {
        context.tipoAmbiente = "comercial/corporativo";
      } else if (/casa|apartamento|quarto|sala|cozinha|varanda|residência|residencia/.test(content)) {
        context.tipoAmbiente = "residencial";
      }
      
      // Detectar o que cliente quer
      if (/recepção|recepcao|balcão|balcao/.test(content)) {
        context.interesse = "recepção/balcão";
      } else if (/mesa|mesas/.test(content)) {
        context.interesse = "mesas";
      } else if (/sofá|sofa|estofado/.test(content)) {
        context.interesse = "sofás";
      } else if (/cadeira|cadeiras|banqueta/.test(content)) {
        context.interesse = "cadeiras/banquetas";
      } else if (/armário|armario|closet|guarda.?roupa/.test(content)) {
        context.interesse = "armários/closets";
      } else if (/cozinha|cozinhas/.test(content)) {
        context.interesse = "cozinha planejada";
      }
      
      // Detectar tipo de móvel
      if (/planejado|planejada|sob medida|marcenaria|custom/.test(content)) {
        context.tipoMovel = "móveis planejados/sob medida";
      } else if (/pronto|industrial|catálogo|catalogo/.test(content)) {
        context.tipoMovel = "móveis prontos";
      }
      
      // Detectar se cliente é profissional
      if (/arquiteto|arquiteta|designer|decorador|projetista|profissional/.test(content)) {
        context.tipoCliente = "profissional/arquiteto";
      }
      
      // Detectar quantidade de pessoas/lugares
      const lugaresMatch = content.match(/(\d+)\s*(?:lugares?|pessoas?|cadeiras?)/);
      if (lugaresMatch) {
        context.quantidade = `${lugaresMatch[1]} lugares/pessoas`;
      }
      
      // Detectar medidas mencionadas
      const medidasMatch = content.match(/(\d+[,.]?\d*)\s*(?:metros?|m|cm)\s*(?:x|por)\s*(\d+[,.]?\d*)/i);
      if (medidasMatch) {
        context.medidas = `${medidasMatch[1]} x ${medidasMatch[2]}`;
      }
      
      // Detectar orçamento/preço mencionado
      const orcamentoMatch = content.match(/(?:até|até|orçamento\s*(?:de)?)\s*(?:R\$?\s*)?(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/i);
      if (orcamentoMatch) {
        context.orcamento = `até R$ ${orcamentoMatch[1]}`;
      }
    }
  }
  
  return context;
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
      
      // Create new client with simple INSERT (no unique constraint on phone)
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({ 
          name: displayName,
          phone: formattedPhone,
          notes: 'Cliente criado automaticamente via IA WhatsApp'
        })
        .select('id')
        .single();
      
      if (clientError) {
        console.error('❌ Error creating client:', clientError);
        console.error('❌ Client error details:', JSON.stringify(clientError));
        
        // Try to find if it was created by another process (race condition)
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
        console.log(`✅ Created new client: ${displayName} (id: ${clientId})`);
      }
    }
    
    console.log(`📋 CRM Integration Debug: clientId=${clientId}, phone=${formattedPhone.slice(-4)}, name=${displayName}`);

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
        console.log(`✅ [CRM SUCCESS] Updated deal ${existingDeal.id} with ${conversationHistory.length} messages`);
      }
    } else {
      // Use explicit pipeline and stage IDs for "Follow Up (I.A)"
      const VENDAS_PIPELINE_ID = '34747cb5-063a-4369-b619-d4afa6095d0d';
      const FOLLOWUP_IA_STAGE_ID = '5771c6a1-8820-4db4-976f-d263a37543ab';
      
      // Fallback: Get first pipeline and stage if explicit IDs don't exist
      let pipelineId = VENDAS_PIPELINE_ID;
      let stageId = FOLLOWUP_IA_STAGE_ID;
      
      // Verify the pipeline exists, if not use first available
      const { data: pipelineCheck } = await supabase
        .from('crm_pipelines')
        .select('id')
        .eq('id', VENDAS_PIPELINE_ID)
        .maybeSingle();
      
      if (!pipelineCheck) {
        console.log(`⚠️ Default pipeline not found, falling back to first available`);
        const { data: fallbackPipeline } = await supabase
          .from('crm_pipelines')
          .select('id')
          .order('created_at')
          .limit(1)
          .single();
        
        if (!fallbackPipeline) {
          console.error('❌ [CRM ERROR] No pipeline found, cannot create deal');
          await logCRMFailure(supabase, formattedPhone, clientId, leadId, 'No pipeline available');
          return;
        }
        pipelineId = fallbackPipeline.id;
        
        // Get first stage of this pipeline
        const { data: fallbackStage } = await supabase
          .from('crm_stages')
          .select('id')
          .eq('pipeline_id', pipelineId)
          .order('position')
          .limit(1)
          .single();
        
        if (!fallbackStage) {
          console.error('❌ [CRM ERROR] No stage found, cannot create deal');
          await logCRMFailure(supabase, formattedPhone, clientId, leadId, 'No stage available');
          return;
        }
        stageId = fallbackStage.id;
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
      const { data: newDeal, error: dealError } = await supabase
        .from('crm_deals')
        .insert({
          title: dealTitle,
          lead_id: leadId,
          pipeline_id: pipelineId,
          stage_id: stageId,
          from_ai: true,
          conversation_history: fullHistory,
          ai_status: temperature,
          last_interaction: new Date().toISOString(),
          status: 'aberto',
          followup_enabled: true,
          categoria: productInfo.categoria,
          centro_custo: productInfo.centroCusto,
          tipo_produto: productInfo.tipoProduto,
          note: initialNote || null,
        })
        .select('id')
        .single();
      
      if (dealError) {
        console.error('❌ [CRM ERROR] Failed to create deal:', dealError);
        await logCRMFailure(supabase, formattedPhone, clientId, leadId, `Deal creation failed: ${dealError.message}`);
      } else {
        console.log(`✅ [CRM SUCCESS] Created deal ${newDeal.id}: ${dealTitle}`);
      }
    }
  } catch (error) {
    console.error('❌ [CRM ERROR] Exception in CRM integration:', error);
  }
}

// Log CRM integration failures for monitoring
async function logCRMFailure(
  supabase: any,
  phone: string,
  clientId: string | null,
  leadId: string | null,
  errorMessage: string
): Promise<void> {
  try {
    await supabase.from('system_errors').insert({
      source: 'process-ia-message',
      error_type: 'crm_integration_failed',
      message: `CRM integration failed for phone ${phone.slice(-4)}`,
      details: JSON.stringify({ clientId, leadId, phone: phone.slice(-4), error: errorMessage }),
      severity: 'warning'
    });
  } catch (e) {
    console.error('Failed to log CRM error:', e);
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
  conversationHistory: Message[],
  alreadyProvidedInfo: string[] = [],
  askedQuestions: string[] = [],
  conversationContext: Record<string, string> = {}
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

  // Communication values - COMPLETO
  const tamanhoMensagem = (comunicacao.tamanho_mensagem as string) || "media";
  const maxMensagensSequencia = (comunicacao.max_mensagens_sequencia as string) || "2-3";
  const usarEmojis = (comunicacao.usar_emojis as string) || "moderado";
  const estiloDigitacao = (comunicacao.estilo_digitacao as string) || "natural";
  const modoResposta = (comunicacao.modo_resposta as string) || "consultivo";
  const msgBoasVindas = (comunicacao.msg_boas_vindas as string) || "";
  const msgDespedida = (comunicacao.msg_despedida as string) || "";
  // NOVOS CAMPOS DE COMUNICAÇÃO
  const linguagemTecnica = (comunicacao.linguagem_tecnica as string) || "moderado";
  const usarFormatacao = (comunicacao.usar_formatacao as string) || "leve";
  const usarAudios = (comunicacao.usar_audios as boolean) || false;
  const msgAusencia = (comunicacao.msg_ausencia as string) || "";
  const exemplosRespostas = (comunicacao.exemplos_respostas as { pergunta: string; resposta: string }[]) || [];

  // Qualification values - COMPLETO
  const criteriosLead = (qualificacao.criterios_lead as Record<string, string>) || {};
  const perguntasObrigatorias = (qualificacao.perguntas_obrigatorias as string[]) || (qualificacao.perguntas as string[]) || [];
  const perguntasPermitidas = (qualificacao.perguntas_permitidas as string[]) || [];
  const perguntasPorVez = (qualificacao.perguntas_por_vez as string) || "1";
  // NOVOS CAMPOS DE QUALIFICAÇÃO
  const podeFazerPerguntas = (qualificacao.pode_fazer_perguntas as string) || "sim";
  const clienteComPressa = (qualificacao.cliente_com_pressa as string) || "resumir";

  // Sales values - COMPLETO
  const estrategiaLeadQuente = (vendas.estrategia_lead_quente as string) || "";
  const estrategiaLeadMorno = (vendas.estrategia_lead_morno as string) || "";
  const estrategiaLeadFrio = (vendas.estrategia_lead_frio as string) || "";
  const quandoTransferir = (vendas.quando_transferir as string) || "";
  const objecoes = (vendas.objecoes as { objecao: string; resposta: string }[]) || [];
  // NOVOS CAMPOS DE VENDAS
  const objetivosPrincipais = (vendas.objetivos_principais as string[]) || [];
  const conducaoConversa = (vendas.conducao_conversa as string) || "moderado";
  const apresentacaoPrecos = (vendas.apresentacao_precos as string) || "valor_direto";
  const tabelaPrecos = (vendas.tabela_precos as string) || "apenas_resumo";
  const sugestaoPacotes = (vendas.sugestao_pacotes as string) || "sim";
  const clienteOrcamentoBaixo = (vendas.cliente_orcamento_baixo as string) || "explicar_valor";
  const oferecerDesconto = (vendas.oferecer_desconto as string) || "se_configurado";
  const pedidoForaRegra = (vendas.pedido_fora_regra as string) || "chamar_humano";
  const ctasDisponiveis = (vendas.ctas_disponiveis as string[]) || [];
  const perguntasVendas = (vendas.perguntas_vendas as string[]) || [];
  const scriptFollowup = (vendas.script_followup as string) || "";

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

  // ========== CRITICAL: MEDIA CAPABILITY (FIRST!) ==========
  const productsWithMedia = products.filter(p => p.imagem_url || p.galeria?.length || p.video_url || p.videos?.length);
  console.log(`🖼️ Building prompt with ${products.length} products, ${productsWithMedia.length} with media`);
  
  if (productsWithMedia.length > 0) {
    parts.push(`# 📸🎬 CAPACIDADE DE ENVIO DE MÍDIA (MUITO IMPORTANTE!)

⚠️ VOCÊ TEM A CAPACIDADE de enviar fotos e vídeos para o cliente!
⚠️ NUNCA diga "não consigo enviar fotos" - você PODE e DEVE enviar!

## COMO ENVIAR MÍDIA:
Basta incluir o marcador na sua resposta:
- FOTO: [FOTO_PRODUTO:url_da_foto:nome_produto]
- VÍDEO: [VIDEO_PRODUTO:url_do_video:nome_produto]

## EXEMPLOS PRÁTICOS:

Cliente: "Quero ver mesas"
Você: "Olha esse modelo que é perfeito! [FOTO_PRODUTO:https://storage.url/mesa.jpg:Mesa 8 lugares]"

Cliente: "Tem poltrona?"  
Você: "Temos sim! Essa aqui é muito procurada: [FOTO_PRODUTO:https://storage.url/poltrona.jpg:Poltrona Pata de Elefante]"

Cliente: "Me mostra uma foto"
Você: "Claro! [FOTO_PRODUTO:https://storage.url/produto.jpg:Nome do Produto]"

## QUANDO CLIENTE PEDIR MAIS FOTOS:
⚠️ **CUIDADO COM PRODUTOS DE NOME SIMILAR!**

### ANTES de enviar mais fotos, VERIFIQUE:
1. Qual foi o ÚLTIMO produto que VOCÊ mostrou? (olhe a foto/URL que você enviou na conversa)
2. Use o NOME COMPLETO do produto (ex: "Mesa cascata para 10 lugares", NÃO só "cascata")
3. Busque a galeria EXATAMENTE desse produto no catálogo

### PRODUTOS COM NOMES SIMILARES:
- A empresa pode ter vários produtos com nomes parecidos (ex: "Mesa cascata 10 lugares" vs "Mesa cascata 12 lugares")
- NUNCA assuma qual produto o cliente quer - verifique a sua ÚLTIMA mensagem
- Se tiver dúvida, PERGUNTE: "Você quer mais fotos da [nome completo do produto]?"

### COMO IDENTIFICAR O PRODUTO CERTO:
1. Olhe a URL/marcador [FOTO_PRODUTO:...] que você enviou ANTERIORMENTE
2. Procure no catálogo o produto com ESSE MESMO NOME E ID
3. Envie as fotos da galeria DESSE produto específico (mesmo ID)

### REGRA DE OURO:
- Verifique o ID entre colchetes [ID:...] do produto que você mostrou
- Envie as fotos adicionais do produto COM O MESMO ID
- Se não tiver mais fotos, diga "Dessa mesa tenho apenas essa imagem principal"
- NUNCA diga "não consigo enviar" - diga que essa é a foto disponível

## QUANDO CLIENTE PEDIR OUTRAS OPÇÕES:
- Procure outros produtos da mesma categoria
- Você tem acesso a TODOS os ${products.length} produtos cadastrados
- Mostre alternativas similares se existirem

## REGRA OBRIGATÓRIA:
- SEMPRE que recomendar um produto que tem foto/vídeo, INCLUA o marcador!
- Os marcadores são processados automaticamente e a mídia é enviada junto com sua mensagem
- Você tem ${productsWithMedia.length} produtos com mídia disponível para mostrar!
`);
  }

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
- **Empatia** – ${nivelEmpatia === 'alto' ? 'Demonstre alta empatia, conecte-se emocionalmente com o cliente' : nivelEmpatia === 'baixo' ? 'Seja objetivo e direto, menos emocional' : 'Equilibre objetividade com compreensão'}
- **Clareza** – responde de forma curta, direta e sem redundâncias
- **Naturalidade** – escreve como um humano digitando no WhatsApp, com pausas leves e pontuação correta
- **Coerência contextual** – nunca repete perguntas já respondidas; mantém memória de toda a conversa

${nivelFormalidade === 'formal' ? '**Comunicação:** Mantenha comunicação formal e profissional em todas as interações.' : nivelFormalidade === 'casual' ? '**Comunicação:** Seja descontraído e informal, como se conversasse com um amigo.' : '**Comunicação:** Equilibre profissionalismo com cordialidade.'}

${abordagemVendas === 'educativo' ? '**Abordagem de Vendas:** Sua abordagem é educativa - ensine enquanto vende, explique benefícios.' : abordagemVendas === 'agressivo' ? '**Abordagem de Vendas:** Seja proativo e direto nas tentativas de venda, crie urgência.' : '**Abordagem de Vendas:** Conduza a venda de forma consultiva, entenda necessidades primeiro.'}

Você ${personalidadeDescricao[personalidadePrincipal] || personalidadeDescricao.consultivo}.
Tom emocional: ${tomEmocional}.
${descricaoPersonalidade ? `\nInstruções adicionais: ${descricaoPersonalidade}` : ""}
`);

  // ========== PORTFÓLIO COMPLETO DA EMPRESA ==========
  const categoriasComFoto = [...new Set(products.map(p => p.categoria).filter(Boolean))];
  
  parts.push(`# 🏭 PORTFÓLIO COMPLETO DA EMPRESA

A ${nomeEmpresa} trabalha com TODAS as seguintes categorias:

## PRODUTOS COM CATÁLOGO (fotos disponíveis):
${categoriasComFoto.length > 0 ? categoriasComFoto.map(cat => `- ${cat}`).join('\n') : '- Nenhum produto cadastrado'}
Produtos cadastrados: ${products.map(p => p.nome).join(', ')}

## SERVIÇOS E PRODUTOS SOB MEDIDA (móveis planejados):
- **Guarda-roupas**: Sob medida, closets, armários
- **Cozinhas Planejadas**: Completas, com ou sem eletros
- **Home Office**: Mesas, estantes, nichos
- **Estantes e Racks**: TV, livros, decoração
- **Quadros Decorativos**: Canvas 100% algodão, até 1,40m x 6m
- **Estantes Industriais**: Aço e madeira sob medida
- **Painéis**: Ripados, decorativos, divisórias

⚠️ REGRA CRÍTICA:
- Se o cliente perguntar sobre QUALQUER item acima, você DEVE atender normalmente
- Mesmo sem foto cadastrada, conduza a conversa de forma consultiva
- NUNCA diga "não trabalhamos com isso" se está no portfólio
`);

  // ========== ATENDIMENTO COMPLETO PARA MÓVEIS PLANEJADOS ==========
  parts.push(`# 📐 ATENDIMENTO COMPLETO PARA MÓVEIS PLANEJADOS

## O que é Móvel Planejado na ${nomeEmpresa}?

Móveis desenvolvidos sob medida para o espaço do cliente, com:
- Projeto 3D personalizado
- Produção industrial de alta precisão
- Colagem com tecnologia PUR (superior)
- Montagem profissional organizada

## Produtos Planejados que Oferecemos:

### 1. Cozinhas Planejadas
- Armários superiores e inferiores
- Balcões e ilhas
- Nichos e prateleiras
- Portas em diversos acabamentos

### 2. Guarda-Roupas e Closets
- Estrutura interna personalizada
- Gavetas, prateleiras, cabideiros
- Espelho, iluminação LED
- Portas de correr ou abrir

### 3. Home Office
- Escrivaninhas sob medida
- Estantes para livros
- Gaveteiros e organizadores
- Painéis para equipamentos

### 4. Salas e Living
- Racks para TV
- Painéis ripados
- Estantes modulares
- Aparadores

### 5. Áreas de Serviço
- Armários para lavanderia
- Nichos organizadores

## FLUXO DE ATENDIMENTO PARA PLANEJADOS:

### Perguntas Obrigatórias (faça uma por vez):
1. "Qual ambiente você quer mobiliar?" (cozinha, quarto, sala, etc.)
2. "Você já tem as medidas do espaço?"
3. "Tem projeto de arquiteto ou precisa que desenvolvamos?"
4. "Qual é a previsão de quando precisa estar pronto?"

### Próximos Passos:

**Se cliente TEM medidas:**
→ "Perfeito! Com as medidas podemos desenvolver um projeto 3D. Você pode me enviar?"

**Se cliente NÃO TEM medidas:**
→ "Podemos agendar uma visita técnica gratuita para tirar as medidas. Qual dia funciona?"

**Se cliente TEM projeto:**
→ "Ótimo! Você pode me enviar o projeto que analisamos e passamos um orçamento?"

### Preços de Referência (metro linear):
- Cozinhas: A partir de R$ 1.200/metro linear
- Guarda-roupas: A partir de R$ 800/metro linear
- Home office: A partir de R$ 600/metro linear
**Valores variam conforme acabamentos e complexidade**

### ⚠️ SEM FOTOS DE PLANEJADOS NO SISTEMA:
Quando cliente pedir fotos de planejados:
"Temos vários projetos executados! Posso te passar para um atendente mostrar nosso portfólio ou você pode enviar as medidas para desenvolvermos um projeto exclusivo."

NUNCA DIGA:
- "Não temos guarda-roupa cadastrado"
- "Só trabalhamos com mesas"
- "Não encontrei esse produto"
- "Não tenho fotos disso"
`);

  // ========== ATENDIMENTO COMPLETO PARA QUADROS DECORATIVOS ==========
  parts.push(`# 🖼️ ATENDIMENTO PARA QUADROS DECORATIVOS

## Sobre Quadros na ${nomeEmpresa}:

### Tecnologia e Qualidade:
- **Impressão HP Látex**: Tinta ecológica, sem odor
- **Canvas 100% algodão**: Durabilidade 200+ anos
- **Acrílico no lugar de vidro**: Mais seguro e leve

### Formatos Disponíveis:
- **Borda Infinita**: Canvas esticado sobre chassi
- **Com Moldura**: Preto, dourado ou prata
- **Proteção em Acrílico**: Alternativa ao vidro

### Tamanhos:
- 12 medidas padrão disponíveis
- Quadros gigantes: até 1,40m x 6m
- **Tamanhos personalizados sob consulta**

## FLUXO DE ATENDIMENTO PARA QUADROS:

### 1. Quando cliente perguntar sobre quadros:
- Pergunte se quer quadro com imagem própria ou do catálogo
- Pergunte o tamanho aproximado desejado
- Pergunte se prefere com moldura ou borda infinita

### 2. Se cliente enviar imagem:
- Informe que é possível imprimir
- Pergunte o tamanho desejado
- Explique os formatos (moldura, borda infinita)

### 3. Se cliente pedir catálogo:
- Informe que temos várias opções de artes
- Pergunte o estilo preferido (abstrato, paisagem, etc.)
- Encaminhe para atendente mostrar opções

### Preços Base (referência):
- Quadros até 60cm: A partir de R$ 150
- Quadros até 1m: A partir de R$ 300
- Quadros acima de 1m: Sob consulta
- Com moldura: +30-50% do valor base

### ⚠️ SEM FOTOS DE QUADROS CADASTRADAS:
Quando cliente pedir foto de quadros:
"Temos um catálogo com várias opções de artes! Posso te passar para um atendente mostrar as opções ou você pode me enviar uma imagem que deseja imprimir."
`);

  // ========== PRODUTOS PERSONALIZÁVEIS VS CATÁLOGO (EXPANDIDO) ==========
  parts.push(`# 🎨 PERSONALIZAÇÃO: O QUE PODE SER FEITO SOB MEDIDA

## TODOS os produtos podem ser adaptados:

### Mesas de Madeira:
- ✅ Tamanho personalizado (qualquer medida)
- ✅ Tipo de madeira (pequiá, jatobá, tamboril, etc.)
- ✅ Acabamento (PU vitrificado ou óleo natural)
- ✅ Cor/modelo dos pés metálicos
- ✅ Formato (retangular, oval, orgânico)

### Móveis em Corda Náutica:
- ✅ Cor da estrutura (pintura eletrostática)
- ✅ Cor da corda náutica
- ✅ Cor do tecido Aquablock

### Quadros:
- ✅ Tamanho personalizado (até 1,40m x 6m)
- ✅ Imagem própria do cliente
- ✅ Tipo de moldura/acabamento

### Planejados:
- ✅ 100% sob medida por definição
- ✅ Acabamentos diversos
- ✅ Ferragens premium opcionais

## QUANDO MENCIONAR PERSONALIZAÇÃO:

1. **Cliente gostou de um modelo mas precisa de tamanho diferente:**
   → "Esse modelo pode ser feito em outras medidas! Qual seria o tamanho ideal?"

2. **Cliente quer algo específico que não está no catálogo:**
   → "Podemos desenvolver algo exclusivo pra você! Me conta mais o que você imagina?"

3. **Cliente menciona projeto de arquiteto:**
   → "Trabalhamos muito com projetos de arquitetos! Pode me enviar que analisamos?"

## PRAZOS DE PRODUÇÃO (referência):
- Produtos do catálogo: 15-30 dias
- Mesas personalizadas: 30-45 dias
- Móveis planejados: 45-60 dias
- Quadros personalizados: 7-15 dias
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

  // ========== CRITICAL RULES - TOP PRIORITY ==========
  const limiteCharsTop = Number(comunicacao.limite_caracteres) || 300;
  const usarEmojisTop = comunicacao.usar_emojis || "moderado";
  
  parts.push(`# ⚠️ REGRAS CRÍTICAS - PRIORIDADE MÁXIMA

VOCÊ DEVE SEGUIR ESTAS REGRAS ABSOLUTAS EM TODA MENSAGEM:

1. LIMITE: Máximo ${limiteCharsTop} caracteres por mensagem (NUNCA exceder!)
2. EMOJIS: ${usarEmojisTop === 'nao' ? 'PROIBIDO usar qualquer emoji - ZERO emojis' : 'Permitido com moderação'}
3. FORMATO: Máximo 2 frases curtas por mensagem
4. PRODUTOS: 1 produto por mensagem apenas

## ⚠️ PROIBIDO - FORMATAÇÃO
- NUNCA use asteriscos para formatação (*texto* ou **texto**)
- NUNCA use listas numeradas (1. 2. 3.)
- NUNCA liste múltiplos produtos ANTES de mostrar fotos
- Escreva texto NORMAL, sem marcadores especiais

## ✅ FORMATO OBRIGATÓRIO (Foto + Info JUNTOS):
CADA produto = 1 mensagem com foto + informações JUNTAS

CORRETO (foto + info juntos):
"[FOTO_PRODUTO:url:Mesa Cascata (ID:abc123)]
Mesa Cascata (3,25m x 0,90m) - R$ 14.900
Acabamento em óleo mineral"

ERRADO (texto listando tudo, fotos depois - PROIBIDO!):
"1. *Mesa Cascata* (3,25m) - R$ 14.900
2. *Mesa Madeira* (3,50m) - R$ 5.900
[FOTO_PRODUTO:url1:Mesa Cascata]
[FOTO_PRODUTO:url2:Mesa Madeira]"

VIOLAÇÃO DESSAS REGRAS = RESPOSTA INVÁLIDA
`);

  // ========== REGRA CRÍTICA: NUNCA REPITA INFORMAÇÕES ==========
  parts.push(`# 🔄 REGRA CRÍTICA: NUNCA REPITA INFORMAÇÕES

## ⚠️ LEIA COM ATENÇÃO - VIOLAÇÕES FREQUENTES

Você está conectado ao histórico COMPLETO da conversa. Use-o para:
1. NUNCA repetir algo que você já disse
2. NUNCA recapitular antes de mudar de assunto
3. Responder APENAS a nova pergunta

## ❌ ERROS GRAVES (PROIBIDO):

### ERRO 1: Repetir Preço Já Dito
❌ Cliente: "E o pé de que é feito?"
❌ IA: "O valor dela é R$ 3.900. Os pés são de aço carbono..."
→ O preço JÁ FOI DITO antes! Não repita!

✅ CORRETO:
✅ IA: "Os pés são de aço carbono com pintura eletrostática, super durável!"

### ERRO 2: Recapitular Assunto Anterior Quando Muda de Tema
❌ Cliente: "Mudando de assunto, vocês fazem planejados?"
❌ IA: "Os pés são de aço carbono... E sim, fazemos planejados!"
→ Cliente MUDOU de assunto! Não volte ao pé!

✅ CORRETO:
✅ IA: "Sim, fazemos planejados sob medida! Qual ambiente você está pensando?"

### ERRO 3: Listar Tudo de Novo Sem Necessidade
❌ Cliente: "Qual o prazo?"
❌ IA: "A mesa tem 2m, preço R$ 3.900, pés em aço... E o prazo é 30 dias."
→ Não repita tamanho e preço! Responda só o prazo!

✅ CORRETO:
✅ IA: "Prazo de produção é de 30 dias úteis."

## 📋 ANTES DE RESPONDER, VERIFIQUE:

1. "Essa informação já foi dada nesta conversa?" → Se SIM, não repita
2. "O cliente MUDOU de assunto?" → Se SIM, NÃO recapitule o anterior
3. "Estou respondendo APENAS o que foi perguntado?" → Deve ser SIM

## 🎯 REGRA DE OURO:

**CADA MENSAGEM = RESPOSTA NOVA E ÚNICA**

Se você já disse algo antes, NÃO precisa dizer de novo. O cliente lembra.
`);

  // ========== INFORMAÇÕES JÁ FORNECIDAS (Anti-Repetição Dinâmica) ==========
  if (alreadyProvidedInfo.length > 0) {
    parts.push(`# ⚠️ INFORMAÇÕES JÁ FORNECIDAS NESTA CONVERSA:
${alreadyProvidedInfo.map(info => `- ${info}`).join('\n')}

**NÃO REPITA** nenhuma dessas informações! O cliente já as recebeu.
Responda apenas o que for NOVO na pergunta atual.
`);
  }

  // ========== REGRA DE OURO: NUNCA ASSUMA O PRODUTO ==========
  parts.push(`# 🎯 REGRA DE OURO: NUNCA ASSUMA O PRODUTO

## ⚠️ Esta é a regra MAIS IMPORTANTE do atendimento!

Quando o cliente pedir um produto de forma genérica ou existirem MÚLTIPLAS opções:

1. **NUNCA escolha arbitrariamente** - SEMPRE pergunte qual prefere
2. **NUNCA envie foto sem confirmar** - primeiro liste as opções
3. **Mostre as diferenças claras** - tamanho, medidas, preço, material
4. **Use os IDs** para rastrear depois qual foi mostrado

## Exemplos de Comportamento CORRETO:

### Cliente: "Quero ver mesa pra 10 lugares"
✅ CORRETO:
"Temos algumas opções de mesa para 10 lugares com diferenças importantes:

📐 **Mesa Cascata** (3,25m x 0,90m) - R$ 14.900
   Design cascata, acabamento premium

📐 **Mesa Madeira Maciça** (3,50m x 0,90m) - R$ 5.900
   Excelente custo-benefício

Qual dessas te interessa mais pra eu mostrar fotos?"

❌ ERRADO:
"[FOTO_PRODUTO:...]" (enviar foto direto sem perguntar)

### Cliente: "Quero ver mesa cascata"
✅ CORRETO:
"Temos a mesa cascata em diferentes tamanhos:
- Para 10 lugares (3,25m) - R$ 14.900
- Para 12 lugares (3,50m) - R$ 15.900
Qual te interessa mais?"

❌ ERRADO:
"[FOTO_PRODUTO:url:Mesa cascata 10 lugares]" 
→ Não perguntou qual tamanho/versão!

### Cliente: "Quero uma mesa grande"
✅ CORRETO:
"Mesa grande pra quantas pessoas aproximadamente? 8, 10, 12?"

❌ ERRADO:
"Tenho essa mesa aqui [FOTO_PRODUTO:...]"

## Quando SEMPRE Desambiguar:
- Produtos com nomes parecidos (cascata 10 vs cascata 12)
- Produtos com mesmo nome mas medidas diferentes
- Quando cliente usa termo genérico ("quero mesa grande", "quero ver banco")
- Quando existem 2+ produtos na mesma categoria

## Como Desambiguar Corretamente:
1. Liste as opções disponíveis (máximo 3)
2. Destaque a DIFERENÇA PRINCIPAL (tamanho, preço, material)
3. Pergunte qual o cliente prefere
4. ESPERE a resposta
5. SÓ DEPOIS de responder, envie a foto do produto escolhido
`);

  // ========== REGRA OBRIGATÓRIA: "MAIS FOTO" ==========
  parts.push(`# 📸 REGRA OBRIGATÓRIA: PEDIDO DE "MAIS FOTO"

## QUANDO O CLIENTE DISSER:
- "mais foto", "outra imagem", "tem mais foto?", "mostra mais", "outras fotos"
- "tem outro ângulo?", "quero ver mais", "deixa eu ver mais"
- Qualquer variação pedindo mais imagens do produto

## ⚠️ REGRA CRÍTICA: MENSAGENS CITADAS (Reply/Quote)

Quando o cliente MARCAR/RESPONDER a uma mensagem específica pedindo "mais foto":

1. O sistema vai informar: "[📎 MENSAGEM CITADA: O cliente está RESPONDENDO a esta mensagem específica: ...]"
2. Você DEVE identificar o produto mencionado NESSA MENSAGEM CITADA
3. Envie fotos da galeria DESSE PRODUTO ESPECÍFICO, NÃO do último enviado!

**Exemplo:**
[📎 MENSAGEM CITADA: O cliente está RESPONDENDO a esta mensagem específica: "Mesa Madeira Maciça (2.2m x 1.1m) - R$ 3.900"]
Cliente: "mais foto"

→ Você DEVE enviar fotos da "Mesa Madeira Maciça", NÃO do último produto mostrado!

## O QUE VOCÊ DEVE FAZER:

### PASSO 1: Identificar o Produto
- SE houver mensagem citada: use o produto DA MENSAGEM CITADA
- SE NÃO houver: consulte a seção "ÚLTIMO(S) PRODUTO(S) ENVIADO(S)"

### PASSO 2: Buscar Fotos na Galeria
- Use as fotos da GALERIA do mesmo produto (mesmo ID!)
- O catálogo mostra a galeria de cada produto
- Envie 1-2 fotos da galeria por vez

### PASSO 3: Enviar as Fotos
- Use o marcador EXATO: [FOTO_PRODUTO:url_da_galeria:Nome do Produto (ID:xxx)]
- SEMPRE mantenha o mesmo ID do produto original!

### PASSO 4: Se Não Tiver Galeria
Se o produto só tem foto principal:
"Dessa peça específica tenho apenas essa imagem. Quer que eu mostre outras opções parecidas?"

## ❌ PROIBIDO:
- Enviar foto de OUTRO produto sem perguntar
- Ignorar a mensagem citada e enviar foto do último produto
- Dizer "não consigo enviar mais fotos" ou "não tenho acesso"
- Ignorar o pedido do cliente
- Enviar a MESMA foto principal novamente

## ✅ EXEMPLO CORRETO (sem mensagem citada):
Cliente: "mais foto"
IA: "Olha mais um ângulo dessa mesa!
[FOTO_PRODUTO:url_galeria1:Mesa Cascata (ID:df53cf12)]
Mostrando o detalhe da madeira"

## ✅ EXEMPLO CORRETO (COM mensagem citada):
[📎 MENSAGEM CITADA: Mesa Pequiá (2.5m x 1m) - R$ 4.900]
Cliente: "mais foto dessa"
IA: "Claro! Mais fotos da Mesa Pequiá:
[FOTO_PRODUTO:url_galeria:Mesa Pequiá (ID:abc123)]
Detalhe do acabamento"
`);

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
  
  // EMOJI INSTRUCTION - MUITO MAIS RÍGIDA
  let emojiInstrucao = "";
  if (usarEmojis === "nao") {
    emojiInstrucao = "⚠️ REGRA ABSOLUTA: NUNCA use emojis. Nenhum. Zero. Nada de 😊 👍 🪵 💰 ou qualquer outro. PROIBIDO!";
  } else if (usarEmojis === "minimo") {
    emojiInstrucao = "Use emojis MUITO raramente - máximo 1 por conversa inteira";
  } else if (usarEmojis === "moderado") {
    emojiInstrucao = "Use emojis sutis e pontuais apenas quando fizer sentido";
  } else {
    emojiInstrucao = "Use emojis com frequência para dar leveza";
  }

  // LIMITE DE CARACTERES - INSTRUÇÃO CRÍTICA
  const limiteChars = Number(comunicacao.limite_caracteres) || 300;
  const limiteInstrucao = limiteChars <= 200 
    ? `⚠️ LIMITE ABSOLUTO: MÁXIMO ${limiteChars} CARACTERES POR MENSAGEM!
- CADA mensagem deve ter NO MÁXIMO ${limiteChars} caracteres
- NO MÁXIMO 2 frases curtas por mensagem
- ZERO parágrafos longos
- Se precisar falar mais, PARE e espere o cliente responder`
    : `Mensagens com no máximo ${limiteChars} caracteres`;

  parts.push(`# 💬 ESTILO DE COMUNICAÇÃO

${limiteInstrucao}

${emojiInstrucao}

## ⚠️ REGRAS OBRIGATÓRIAS DE FORMATO

1. **BREVIDADE ABSOLUTA:** Cada mensagem tem NO MÁXIMO ${maxFrases} frases curtas
2. **SEM TEXTOS LONGOS:** Proibido enviar parágrafos extensos ou explicações longas
3. **DIRETO AO PONTO:** Vá direto ao assunto, sem enrolação
4. **UMA COISA POR VEZ:** Apresente 1 produto por mensagem, espere resposta
5. **NUNCA USE ASTERISCOS:** Proibido *texto* ou **texto** - fica parecendo bot!
6. **NUNCA USE LISTAS NUMERADAS:** Proibido 1. 2. 3. - escreva texto corrido

## Exemplos de Formato CORRETO (${limiteChars} chars):
"[FOTO_PRODUTO:url:Mesa Cascata (ID:xxx)]
Mesa Cascata (3,25m x 0,90m) - R$ 14.900
Acabamento premium. Gostou?"

## Exemplos de Formato ERRADO (PROIBIDO):
"1. *Mesa Cascata* (3,25m) - R$ 14.900
   * Acabamento premium
2. *Mesa Madeira* (3,50m) - R$ 5.900
[FOTO_PRODUTO:url1:Mesa Cascata]"

## Linguagem Técnica:
${linguagemTecnica === 'evitar' ? 'EVITE termos técnicos, use analogias simples e palavras do dia-a-dia' : linguagemTecnica === 'especialista' ? 'Use terminologia profissional e técnica, mostre expertise' : 'Use termos técnicos quando necessário, sempre explicando de forma simples'}

## Formatação de Texto:
${usarFormatacao === 'nao' ? 'Texto corrido apenas, sem formatação especial' : usarFormatacao === 'rico' ? 'Use organização visual para facilitar leitura (SEM asteriscos!)' : 'Formatação leve (SEM asteriscos!) para destaques'}

${usarAudios ? '## 🎙️ Áudios:\n- Você pode sugerir envio de áudio quando apropriado para explicações complexas' : ''}

${msgAusencia ? `## 💤 Mensagem de Ausência:\nSe precisar informar ausência fora do horário: "${msgAusencia}"` : ''}

## Fazer Perguntas:
${podeFazerPerguntas === 'nao' ? '⚠️ NÃO faça perguntas ao cliente, apenas responda o que for perguntado' : podeFazerPerguntas === 'minimo' ? 'Faça perguntas apenas quando ABSOLUTAMENTE essencial para prosseguir' : 'Faça perguntas de qualificação para entender melhor o cliente'}

## Cliente com Pressa:
${clienteComPressa === 'resumir' ? 'Se o cliente demonstrar pressa (mensagens curtas, "rápido"), seja mais direto e objetivo' : clienteComPressa === 'normal' ? 'Mantenha o fluxo normal mesmo se cliente parecer apressado' : 'Acelere e vá direto ao ponto com clientes apressados'}

${exemplosRespostas.length > 0 ? `## 📝 Exemplos de Respostas (aprenda o estilo):\n${exemplosRespostas.map(e => `**Cliente:** "${e.pergunta}"\n**Responder assim:** "${e.resposta}"`).join('\n\n')}` : ''}

## Princípios de Comunicação

**Naturalidade:** Escreva como pessoa real no WhatsApp, não como robô.

**Pontuação:** Use apenas um sinal por frase. NUNCA misture ".,", ",?" ou ",!".

**Uma pergunta por vez:**
${perguntasPorVez === "1" ? "Faça apenas UMA pergunta por mensagem." : perguntasPorVez === "2" ? "Máximo 2 perguntas relacionadas." : "Evite parecer interrogatório."}

**Memória:** ${conversationHistory.length > 0 ? `Você tem ${conversationHistory.length} mensagens de histórico. LEMBRE-SE de tudo.` : ""} Nunca repita perguntas.

**Tom:** Transmita ${tomEmocional === "confiante" ? "segurança" : tomEmocional === "acolhedor" ? "calor" : tomEmocional === "entusiasmado" ? "energia positiva" : "profissionalismo"}.

${msgBoasVindas ? `**Saudação (APENAS no primeiro contato):** ${msgBoasVindas}` : ""}
${msgDespedida ? `**Despedida:** ${msgDespedida}` : ""}
`);

  // ========== CONDUCT RULES (CORRIGIDO) ==========
  // Usar os campos CORRETOS do cadastro
  const nuncaFazerArray = (comportamento.nunca_fazer as string[]) || [];
  const sempreFazerArray = (comportamento.sempre_fazer as string[]) || [];
  const limites = (comportamento.limites as string) || "";
  const clientesDificeis = (comportamento.clientes_dificeis as string) || "";
  const nivelInsistencia = (comportamento.nivel_insistencia as string) || "moderado";

  parts.push(`# 🔒 REGRAS DE CONDUTA

## Nível de Insistência: ${nivelInsistencia === 'alto' ? 'ALTO - Seja persistente (5+ tentativas de converter)' : nivelInsistencia === 'baixo' ? 'BAIXO - Aceite objeções rapidamente (1-2 tentativas)' : 'MODERADO - Equilibrado (3-4 tentativas)'}

## 🚫 NUNCA FAÇA:
- Enviar fotos, catálogos, links ou valores sem que o sistema inclua os marcadores
- Usar frases como: "Posso te mandar um catálogo?", "Segue o preço", "Posso te mostrar fotos?"
- Prometer prazos, descontos ou orçamentos automáticos
- Falar sobre produtos ou medidas que o cliente não mencionou
- Mencionar LARGURA da mesa — fale sempre em COMPRIMENTO
- ⚠️ REPETIR qualquer informação que você já disse nesta conversa (preço, material, tamanho, prazo)
- ⚠️ RECAPITULAR o assunto anterior quando cliente muda de tema
- ⚠️ Começar resposta com informação que já foi dada antes
- Repetir perguntas já respondidas
- Começar duas respostas da mesma forma
- Usar expressões genéricas como "Entendi!", "Certo!", "Perfeito!" no início de toda resposta
${nuncaFazerArray.length > 0 ? nuncaFazerArray.map(item => `- ${item}`).join('\n') : ""}

## ✅ SEMPRE FAÇA:
- Perguntas de qualificação para entender o cliente de forma consultiva
- Esclareça dúvidas com empatia, sem parecer apressado
- Use o que o cliente disse para avançar o diálogo, mostrando atenção genuína
- Varie SEMPRE suas palavras — use sinônimos e estruturas diferentes
- Cada resposta deve ser ÚNICA e diferente das anteriores
${sempreFazerArray.length > 0 ? sempreFazerArray.map(item => `- ${item}`).join('\n') : ""}

${limites ? `## 💰 Limites de Negociação:\n${limites}` : ""}

${clientesDificeis ? `## 😤 Como Lidar com Clientes Difíceis:\n${clientesDificeis}` : ""}
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

  // ========== ESTRATÉGIA DE VENDAS COMPLETA ==========
  if (objetivosPrincipais.length > 0 || conducaoConversa || apresentacaoPrecos || ctasDisponiveis.length > 0 || perguntasVendas.length > 0) {
    let estrategiaSection = `# 🎯 ESTRATÉGIA DE VENDAS\n`;
    
    if (objetivosPrincipais.length > 0) {
      estrategiaSection += `\n## Objetivos do Atendimento:\n${objetivosPrincipais.map(o => `- ${o}`).join('\n')}\n`;
    }
    
    estrategiaSection += `\n## Condução da Conversa: ${conducaoConversa === 'sutil' ? 'SUTIL - Avance de forma natural sem pressionar' : conducaoConversa === 'sempre_fechar' ? 'AGRESSIVO - Sempre tente fechar a venda' : 'MODERADO - Equilibre informação e venda'}\n`;
    
    estrategiaSection += `\n## Como Apresentar Preços:\n${apresentacaoPrecos === 'valor_direto' ? '- Informe o preço objetivamente quando perguntado' : apresentacaoPrecos === 'valor_beneficios' ? '- Apresente o preço junto com os benefícios do produto' : '- Contextualize a qualidade e valor antes de informar o preço'}\n`;
    
    estrategiaSection += `\n## Tabela de Preços:\n${tabelaPrecos === 'nunca_enviar' ? '- NUNCA envie tabela de preços completa' : tabelaPrecos === 'tabela_completa' ? '- Pode enviar tabela completa se solicitado' : '- Envie apenas resumo simplificado dos preços'}\n`;
    
    estrategiaSection += `\n## Sugestão de Pacotes:\n${sugestaoPacotes === 'sim' ? '- Sugira pacotes e combos proativamente para aumentar ticket' : sugestaoPacotes === 'nao' ? '- NÃO sugira pacotes a menos que cliente peça' : '- Sugira pacotes apenas se o cliente demonstrar interesse'}\n`;
    
    estrategiaSection += `\n## Cliente com Orçamento Baixo:\n${clienteOrcamentoBaixo === 'explicar_valor' ? '- Explique o valor e justifique o preço com qualidade e benefícios' : clienteOrcamentoBaixo === 'alternativa_barata' ? '- Sugira alternativas mais acessíveis' : '- Encaminhe para atendente humano para negociação'}\n`;
    
    estrategiaSection += `\n## Descontos:\n${oferecerDesconto === 'nunca' ? '- NUNCA ofereça descontos por conta própria' : oferecerDesconto === 'com_aprovacao' ? '- Só ofereça descontos com aprovação prévia' : '- Use apenas ofertas e descontos pré-configurados'}\n`;
    
    estrategiaSection += `\n## Pedido Fora da Regra:\n${pedidoForaRegra === 'negar_educadamente' ? '- Recuse gentilmente pedidos fora do padrão' : pedidoForaRegra === 'explicar_politica' ? '- Explique a política de preços da empresa' : '- Encaminhe para análise humana'}\n`;
    
    if (ctasDisponiveis.length > 0) {
      estrategiaSection += `\n## CTAs Disponíveis (use para direcionar):\n${ctasDisponiveis.map(c => `- "${c}"`).join('\n')}\n`;
    }
    
    if (perguntasVendas.length > 0) {
      estrategiaSection += `\n## Perguntas de Vendas (faça quando apropriado):\n${perguntasVendas.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n`;
    }
    
    if (scriptFollowup) {
      estrategiaSection += `\n## Script de Follow-up:\n${scriptFollowup}\n`;
    }
    
    parts.push(estrategiaSection);
  }

  // ========== TÉCNICAS DE VENDAS E NEGOCIAÇÃO ==========
  const tecnicasVendas = (vendas.tecnicas as string) || "";
  const promocoes = (vendas.promocoes as string) || "";
  const objecoesTexto = (vendas.objecoes_texto as string) || "";
  const gatilhosUrgencia = (vendas.gatilhos_urgencia as string[]) || [];
  const linksDirecionamento = (vendas.links_direcionamento as { nome: string; url: string }[]) || [];

  if (tecnicasVendas || promocoes || objecoesTexto || gatilhosUrgencia.length > 0 || linksDirecionamento.length > 0) {
    let vendasSection = `# 💼 TÉCNICAS DE VENDAS E NEGOCIAÇÃO\n`;
    
    if (tecnicasVendas) {
      vendasSection += `\n## Técnicas de Fechamento:\n${tecnicasVendas}\n`;
    }
    
    if (promocoes) {
      vendasSection += `\n## 🏷️ Promoções Ativas:\n${promocoes}\n`;
    }
    
    if (objecoesTexto) {
      vendasSection += `\n## Tratamento Geral de Objeções:\n${objecoesTexto}\n`;
    }
    
    if (gatilhosUrgencia.length > 0) {
      vendasSection += `\n## ⚡ Gatilhos de Urgência (use para acelerar decisão):\n${gatilhosUrgencia.map(g => `- ${g}`).join('\n')}\n`;
    }
    
    if (linksDirecionamento.length > 0) {
      vendasSection += `\n## 🔗 Links para Direcionamento:\n${linksDirecionamento.map(l => `- **${l.nome}:** ${l.url}`).join('\n')}\n`;
    }
    
    parts.push(vendasSection);
  }

  // ========== PRODUCTS SECTION ==========
  if (products.length > 0) {
    const productsWithMediaLocal = products.filter(p => p.imagem_url || p.galeria?.length || p.video_url || p.videos?.length);
    
    parts.push(`# 🪵 CATÁLOGO DE PRODUTOS COM FOTOS
⚠️ Esta é a lista de produtos COM FOTOS disponíveis. A empresa trabalha com MUITO MAIS!
Consulte a seção "PORTFÓLIO COMPLETO" para ver todos os serviços (móveis planejados, etc).

Total: ${products.length} produtos com foto | ${productsWithMediaLocal.length} com mídia

## ⚠️ REGRA CRÍTICA - FORMATO OBRIGATÓRIO:
Quando recomendar um produto, COPIE E COLE o marcador EXATO incluindo o (ID:xxx) no final!

**FORMATO CORRETO:** [FOTO_PRODUTO:url:Nome do Produto (ID:abc12345)]
**FORMATO ERRADO:** [FOTO_PRODUTO:url:Nome do Produto] ← FALTA O ID!

O ID é OBRIGATÓRIO para rastrear qual produto foi mostrado!

${products.map((p) => {
      const shortId = p.id.slice(0, 8);
      const lines = [`## ${p.nome} [ID:${shortId}]`];
      lines.push(`- 🆔 **ID único:** ${shortId}`);
      lines.push(`- Categoria: ${p.categoria || "Geral"}`);
      if (p.preco_base) lines.push(`- Preço: R$ ${p.preco_base.toFixed(2)}`);
      if (p.descricao) lines.push(`- Descrição: ${p.descricao}`);
      if (p.quando_oferecer) lines.push(`- Quando oferecer: ${p.quando_oferecer}`);
      if (p.diferenciais?.length) lines.push(`- Diferenciais: ${p.diferenciais.join(", ")}`);
      
      // NOVOS CAMPOS: Medidas como DIFERENCIADOR PRINCIPAL (logo após nome)
      if (p.comprimento || p.largura || p.altura) {
        const medidas = [];
        const unidade = p.unidade_medida || 'cm';
        if (p.comprimento) medidas.push(`C: ${p.comprimento}${unidade}`);
        if (p.largura) medidas.push(`L: ${p.largura}${unidade}`);
        if (p.altura) medidas.push(`A: ${p.altura}${unidade}`);
        lines.push(`- 📐 **MEDIDAS DISTINTIVAS:** ${medidas.join(' x ')}`);
      }
      
      // Extrair tipo de madeira da descrição (se houver)
      if (p.descricao) {
        const madeiras = ['pequiá', 'jatobá', 'ipê', 'cedro', 'peroba', 'freijó', 'muiracatiara', 'carvalho', 'nogueira', 'teca', 'mogno'];
        const madeiraEncontrada = madeiras.find(m => p.descricao.toLowerCase().includes(m));
        if (madeiraEncontrada) {
          lines.push(`- 🌳 **MADEIRA:** ${madeiraEncontrada.charAt(0).toUpperCase() + madeiraEncontrada.slice(1)}`);
        }
      }
      
      // NOVOS CAMPOS: Estoque e Personalização
      if (p.permite_venda_sem_estoque) {
        lines.push(`- 🎨 **PERSONALIZÁVEL:** Sim - pode ser produzido sob medida`);
        lines.push(`- 💡 Dica: Mencione que "esse modelo pode ser feito em outras medidas"`);
      }
      
      if (p.estoque !== undefined && p.estoque !== null) {
        if (p.estoque > 0) {
          lines.push(`- ✅ Em estoque: ${p.estoque} unidades`);
        } else if (p.permite_venda_sem_estoque) {
          lines.push(`- 🛠️ **PRODUÇÃO:** Sob encomenda (produção exclusiva para o cliente)`);
        } else {
          lines.push(`- ❌ Fora de estoque temporariamente`);
        }
      }
      
      // NOVO CAMPO: Prazo de entrega
      if (p.prazo_entrega_dias) {
        lines.push(`- 🚚 Prazo de entrega: ${p.prazo_entrega_dias} dias úteis`);
      }
      
      // Foto principal COM ID para identificação única
      if (p.imagem_url && p.imagem_url.startsWith('http')) {
        lines.push(`- 📸 **FOTO PRINCIPAL [ID:${shortId}]:** [FOTO_PRODUTO:${p.imagem_url}:${p.nome} (ID:${shortId})]`);
      }
      
      // Galeria de fotos adicionais COM ID
      if (p.galeria && p.galeria.length > 0) {
        lines.push(`- 📸 **GALERIA DO PRODUTO "${p.nome}" [ID:${shortId}] (${p.galeria.length} fotos):**`);
        p.galeria.forEach((url, index) => {
          if (url && url.startsWith('http')) {
            lines.push(`  - Foto ${index + 1}: [FOTO_PRODUTO:${url}:${p.nome} (ID:${shortId}) - Foto ${index + 1}]`);
          }
        });
      }
      
      if (p.video_url && p.video_url.startsWith('http')) {
        lines.push(`- 🎬 **PARA ENVIAR VÍDEO, COPIE:** [VIDEO_PRODUTO:${p.video_url}:${p.nome}]`);
      }
      if (p.videos?.length) {
        p.videos.forEach(v => {
          if (v.url && v.url.startsWith('http')) {
            lines.push(`- 🎬 **PARA ENVIAR "${v.nome}", COPIE:** [VIDEO_PRODUTO:${v.url}:${v.nome}]`);
          }
        });
      }
      
      return lines.join("\n");
    }).join("\n\n")}
`);

    // ========== TABELA DE DESAMBIGUAÇÃO AUTOMÁTICA ==========
    // Detectar produtos com nomes similares para evitar confusão
    const produtosPorNome: Record<string, Product[]> = {};
    products.forEach(p => {
      // Extrair nome base removendo números de lugares e variações
      const nomeBase = p.nome.toLowerCase()
        .replace(/\d+\s*lugares?/gi, '')
        .replace(/para\s+/gi, '')
        .replace(/até\s+/gi, '')
        .replace(/pequi[aá]/gi, 'pequi')
        .replace(/\s+/g, ' ')
        .trim();
      if (!produtosPorNome[nomeBase]) produtosPorNome[nomeBase] = [];
      produtosPorNome[nomeBase].push(p);
    });

    const produtosSimilares = Object.entries(produtosPorNome)
      .filter(([_, prods]) => prods.length > 1);

    if (produtosSimilares.length > 0) {
      let alertaSection = `\n# ⚠️ TABELA DE PRODUTOS SIMILARES - CONSULTE ANTES DE RESPONDER\n\n`;
      alertaSection += `**🚨 ATENÇÃO MÁXIMA!** Os produtos abaixo têm nomes parecidos e VOCÊ VAI CONFUNDIR se não consultar esta tabela!\n\n`;
      
      produtosSimilares.forEach(([nomeBase, prods]) => {
        alertaSection += `## 📊 Família: "${nomeBase.trim().toUpperCase()}"\n\n`;
        alertaSection += `| Produto | ID | Medidas | Preço | Diferencial |\n`;
        alertaSection += `|---------|-----|---------|-------|-------------|\n`;
        
        prods.forEach(p => {
          const shortId = p.id.slice(0, 6);
          
          // Montar medidas
          let medidas = 'N/I';
          if (p.comprimento && p.largura) {
            medidas = `${p.comprimento}x${p.largura}${p.unidade_medida || 'cm'}`;
          } else if (p.comprimento) {
            medidas = `${p.comprimento}${p.unidade_medida || 'cm'}`;
          }
          
          const preco = p.preco_base ? `R$ ${p.preco_base.toFixed(0)}` : 'Consultar';
          
          // Extrair diferencial (madeira, acabamento, etc)
          let diferencial = '-';
          if (p.descricao) {
            const madeiras = ['pequiá', 'jatobá', 'ipê', 'cedro', 'peroba', 'freijó', 'muiracatiara', 'carvalho', 'nogueira', 'teca', 'mogno'];
            const madeiraEncontrada = madeiras.find(m => p.descricao.toLowerCase().includes(m));
            if (madeiraEncontrada) {
              diferencial = madeiraEncontrada.charAt(0).toUpperCase() + madeiraEncontrada.slice(1);
            }
          }
          
          alertaSection += `| ${p.nome} | ${shortId} | ${medidas} | ${preco} | ${diferencial} |\n`;
        });
        
        alertaSection += `\n**🎯 REGRA OBRIGATÓRIA:** Quando o cliente pedir "${nomeBase.trim()}":\n`;
        alertaSection += `1. NÃO envie foto direto\n`;
        alertaSection += `2. Liste as ${prods.length} opções com preços e medidas\n`;
        alertaSection += `3. Pergunte: "Qual tamanho/versão te interessa?"\n`;
        alertaSection += `4. ESPERE a resposta\n`;
        alertaSection += `5. Só então envie a foto do produto CORRETO\n\n`;
      });
      
      parts.push(alertaSection);
    }
  }

  // ========== KNOWLEDGE BASE (APRIMORADO COM TODOS OS CAMPOS) ==========
  if (knowledge.length > 0) {
    // Ordenar por prioridade (maior primeiro)
    const sortedKnowledge = [...knowledge].sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0));
    
    // Agrupar por tipo
    const tiposUnicos = [...new Set(sortedKnowledge.map(k => k.tipo || 'geral'))];
    
    let conhecSection = `# 📚 BASE DE CONHECIMENTO\n`;
    
    // Legenda de níveis de autoridade e certeza
    conhecSection += `\n**Legenda de Autoridade:**
- ⚡ DEFINITIVO = Use EXATAMENTE como está escrito
- 📋 ORIENTAÇÃO = Siga normalmente, pode adaptar o tom
- 💡 SUGESTÃO = Flexível, adapte ao contexto da conversa

**Legenda de Certeza:**
- 🎯 ABSOLUTO = Informação 100% verificada
- ✅ ALTO = Muito confiável
- ⚠️ MÉDIO = Pode ter variações
- ❓ BAIXO = Confirmar se necessário\n`;

    tiposUnicos.forEach(tipo => {
      const itensTipo = sortedKnowledge.filter(k => (k.tipo || 'geral') === tipo);
      const tipoLabel: Record<string, string> = {
        faq: '❓ FAQ - Perguntas Frequentes',
        politica: '📜 Políticas da Empresa',
        guia: '📖 Guias',
        script: '🎭 Scripts de Atendimento',
        processo: '⚙️ Processos',
        tecnico: '🔧 Documentação Técnica',
        geral: '📁 Geral'
      };
      
      conhecSection += `\n## ${tipoLabel[tipo] || tipo}\n`;
      
      itensTipo.forEach(k => {
        const nivelIcon: Record<string, string> = {
          definitivo: '⚡',
          orientacao: '📋',
          sugestao: '💡'
        };
        const grauIcon: Record<string, string> = {
          absoluto: '🎯',
          alto: '✅',
          medio: '⚠️',
          baixo: '❓'
        };
        const icon = nivelIcon[k.nivel_autoridade || 'orientacao'] || '📋';
        const certezaIcon = grauIcon[k.grau_certeza || 'alto'] || '✅';
        
        conhecSection += `\n### ${icon} ${k.titulo}`;
        
        // Adicionar grau de certeza
        if (k.grau_certeza) {
          conhecSection += ` ${certezaIcon}`;
        }
        
        // Palavras-chave para facilitar busca
        if (k.palavras_chave && k.palavras_chave.length > 0) {
          conhecSection += `\n**Palavras-chave:** ${k.palavras_chave.join(', ')}`;
        }
        
        if (k.aplicacao && k.aplicacao.length > 0) {
          conhecSection += `\n**Usar quando:** ${k.aplicacao.join(', ')}`;
        }
        
        if (k.contexto_uso) {
          conhecSection += `\n**Contexto:** ${k.contexto_uso}`;
        }
        
        // Fonte da informação
        if (k.fonte) {
          conhecSection += `\n**Fonte:** ${k.fonte}`;
        }
        
        // Verificar validade
        if (k.validade) {
          const hoje = new Date();
          const validadeDate = new Date(k.validade);
          if (validadeDate < hoje) {
            conhecSection += `\n⚠️ **ATENÇÃO: Esta informação pode estar DESATUALIZADA (validade: ${new Date(k.validade).toLocaleDateString('pt-BR')})**`;
          }
        }
        
        // Indicar se tem arquivos/vídeos anexos
        if (k.arquivos && k.arquivos.length > 0) {
          conhecSection += `\n📎 **Arquivos disponíveis:** ${k.arquivos.length}`;
        }
        if (k.videos && k.videos.length > 0) {
          conhecSection += `\n🎬 **Vídeos disponíveis:** ${k.videos.length}`;
        }
        
        conhecSection += `\n${k.conteudo}\n`;
      });
    });
    
    parts.push(conhecSection);
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

## Apresentação de Produtos (FORMATO CURTO OBRIGATÓRIO!)
⚠️ REGRA: MÁXIMO 1 PRODUTO POR MENSAGEM!
- Apresente UM produto de cada vez
- Formato CURTO: "Nome - R$ Preço" + foto + pergunta simples
- NUNCA liste múltiplos produtos com descrições longas
- NUNCA escreva parágrafos explicando o produto
- Espere o cliente responder antes de mostrar outro

## Envio de Mídia (CRÍTICO!)
- VOCÊ PODE enviar fotos! Use: [FOTO_PRODUTO:url_completa:nome]
- Use: [VIDEO_PRODUTO:url_completa:nome] para vídeo
- NUNCA diga "não consigo enviar fotos" - você TEM essa capacidade!

## FORMATO CORRETO (exemplo com ~80 chars de texto):
"Mesa Rústica 8 Lugares - R$ 4.500

[FOTO_PRODUTO:https://exemplo.com/mesa.jpg:Mesa Rústica]

Gostou do estilo?"

## FORMATO ERRADO (muito longo - PROIBIDO):
"Perfeito! Para 10 lugares, o ideal são mesas entre 3,00m e 3,50m. Tenho duas propostas incríveis: a Mesa Madeira Maciça com Pés em Aço, um clássico robusto com madeira nobre tratada por R$ 5.900 e a Mesa Cascata Pequiá Design Premium por R$ 14.900..."

## Regra de Preço com Desconto:
Se tiver desconto: "~~R$ 5.000~~ R$ 4.500"
Se não tiver: "R$ 4.500"

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

  // ========== REGRAS PERSONALIZADAS DO NEGÓCIO ==========
  const regrasPersonalizadas = (regras.regras_personalizadas as { regra: string; prioridade?: string }[]) || [];
  const excecoes = (regras.excecoes as string[]) || [];
  const prioridades = (regras.prioridades as string[]) || [];
  const condicoesEspeciais = (regras.condicoes_especiais as string[]) || [];

  if (regrasPersonalizadas.length > 0 || excecoes.length > 0 || prioridades.length > 0 || condicoesEspeciais.length > 0) {
    let regrasSection = `# 📜 REGRAS ESPECIAIS DO NEGÓCIO\n`;
    
    if (prioridades.length > 0) {
      regrasSection += `\n## ⚡ Prioridades (ordem de importância):\n${prioridades.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n`;
    }
    
    if (regrasPersonalizadas.length > 0) {
      regrasSection += `\n## Regras Personalizadas:\n`;
      regrasPersonalizadas.forEach((r, i) => {
        const prioridadeLabel: Record<string, string> = {
          alta: '🔴 ALTA',
          media: '🟡 MÉDIA',
          baixa: '🟢 BAIXA'
        };
        regrasSection += `${i + 1}. ${r.regra}${r.prioridade ? ` - ${prioridadeLabel[r.prioridade] || r.prioridade}` : ''}\n`;
      });
    }
    
    if (condicoesEspeciais.length > 0) {
      regrasSection += `\n## 🎯 Condições Especiais:\n${condicoesEspeciais.map(c => `- ${c}`).join('\n')}\n`;
    }
    
    if (excecoes.length > 0) {
      regrasSection += `\n## ⚠️ Exceções Permitidas:\n${excecoes.map(e => `- ${e}`).join('\n')}\n`;
    }
    
    parts.push(regrasSection);
  }

  // ========== SEÇÃO ANTI-REPETIÇÃO: PERGUNTAS JÁ FEITAS (SEMÂNTICO) ==========
  if (askedQuestions.length > 0) {
    // Separar grupos semânticos de perguntas específicas
    const semanticGroups = askedQuestions.filter(q => q.startsWith('[TEMA'));
    const specificQuestions = askedQuestions.filter(q => !q.startsWith('[TEMA'));
    
    let antiRepSection = `# ⚠️ TEMAS E PERGUNTAS JÁ FEITOS (NÃO REPITA!)\n\n`;
    
    if (semanticGroups.length > 0) {
      antiRepSection += `## TEMAS JÁ ABORDADOS:\n`;
      antiRepSection += semanticGroups.map(g => `- ${g.replace('[TEMA JÁ PERGUNTADO: ', '').replace(']', '')}`).join('\n');
      antiRepSection += `\n\n`;
    }
    
    if (specificQuestions.length > 0) {
      antiRepSection += `## PERGUNTAS ESPECÍFICAS JÁ FEITAS:\n`;
      antiRepSection += specificQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n');
      antiRepSection += `\n`;
    }
    
    antiRepSection += `
## REGRAS CRÍTICAS DE ANTI-REPETIÇÃO:
1. JAMAIS pergunte sobre um tema já listado acima
2. Se precisar da informação de novo, diga "Você mencionou [X], poderia confirmar?"
3. NÃO faça perguntas sinônimas (ex: "tem planta?" e "tem medidas?" são a MESMA PERGUNTA)
4. Avance para o PRÓXIMO passo, nunca volte
5. Se o cliente não respondeu algo, reformule de forma diferente OU simplesmente siga em frente
`;
    parts.push(antiRepSection);
  }

  // ========== SEÇÃO CONTEXTO SEMÂNTICO DA CONVERSA ==========
  const contextEntries = Object.entries(conversationContext);
  if (contextEntries.length > 0) {
    parts.push(`# 🎯 CONTEXTO JÁ IDENTIFICADO (USE ESTAS INFORMAÇÕES!)

O cliente já informou:
${contextEntries.map(([key, value]) => `- **${key}:** ${value}`).join('\n')}

## REGRA CRÍTICA:
- NÃO pergunte novamente o que já foi informado acima!
- Use essas informações para personalizar suas respostas
- Referencie o que o cliente disse para mostrar que você está prestando atenção
- Conduza a conversa para FRENTE, não para trás
`);
  }
  
  // ========== SEÇÃO QUANDO TRANSFERIR PARA HUMANO ==========
  parts.push(`# 🚨 QUANDO TRANSFERIR PARA CONSULTOR HUMANO

Você DEVE transferir o atendimento quando detectar:

## SINAIS DE TRANSFERÊNCIA:
1. **Cliente demonstra frustração** - "já falei", "não entendi", "robô", "quero falar com pessoa"
2. **Cliente repete a mesma coisa** - Se você pediu algo 2x e ele repetiu a resposta, significa que você não entendeu
3. **Você não consegue responder** - Pergunta técnica muito específica fora do seu conhecimento
4. **Cliente pede explicitamente** - "quero falar com humano", "tem alguém aí?"
5. **Conversa está em loop** - Mais de 15 trocas sem progresso

## SCRIPT DE TRANSFERÊNCIA (use exatamente):
"Entendi, [nome]! Para te atender melhor nessa questão, vou passar você para um dos nossos consultores especialistas. Ele vai entrar em contato em breve para dar continuidade. 🙌"

## O QUE NÃO FAZER:
- NÃO continue fazendo perguntas genéricas após detectar frustração
- NÃO ignore sinais de que o cliente quer um humano
- NÃO finja que entendeu quando não entendeu
- NÃO peça desculpas excessivas (uma vez basta)
`);



  return parts.join("\n");
}

// Validate URL format
function isValidMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Remove IDs internos e sufixos técnicos do caption visível ao cliente
function cleanProductCaption(caption: string): string {
  return caption
    .replace(/\s*\(ID:[a-z0-9-]+\)/gi, '')     // (ID:abc123)
    .replace(/\s*\[ID:[a-z0-9-]+\]/gi, '')     // [ID:abc123]
    .replace(/\s*-\s*Foto\s*\d+$/gi, '')       // - Foto 1
    .replace(/\s*\(Foto\s*\d+\)$/gi, '')       // (Foto 1)
    .trim();
}

// Parser robusto para marcadores de mídia usando extensão de arquivo
function parseMediaMarker(marker: string, type: 'FOTO' | 'VIDEO'): { url: string; caption: string } | null {
  const prefix = `[${type}_PRODUTO:`;
  if (!marker.startsWith(prefix) || !marker.endsWith(']')) {
    console.log(`⚠️ parseMediaMarker: Marcador inválido - não começa com ${prefix} ou não termina com ]`);
    return null;
  }
  
  const inner = marker.slice(prefix.length, -1); // Remove [PREFIX: e ]
  console.log(`🔍 parseMediaMarker: inner = "${inner}"`);
  
  // Estratégia 1: Encontrar extensão de arquivo de mídia
  // URLs de imagem/vídeo terminam com extensões conhecidas (opcionalmente com query string)
  const extensionMatch = inner.match(/\.(png|jpg|jpeg|gif|webp|svg|mp4|mov|avi|mkv|webm)(\?[^:]*)?/i);
  
  if (extensionMatch && extensionMatch.index !== undefined) {
    const extensionEndIndex = extensionMatch.index + extensionMatch[0].length;
    const url = inner.substring(0, extensionEndIndex).trim();
    // O caption começa após o : que vem depois da extensão
    const afterExtension = inner.substring(extensionEndIndex);
    const colonIndex = afterExtension.indexOf(':');
    const rawCaption = colonIndex !== -1 ? afterExtension.substring(colonIndex + 1).trim() : '';
    const caption = cleanProductCaption(rawCaption);
    
    console.log(`✅ parseMediaMarker (extensão): url="${url}", caption="${caption}"`);
    return { url, caption };
  }
  
  // Estratégia 2: URLs do Supabase Storage sem extensão clara - buscar padrão de UUID/path
  // Formato: https://xxx.supabase.co/storage/v1/object/public/bucket/path
  const supabaseMatch = inner.match(/(https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/[^:]+)/i);
  if (supabaseMatch) {
    const url = supabaseMatch[1].trim();
    const afterUrl = inner.substring(supabaseMatch.index! + supabaseMatch[0].length);
    const colonIndex = afterUrl.indexOf(':');
    const rawCaption = colonIndex !== -1 ? afterUrl.substring(colonIndex + 1).trim() : afterUrl.trim();
    const caption = cleanProductCaption(rawCaption);
    
    console.log(`✅ parseMediaMarker (supabase): url="${url}", caption="${caption}"`);
    return { url, caption };
  }
  
  // Estratégia 3: Fallback - encontrar último : que não faz parte de http:// ou https://
  // Procurar por : após posição 20 (URLs mínimas têm pelo menos isso)
  const colonPositions: number[] = [];
  for (let i = 20; i < inner.length; i++) {
    if (inner[i] === ':') {
      colonPositions.push(i);
    }
  }
  
  // Usar o último : encontrado
  if (colonPositions.length > 0) {
    const lastColonIndex = colonPositions[colonPositions.length - 1];
    const url = inner.substring(0, lastColonIndex).trim();
    const rawCaption = inner.substring(lastColonIndex + 1).trim();
    const caption = cleanProductCaption(rawCaption);
    
    console.log(`✅ parseMediaMarker (fallback): url="${url}", caption="${caption}"`);
    return { url, caption };
  }
  
  // Último recurso: usar tudo como URL sem caption
  console.log(`⚠️ parseMediaMarker: Não encontrou separador, usando inner como URL`);
  return { url: inner.trim(), caption: '' };
}

async function processAndSendResponse(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  phoneNumber: string,
  message: string
): Promise<void> {
  console.log(`📝 Processing message for media markers: "${message.substring(0, 200)}..."`);
  
  // Encontra TODOS os marcadores de mídia usando regex simples
  const allPhotoMarkers = message.match(/\[FOTO_PRODUTO:[^\]]+\]/g) || [];
  const allVideoMarkers = message.match(/\[VIDEO_PRODUTO:[^\]]+\]/g) || [];
  
  console.log(`🖼️ Found raw markers: ${allPhotoMarkers.length} photos, ${allVideoMarkers.length} videos`);
  
  // Parse cada marcador
  const photoData: { url: string; caption: string }[] = [];
  const videoData: { url: string; caption: string }[] = [];
  
  for (const marker of allPhotoMarkers) {
    console.log(`📸 Parsing photo marker: "${marker}"`);
    const parsed = parseMediaMarker(marker, 'FOTO');
    if (parsed && parsed.url) {
      console.log(`📸 Parsed - URL: "${parsed.url}", Caption: "${parsed.caption}"`);
      photoData.push(parsed);
    } else {
      console.warn(`⚠️ Failed to parse photo marker: "${marker}"`);
    }
  }
  
  for (const marker of allVideoMarkers) {
    console.log(`🎬 Parsing video marker: "${marker}"`);
    const parsed = parseMediaMarker(marker, 'VIDEO');
    if (parsed && parsed.url) {
      console.log(`🎬 Parsed - URL: "${parsed.url}", Caption: "${parsed.caption}"`);
      videoData.push(parsed);
    } else {
      console.warn(`⚠️ Failed to parse video marker: "${marker}"`);
    }
  }

  console.log(`🖼️ Successfully parsed: ${photoData.length} photos, ${videoData.length} videos`);

  // Limit number of photos per message to avoid rate limiting
  const MAX_PHOTOS_PER_MESSAGE = 5;
  if (photoData.length > MAX_PHOTOS_PER_MESSAGE) {
    console.warn(`⚠️ Limiting photos from ${photoData.length} to ${MAX_PHOTOS_PER_MESSAGE}`);
    photoData.splice(MAX_PHOTOS_PER_MESSAGE);
  }

  // Clean message - remove ALL markers
  let cleanMessage = message
    .replace(/\[FOTO_PRODUTO:[^\]]+\]/g, "")
    .replace(/\[VIDEO_PRODUTO:[^\]]+\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Send text message first
  if (cleanMessage) {
    await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instanceName, phoneNumber, {
      type: "text",
      text: cleanMessage,
    });
  }

  // Increased delay before sending media (1.5 seconds)
  if (photoData.length > 0 || videoData.length > 0) {
    console.log(`⏳ Waiting 1.5s before sending ${photoData.length} photos, ${videoData.length} videos...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Send photos with validation and RETRY mechanism
  for (let i = 0; i < photoData.length; i++) {
    const photo = photoData[i];
    
    if (!isValidMediaUrl(photo.url)) {
      console.warn(`⚠️ Invalid photo URL skipped: "${photo.url}"`);
      continue;
    }
    
    console.log(`📸 Sending photo ${i + 1}/${photoData.length} - URL: ${photo.url}, Caption: ${photo.caption}`);
    
    let success = false;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (!success && retryCount <= maxRetries) {
      if (retryCount > 0) {
        console.log(`🔄 Retry ${retryCount}/${maxRetries} for photo ${i + 1}/${photoData.length}`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3s between retries
      }
      
      success = await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instanceName, phoneNumber, {
        type: "image",
        url: photo.url,
        caption: photo.caption ? `📸 ${photo.caption}` : "",
      });
      
      retryCount++;
    }
    
    if (!success) {
      console.error(`❌ Failed to send photo after ${maxRetries} retries: ${photo.url}`);
      // Fallback: send image link as text
      const fallbackCaption = photo.caption || "o produto";
      await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instanceName, phoneNumber, {
        type: "text",
        text: `📷 Foto de "${fallbackCaption}": ${photo.url}`,
      });
    }
    
    // Increased delay between photos (2 seconds) to avoid rate limiting
    if (i < photoData.length - 1) {
      console.log(`⏳ Waiting 2s before next photo...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Send videos with validation and RETRY mechanism
  for (let i = 0; i < videoData.length; i++) {
    const video = videoData[i];
    
    if (!isValidMediaUrl(video.url)) {
      console.warn(`⚠️ Invalid video URL skipped: "${video.url}"`);
      continue;
    }
    
    console.log(`🎬 Sending video ${i + 1}/${videoData.length} - URL: ${video.url}, Caption: ${video.caption}`);
    
    let success = false;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (!success && retryCount <= maxRetries) {
      if (retryCount > 0) {
        console.log(`🔄 Retry ${retryCount}/${maxRetries} for video ${i + 1}/${videoData.length}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      success = await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instanceName, phoneNumber, {
        type: "video",
        url: video.url,
        caption: video.caption ? `🎬 ${video.caption}` : "",
      });
      
      retryCount++;
    }
    
    if (!success) {
      console.error(`❌ Failed to send video after ${maxRetries} retries: ${video.url}`);
      const fallbackCaption = video.caption || "o produto";
      await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instanceName, phoneNumber, {
        type: "text",
        text: `🎬 Vídeo de "${fallbackCaption}": ${video.url}`,
      });
    }
    
    // Increased delay between videos (2 seconds)
    if (i < videoData.length - 1) {
      console.log(`⏳ Waiting 2s before next video...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function sendWhatsAppMessage(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  phoneNumber: string,
  content: { type: string; text?: string; url?: string; caption?: string }
): Promise<boolean> {
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
    console.log(`📤 Sending ${content.type} to ${formattedNumber}`);
    console.log(`📤 Endpoint: ${endpoint}`);
    if (content.url) {
      console.log(`📤 Media URL: ${content.url}`);
    }

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
      console.error(`❌ Failed to send ${content.type}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        endpoint,
        mediaUrl: content.url || 'N/A',
        timestamp: new Date().toISOString(),
      });
      return false;
    } else {
      const responseData = await response.json();
      console.log(`✅ Sent ${content.type} to ${formattedNumber}`, responseData);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error sending ${content.type}:`, {
      error: error instanceof Error ? error.message : error,
      endpoint,
      mediaUrl: content.url || 'N/A',
    });
    return false;
  }
}
