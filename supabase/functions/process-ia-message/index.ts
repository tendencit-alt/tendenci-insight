import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.log(`📱 From: ${phoneNumber}`);

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
      // Try to get audio URL or base64 for transcription
      const audioUrl = messageData.media?.url || message.audioMessage?.url;
      const audioBase64 = messageData.media?.base64;
      const mimetype = message.audioMessage?.mimetype || "audio/ogg";
      
      console.log(`🎙️ Audio message received - URL: ${audioUrl ? 'yes' : 'no'}, Base64: ${audioBase64 ? 'yes' : 'no'}`);
      
      if (audioUrl || audioBase64) {
        try {
          // Transcribe audio using Gemini
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
        console.warn("🎙️ Audio message without URL or base64 data:", JSON.stringify(messageData.media || {}).substring(0, 200));
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

    // Load IA configurations
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
    console.log(`📦 Loaded ${products.length} products. First product imagem_url: ${products[0]?.imagem_url || 'none'}`);

    // Load knowledge base
    const { data: knowledgeData } = await supabase
      .from("tendenci_ia_conhecimento")
      .select("*")
      .eq("ativo", true);

    const knowledge = (knowledgeData as Knowledge[]) || [];

    // Get conversation history (last 10 messages)
    const { data: historyData } = await supabase
      .from("ia_conversations")
      .select("role, content")
      .eq("phone_number", phoneNumber)
      .eq("instance_name", instanceName)
      .order("created_at", { ascending: false })
      .limit(10);

    const conversationHistory: Message[] = (historyData || [])
      .reverse()
      .map((h) => ({ role: h.role as "user" | "assistant", content: h.content }));

    // Build master prompt
    const masterPrompt = buildMasterPrompt(configs, products, knowledge);

    // Build messages array for AI
    const messages: Message[] = [
      { role: "system", content: masterPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
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
        max_tokens: 1024,
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
        content: userMessage,
        media_type: mediaType,
        media_url: mediaUrl,
        metadata: { pushName: messageData.pushName },
      },
      {
        phone_number: phoneNumber,
        instance_name: instanceName,
        role: "assistant",
        content: assistantMessage,
        media_type: "text",
      },
    ]);

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

function buildMasterPrompt(
  configs: Record<string, Record<string, unknown>>,
  products: Product[],
  knowledge: Knowledge[]
): string {
  const parts: string[] = [];

  // CRITICAL: Context instructions at the top
  parts.push(`# INSTRUÇÕES GERAIS DE CONTEXTO
IMPORTANTE: Você está em uma conversa contínua com um cliente via WhatsApp. 
- LEMBRE o nome do cliente se ele se apresentou anteriormente
- NÃO REPITA informações que você já deu na mesma conversa
- CONTINUE do ponto onde a conversa parou
- MANTENHA coerência com o que foi discutido antes
- USE o histórico para dar respostas personalizadas

VOCÊ PODE E DEVE enviar fotos e vídeos dos produtos!
Quando recomendar um produto, INCLUA o marcador de mídia na sua resposta.
Exemplo: "Esse produto é perfeito para você! [FOTO_PRODUTO:url:nome]"
`);

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
Saudação inicial: ${comunicacao.saudacao || "Olá! Como posso ajudar?"}
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

  // Products section with correct column names
  if (products.length > 0) {
    parts.push(`# CATÁLOGO DE PRODUTOS
Você tem acesso aos seguintes produtos. ENVIE FOTOS quando recomendar um produto!

${products
  .map(
    (p) => {
      const lines = [`## ${p.nome}`];
      lines.push(`- Categoria: ${p.categoria || "Geral"}`);
      lines.push(`- Preço: R$ ${p.preco_base?.toFixed(2) || "Sob consulta"}`);
      if (p.descricao) lines.push(`- Descrição: ${p.descricao}`);
      if (p.quando_oferecer) lines.push(`- Quando oferecer: ${p.quando_oferecer}`);
      if (p.diferenciais?.length) lines.push(`- Diferenciais: ${p.diferenciais.join(", ")}`);
      
      // Media markers with correct column name (imagem_url)
      if (p.imagem_url) {
        lines.push(`- 📸 FOTO DISPONÍVEL: [FOTO_PRODUTO:${p.imagem_url}:${p.nome}]`);
      }
      if (p.video_url) {
        lines.push(`- 🎬 VÍDEO DISPONÍVEL: [VIDEO_PRODUTO:${p.video_url}:${p.nome}]`);
      }
      // Additional videos array
      if (p.videos?.length) {
        p.videos.forEach(v => {
          lines.push(`- 🎬 VÍDEO "${v.nome}": [VIDEO_PRODUTO:${v.url}:${v.nome}]`);
        });
      }
      
      return lines.join("\n");
    }
  )
  .join("\n\n")}

⚠️ IMPORTANTE: Use os marcadores [FOTO_PRODUTO:url:nome] e [VIDEO_PRODUTO:url:nome] na sua resposta para enviar mídia ao cliente!
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
  parts.push(`# REGRAS IMPORTANTES
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

  // Debug: Log found media markers
  console.log(`🖼️ Found ${photoMatches.length} photo markers, ${videoMatches.length} video markers`);
  if (photoMatches.length > 0) {
    console.log(`📸 Photos to send:`, photoMatches.map(m => ({ url: m[1], caption: m[2] })));
  }
  if (videoMatches.length > 0) {
    console.log(`🎬 Videos to send:`, videoMatches.map(m => ({ url: m[1], caption: m[2] })));
  }

  // Clean message from markers
  let cleanMessage = message
    .replace(photoRegex, "")
    .replace(videoRegex, "")
    .trim();

  // Send text message first
  if (cleanMessage) {
    await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instanceName, phoneNumber, {
      type: "text",
      text: cleanMessage,
    });
  }

  // Send photos
  for (const match of photoMatches) {
    const [, url, caption] = match;
    await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instanceName, phoneNumber, {
      type: "image",
      url: url.trim(),
      caption: `📸 ${caption.trim()}`,
    });
  }

  // Send videos
  for (const match of videoMatches) {
    const [, url, caption] = match;
    await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instanceName, phoneNumber, {
      type: "video",
      url: url.trim(),
      caption: `🎬 ${caption.trim()}`,
    });
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
