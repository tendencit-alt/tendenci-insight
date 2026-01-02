import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tools disponíveis para o agente
const tools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Busca produtos no catálogo da loja. Use quando o cliente perguntar sobre produtos, preços, categorias, ou quiser ver fotos/vídeos.",
      parameters: {
        type: "object",
        properties: {
          query: { 
            type: "string", 
            description: "Termo de busca (nome do produto, categoria, tipo)" 
          },
          categoria: {
            type: "string",
            description: "Filtrar por categoria específica"
          },
          limit: {
            type: "number",
            description: "Número máximo de produtos a retornar (padrão: 5)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_product_image",
      description: "Envia a imagem de um produto específico para o cliente. Use quando o cliente quiser ver a foto de um produto.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "ID do produto" },
          product_name: { type: "string", description: "Nome do produto" },
          image_url: { type: "string", description: "URL da imagem do produto" }
        },
        required: ["product_id", "product_name", "image_url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_product_video",
      description: "Envia um vídeo de um produto específico para o cliente. Use quando o cliente quiser ver um vídeo do produto.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "ID do produto" },
          product_name: { type: "string", description: "Nome do produto" },
          video_url: { type: "string", description: "URL do vídeo do produto" }
        },
        required: ["product_id", "product_name", "video_url"]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, masterPrompt } = await req.json();

    if (!masterPrompt) {
      console.error("Master prompt não fornecido");
      return new Response(
        JSON.stringify({ error: "Master prompt não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      console.error("Mensagens inválidas");
      return new Response(
        JSON.stringify({ error: "Mensagens inválidas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "Configuração de IA ausente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inicializar Supabase para buscar produtos
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Enviando para Lovable AI com tools...");
    console.log("Master prompt (primeiros 200 chars):", masterPrompt.substring(0, 200));
    console.log("Número de mensagens:", messages.length);

    // Adicionar instrução sobre capacidade de mídia ao master prompt
    const enhancedMasterPrompt = masterPrompt + `

# CAPACIDADES DE MÍDIA

Você TEM a capacidade de enviar fotos e vídeos de produtos para o cliente.
Quando o cliente pedir para ver um produto, foto, imagem ou vídeo:
1. Use a ferramenta search_products para encontrar o produto
2. Use send_product_image para enviar a foto do produto
3. Use send_product_video para enviar vídeos, se disponíveis

IMPORTANTE: Você PODE e DEVE enviar fotos quando solicitado. Não diga que não consegue enviar mídia.
Sempre que o cliente demonstrar interesse em ver um produto, ofereça proativamente para enviar a foto.`;

    // Formatar mensagens para o modelo
    const formattedMessages = [
      { role: "system", content: enhancedMasterPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // Primeira chamada com tools
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: formattedMessages,
        tools: tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API Lovable:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar mensagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message;
    
    console.log("Resposta inicial:", JSON.stringify(assistantMessage, null, 2));

    // Verificar se há tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("Processando tool calls...");
      
      const toolResults: string[] = [];
      const mediaMarkers: string[] = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        let args;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }
        
        console.log(`Executando tool: ${functionName}`, args);
        
        if (functionName === "search_products") {
          // Buscar produtos no banco
          let query = supabase
            .from("tendenci_ia_produtos")
            .select("*")
            .eq("ativo", true);
          
          if (args.query) {
            query = query.or(`nome.ilike.%${args.query}%,descricao.ilike.%${args.query}%,categoria.ilike.%${args.query}%`);
          }
          
          if (args.categoria) {
            query = query.ilike("categoria", `%${args.categoria}%`);
          }
          
          const { data: products, error } = await query.limit(args.limit || 5);
          
          if (error) {
            console.error("Erro ao buscar produtos:", error);
            toolResults.push(`Erro ao buscar produtos: ${error.message}`);
          } else if (products && products.length > 0) {
            const productList = products.map((p: any) => {
              const priceFormatted = p.preco_base 
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco_base)
                : 'Sob consulta';
              return `- ${p.nome} (${p.categoria || 'Sem categoria'}): ${priceFormatted}${p.imagem_url ? ' [tem foto]' : ''}${p.video_url ? ' [tem vídeo]' : ''}\n  ID: ${p.id}\n  Descrição: ${p.descricao || 'N/A'}${p.imagem_url ? `\n  Imagem: ${p.imagem_url}` : ''}${p.video_url ? `\n  Vídeo: ${p.video_url}` : ''}`;
            }).join("\n\n");
            
            toolResults.push(`Produtos encontrados:\n\n${productList}`);
          } else {
            toolResults.push("Nenhum produto encontrado com esses critérios.");
          }
        } else if (functionName === "send_product_image") {
          // Simular envio de imagem - adicionar marcador
          const { product_name, image_url } = args;
          if (image_url) {
            mediaMarkers.push(`[IMAGE:${image_url}|${product_name || 'Produto'}]`);
            toolResults.push(`Imagem de "${product_name}" enviada com sucesso.`);
          } else {
            toolResults.push(`Produto "${product_name}" não possui imagem cadastrada.`);
          }
        } else if (functionName === "send_product_video") {
          // Simular envio de vídeo - adicionar marcador
          const { product_name, video_url } = args;
          if (video_url) {
            mediaMarkers.push(`[VIDEO:${video_url}|${product_name || 'Produto'}]`);
            toolResults.push(`Vídeo de "${product_name}" enviado com sucesso.`);
          } else {
            toolResults.push(`Produto "${product_name}" não possui vídeo cadastrado.`);
          }
        }
      }
      
      // Fazer segunda chamada com resultados das tools
      const messagesWithToolResults = [
        ...formattedMessages,
        assistantMessage,
        {
          role: "tool",
          content: toolResults.join("\n\n"),
          tool_call_id: assistantMessage.tool_calls[0].id,
        }
      ];
      
      console.log("Fazendo segunda chamada com resultados das tools...");
      
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: messagesWithToolResults,
          stream: true,
        }),
      });
      
      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error("Erro na segunda chamada:", finalResponse.status, errorText);
        throw new Error("Erro ao processar resposta final");
      }
      
      // Se há marcadores de mídia, precisamos injetá-los no stream
      if (mediaMarkers.length > 0) {
        // Criar um stream que adiciona os marcadores no final
        const originalBody = finalResponse.body;
        if (!originalBody) throw new Error("Sem body na resposta");
        
        const reader = originalBody.getReader();
        const encoder = new TextEncoder();
        
        const stream = new ReadableStream({
          async start(controller) {
            let lastChunk = "";
            
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                // Adicionar marcadores de mídia como chunk final
                const mediaContent = "\n\n" + mediaMarkers.join("\n");
                const mediaChunk = `data: ${JSON.stringify({
                  choices: [{
                    delta: { content: mediaContent }
                  }]
                })}\n\n`;
                controller.enqueue(encoder.encode(mediaChunk));
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                break;
              }
              
              controller.enqueue(value);
            }
          }
        });
        
        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
      
      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }
    
    // Sem tool calls - fazer streaming normal
    console.log("Sem tool calls, fazendo streaming normal...");
    
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: formattedMessages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      console.error("Erro no streaming:", streamResponse.status, errorText);
      throw new Error("Erro ao iniciar streaming");
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Erro no test-agent-chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
