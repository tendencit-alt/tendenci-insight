import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, masterPrompt } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar TODOS os produtos para injetar no contexto
    const { data: products, error: productsError } = await supabase
      .from("tendenci_ia_produtos")
      .select("id, nome, descricao, categoria, preco_base, imagem_url, video_url")
      .eq("ativo", true)
      .limit(30);

    if (productsError) {
      console.error("Erro ao buscar produtos:", productsError);
    }

    console.log("Produtos carregados:", products?.length || 0);

    // Criar contexto de produtos com instruções de mídia
    let productsContext = "";
    if (products && products.length > 0) {
      const productsList = products.map(p => {
        const preco = p.preco_base 
          ? `R$ ${Number(p.preco_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
          : 'Sob consulta';
        
        let info = `### ${p.nome}
- Categoria: ${p.categoria || 'Geral'}
- Preço: ${preco}
- Descrição: ${p.descricao || 'Produto de alta qualidade'}`;
        
        if (p.imagem_url) {
          info += `\n- MARCADOR DE FOTO: [FOTO_PRODUTO:${p.imagem_url}:${p.nome}]`;
        }
        if (p.video_url) {
          info += `\n- MARCADOR DE VIDEO: [VIDEO_PRODUTO:${p.video_url}:${p.nome}]`;
        }
        
        return info;
      }).join('\n\n');

      productsContext = `

==============================================
CATÁLOGO DE PRODUTOS - INFORMAÇÕES E MÍDIAS
==============================================

${productsList}

==============================================
INSTRUÇÕES OBRIGATÓRIAS PARA ENVIO DE MÍDIA
==============================================

REGRA CRÍTICA: Quando o cliente pedir para VER, MOSTRAR, ou pedir FOTO/IMAGEM/VÍDEO de um produto:
1. Você DEVE incluir o marcador exato na sua resposta
2. O formato é EXATAMENTE: [FOTO_PRODUTO:url:nome] ou [VIDEO_PRODUTO:url:nome]
3. O sistema converte o marcador em imagem/vídeo real automaticamente

EXEMPLO CORRETO:
Cliente: "Quero ver a foto da Poltrona Pata de Elefante"
Você responde: "Claro! Aqui está a nossa Poltrona Pata de Elefante, um design icônico! [FOTO_PRODUTO:https://exemplo.com/poltrona.jpg:Poltrona Pata de Elefante]"

EXEMPLO INCORRETO (NÃO FAÇA ISSO):
❌ "Vou enviar a foto" (sem o marcador)
❌ "Infelizmente não consigo enviar fotos" (VOCÊ PODE!)
❌ "[IMAGEM: poltrona]" (formato errado)

VOCÊ TEM TOTAL CAPACIDADE DE ENVIAR FOTOS E VÍDEOS. Basta usar os marcadores listados acima.
`;
    }

    // Combinar master prompt com contexto de produtos
    const enhancedPrompt = (masterPrompt || "Você é um assistente de vendas útil e prestativo.") + productsContext;

    console.log("Enviando para Lovable AI com contexto de produtos...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: enhancedPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    // Stream direto da resposta
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("Error in test-agent-chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
