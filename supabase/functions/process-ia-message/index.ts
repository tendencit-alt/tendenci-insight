import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Debounce time in milliseconds (5 seconds)
const DEBOUNCE_MS = 5000;
// Maximum messages to keep in context
const MAX_CONTEXT_MESSAGES = 50;

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
      userMessage = message.imageMessage.caption || "[Imagem enviada]";
    } else {
      console.log("⏭️ Unsupported message type");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`💬 Message: ${userMessage.substring(0, 100)}...`);

    // ========== DEBOUNCE SYSTEM ==========
    // Check for pending messages from this client
    const debounceWindow = new Date(Date.now() - DEBOUNCE_MS).toISOString();
    
    const { data: pendingMessages } = await supabase
      .from("ia_pending_messages")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("instance_name", instanceName)
      .eq("processed", false)
      .gte("created_at", debounceWindow)
      .order("created_at", { ascending: true });

    // Save current message as pending
    await supabase.from("ia_pending_messages").insert({
      phone_number: phoneNumber,
      instance_name: instanceName,
      content: userMessage,
      processed: false,
    });

    // If there are already pending messages, skip processing (let the timer handle it)
    if (pendingMessages && pendingMessages.length > 0) {
      console.log(`⏳ Debouncing: ${pendingMessages.length} pending messages, waiting for more...`);
      return new Response(JSON.stringify({ success: true, debounced: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wait for debounce period to collect more messages
    console.log(`⏳ Waiting ${DEBOUNCE_MS}ms for additional messages...`);
    await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS));

    // Fetch all pending messages after waiting
    const { data: allPendingMessages } = await supabase
      .from("ia_pending_messages")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("instance_name", instanceName)
      .eq("processed", false)
      .order("created_at", { ascending: true });

    // Mark all as processed
    if (allPendingMessages && allPendingMessages.length > 0) {
      const ids = allPendingMessages.map(m => m.id);
      await supabase
        .from("ia_pending_messages")
        .update({ processed: true })
        .in("id", ids);
    }

    // Consolidate all messages
    const consolidatedMessages = allPendingMessages?.map(m => m.content) || [userMessage];
    const combinedMessage = consolidatedMessages.length > 1 
      ? `[O cliente enviou ${consolidatedMessages.length} mensagens seguidas]\n\n${consolidatedMessages.join("\n\n")}`
      : consolidatedMessages[0];

    console.log(`📨 Processing ${consolidatedMessages.length} consolidated message(s)`);

    // ========== CLIENT MEMORY ==========
    // Load or create client memory
    let clientMemory: ClientMemory | null = null;
    
    const { data: existingMemory } = await supabase
      .from("ia_client_memory")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("instance_name", instanceName)
      .single();

    if (existingMemory) {
      clientMemory = existingMemory as ClientMemory;
      // Update interaction count
      await supabase
        .from("ia_client_memory")
        .update({ 
          interaction_count: (clientMemory.interaction_count || 0) + 1,
          last_interaction: new Date().toISOString(),
          // Extract name from pushName if not set
          client_name: clientMemory.client_name || pushName || null,
        })
        .eq("id", clientMemory.id);
    } else {
      // Create new memory
      const { data: newMemory } = await supabase
        .from("ia_client_memory")
        .insert({
          phone_number: phoneNumber,
          instance_name: instanceName,
          client_name: pushName || null,
          interaction_count: 1,
        })
        .select()
        .single();
      
      clientMemory = newMemory as ClientMemory;
    }

    // ========== LOAD CONFIGURATIONS ==========
    const { data: configsData } = await supabase
      .from("tendenci_ia_config")
      .select("section, config");

    const configs: Record<string, Record<string, unknown>> = {};
    (configsData as IAConfig[] || []).forEach((c) => {
      configs[c.section] = c.config || {};
    });

    // Load products
    const { data: productsData } = await supabase
      .from("tendenci_ia_produtos")
      .select("id, nome, descricao, preco_base, categoria, imagem_url, video_url, videos, quando_oferecer, diferenciais, ativo")
      .eq("ativo", true);

    const products = (productsData as Product[]) || [];
    console.log(`📦 Loaded ${products.length} products`);

    // Load knowledge base
    const { data: knowledgeData } = await supabase
      .from("tendenci_ia_conhecimento")
      .select("*")
      .eq("ativo", true);

    const knowledge = (knowledgeData as Knowledge[]) || [];

    // ========== CONVERSATION HISTORY (50 messages) ==========
    const { data: historyData } = await supabase
      .from("ia_conversations")
      .select("role, content, created_at")
      .eq("phone_number", phoneNumber)
      .eq("instance_name", instanceName)
      .order("created_at", { ascending: false })
      .limit(MAX_CONTEXT_MESSAGES);

    const conversationHistory: Message[] = (historyData || [])
      .reverse()
      .map((h) => ({ role: h.role as "user" | "assistant", content: h.content }));

    console.log(`📚 Loaded ${conversationHistory.length} messages of context`);

    // Build master prompt
    const masterPrompt = buildMasterPrompt(configs, products, knowledge, clientMemory, conversationHistory);

    // Build messages array for AI
    const messages: Message[] = [
      { role: "system", content: masterPrompt },
      ...conversationHistory,
      { role: "user", content: combinedMessage },
    ];

    // Call Lovable AI
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("🧠 Calling Lovable AI...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

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
    
    console.log(`🤖 AI Response: ${assistantMessage.substring(0, 100)}...`);

    // ========== CHECK FOR REPETITION ==========
    const lastAssistantMessages = conversationHistory
      .filter(m => m.role === "assistant")
      .slice(-5)
      .map(m => m.content);

    if (isResponseTooSimilar(assistantMessage, lastAssistantMessages)) {
      console.log("⚠️ Response too similar to previous, asking for reformulation...");
      
      const reformulateResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
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
        }
      }
    }

    // ========== HUMANIZED DELAY (simulate typing) ==========
    const typingDelay = Math.min(
      1500 + (assistantMessage.length * 15), // ~15ms per character
      6000 // max 6 seconds
    );

    console.log(`⏱️ Typing delay: ${typingDelay}ms`);
    
    // Send typing indicator
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

    await new Promise(resolve => setTimeout(resolve, typingDelay));

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
        await createOrUpdateDealFromIA(
          supabase,
          phoneNumber,
          clientMemory?.client_name || pushName || null,
          updatedHistory,
          temperature
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

// Extract client info from message
async function extractAndSaveClientInfo(
  supabase: any,
  phoneNumber: string,
  instanceName: string,
  message: string,
  currentMemory: ClientMemory | null
): Promise<void> {
  // Only try to extract if we don't have a name yet
  if (currentMemory?.client_name) return;

  // Simple patterns to extract names
  const namePatterns = [
    /(?:meu nome é|me chamo|sou o|sou a|aqui é o|aqui é a)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i,
    /^([A-ZÀ-Ú][a-zà-ú]+)\s+(?:aqui|falando)/i,
  ];

  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const extractedName = match[1].trim();
      console.log(`📝 Extracted client name: ${extractedName}`);
      
      await supabase
        .from("ia_client_memory")
        .update({ client_name: extractedName })
        .eq("phone_number", phoneNumber)
        .eq("instance_name", instanceName);
      
      break;
    }
  }
}

// ========== CRM INTEGRATION FUNCTIONS ==========

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
  temperature: string
): Promise<void> {
  try {
    const displayName = clientName || `Cliente ${phoneNumber.slice(-4)}`;
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    
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
      
      // Update name if we have a better one
      if (clientName && existingClient.name?.startsWith('Cliente ')) {
        await supabase
          .from('clients')
          .update({ name: clientName })
          .eq('id', clientId);
        console.log(`📋 Updated client name to: ${clientName}`);
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
          source: 'whatsapp_ia',
          status: 'novo',
          temperature: temperature,
          phone: formattedPhone,
          name: displayName
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
      // Update existing deal with new history
      const { error: updateError } = await supabase
        .from('crm_deals')
        .update({ 
          conversation_history: fullHistory,
          last_interaction: new Date().toISOString(),
          ai_status: temperature
        })
        .eq('id', existingDeal.id);
      
      if (updateError) {
        console.error('Error updating deal:', updateError);
      } else {
        console.log(`📋 Updated CRM deal with complete history (${conversationHistory.length} messages)`);
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

      // Create new deal
      const { error: dealError } = await supabase
        .from('crm_deals')
        .insert({
          title: `Lead IA - ${displayName}`,
          lead_id: leadId,
          pipeline_id: pipeline.id,
          stage_id: stage.id,
          from_ai: true,
          conversation_history: fullHistory,
          ai_status: temperature,
          last_interaction: new Date().toISOString(),
          status: 'aberto'
        });
      
      if (dealError) {
        console.error('Error creating deal:', dealError);
      } else {
        console.log(`📋 Created new CRM deal: Lead IA - ${displayName}`);
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

  // ========== CRITICAL RULES AT THE TOP ==========
  parts.push(`# 🚨 REGRAS CRÍTICAS - LEIA PRIMEIRO!

## NUNCA REPETIR CONTEÚDO
- JAMAIS repita uma resposta que você já deu nesta conversa
- NUNCA faça a mesma pergunta duas vezes
- Se já cumprimentou o cliente, NÃO cumprimente novamente
- Se já apresentou um produto, NÃO apresente da mesma forma
- Varie SEMPRE suas palavras - use sinônimos e estruturas diferentes
- Cada resposta deve ser ÚNICA e diferente das anteriores

## CONTEXTO E MEMÓRIA (${conversationHistory.length} mensagens carregadas)
- Você tem acesso às últimas ${conversationHistory.length} mensagens desta conversa
- LEMBRE-SE de TUDO que foi discutido anteriormente
- ${clientMemory?.client_name ? `O cliente se chama ${clientMemory.client_name} - USE o nome dele!` : "Se o cliente disser o nome, lembre e use nas próximas mensagens"}
- Se já discutiu preferências, LEMBRE e APLIQUE
- Trate cada resposta como continuação natural da conversa

## MÚLTIPLAS MENSAGENS DO CLIENTE
- Se o cliente enviou várias mensagens seguidas, você receberá todas juntas
- RESPONDA A TODAS as mensagens de uma vez só
- Não ignore nenhuma parte do que ele disse
- Organize sua resposta para cobrir todos os pontos mencionados

## TOM E NATURALIDADE
- Fale como um humano real, não como robô
- Use linguagem natural e brasileira (tá, né, pra, beleza)
- Varie o comprimento das frases
- Às vezes faça perguntas de acompanhamento relevantes
- Demonstre interesse genuíno pelo cliente
- Evite frases genéricas como "Entendi!", "Certo!", "Perfeito!" no início
- NUNCA comece duas respostas da mesma forma

## ENVIO DE MÍDIA
- VOCÊ PODE E DEVE enviar fotos e vídeos dos produtos!
- Quando recomendar um produto com foto, INCLUA o marcador na resposta
- Use: [FOTO_PRODUTO:url:nome] para enviar foto
- Use: [VIDEO_PRODUTO:url:nome] para enviar vídeo
- Exemplo: "Olha esse modelo que combina com o que você procura! [FOTO_PRODUTO:url:nome]"
`);

  // ========== CLIENT MEMORY SECTION ==========
  if (clientMemory) {
    parts.push(`# INFORMAÇÕES DO CLIENTE
- ${clientMemory.client_name ? `Nome: ${clientMemory.client_name}` : "Nome: ainda não informado"}
- Total de interações: ${clientMemory.interaction_count || 1}
- ${clientMemory.notes ? `Notas: ${clientMemory.notes}` : ""}
${clientMemory.client_name ? `\n⚠️ USE o nome "${clientMemory.client_name}" naturalmente na conversa!` : ""}
`);
  }

  // Identity section
  const identidade = configs["identidade"] || {};
  parts.push(`# IDENTIDADE DO AGENTE
Você é ${identidade.nome_agente || "um assistente virtual"}.
${identidade.descricao_cargo || ""}
Personalidade: ${identidade.personalidade || "profissional e prestativo"}
Tom de voz: ${identidade.tom_voz || "amigável"}
`);

  // Business section
  const negocio = configs["negocio"] || {};
  parts.push(`# SOBRE A EMPRESA
${negocio.descricao_empresa || ""}
Horário de funcionamento: ${negocio.horario_funcionamento || "horário comercial"}
`);

  // Communication section
  const comunicacao = configs["comunicacao"] || {};
  parts.push(`# ESTILO DE COMUNICAÇÃO
Saudação inicial (use APENAS no primeiro contato): ${comunicacao.saudacao || "Olá! Como posso ajudar?"}
Despedida: ${comunicacao.despedida || "Obrigado pelo contato!"}
Mensagens devem ser: ${comunicacao.estilo_mensagem || "claras e objetivas"}
${comunicacao.emojis_permitidos ? "Use emojis moderadamente" : "Não use emojis"}
`);

  // Behavior section
  const comportamento = configs["comportamento"] || {};
  parts.push(`# COMPORTAMENTO
${comportamento.instrucoes_gerais || "Seja sempre educado e prestativo."}
O que NÃO fazer: ${comportamento.restricoes || "Nunca prometa o que não pode cumprir."}
`);

  // Products section
  if (products.length > 0) {
    const productsWithMedia = products.filter(p => p.imagem_url || p.video_url || p.videos?.length);
    
    parts.push(`# CATÁLOGO DE PRODUTOS (${products.length} produtos, ${productsWithMedia.length} com mídia)
IMPORTANTE: Quando recomendar um produto, ENVIE a foto junto!

${products
  .map((p) => {
    const lines = [`## ${p.nome}`];
    lines.push(`- Categoria: ${p.categoria || "Geral"}`);
    lines.push(`- Preço: R$ ${p.preco_base?.toFixed(2) || "Sob consulta"}`);
    if (p.descricao) lines.push(`- Descrição: ${p.descricao}`);
    if (p.quando_oferecer) lines.push(`- Quando oferecer: ${p.quando_oferecer}`);
    if (p.diferenciais?.length) lines.push(`- Diferenciais: ${p.diferenciais.join(", ")}`);
    
    // Media markers
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
  })
  .join("\n\n")}
`);
  }

  // Knowledge base section
  if (knowledge.length > 0) {
    parts.push(`# BASE DE CONHECIMENTO
Use estas informações para responder dúvidas:

${knowledge.map((k) => `## ${k.titulo}\n${k.conteudo}`).join("\n\n")}
`);
  }

  // Sales/Qualification section
  const vendas = configs["vendas"] || {};
  const qualificacao = configs["qualificacao"] || {};
  parts.push(`# VENDAS E QUALIFICAÇÃO
${vendas.instrucoes_venda || ""}
${qualificacao.perguntas_qualificacao || ""}
`);

  // Rules section
  const regras = configs["regras"] || {};
  parts.push(`# REGRAS ADICIONAIS
${regras.regras_gerais || ""}
${regras.politica_privacidade || ""}
`);

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
