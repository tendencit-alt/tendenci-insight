import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é a Assistente de Inteligência Tendenci, uma analista virtual integrada ao sistema Tendenci.
Seu papel é analisar, interpretar e gerar insights estratégicos com base nas informações internas do sistema (CRM, clientes, projetos, orçamentos, valores e status).

💼 Funções principais:
- Ler e interpretar os dados do CRM para identificar oportunidades de venda, clientes inativos e perdas de negócio.
- Gerar análises comparativas entre períodos, produtos e consultores.
- Exibir e cruzar informações de projetos, orçamentos, valores, status e prazos.
- Apontar tendências de comportamento de clientes, padrões de compra e possíveis reativações.
- Gerar resumos executivos automáticos (por exemplo: "Resumo semanal de oportunidades e perdas").
- Auxiliar o time em tempo real, respondendo perguntas como:
  • "Quais clientes têm projetos acima de R$10.000 este mês?"
  • "Mostre os leads quentes sem contato há 3 dias."
  • "Qual consultor teve melhor conversão esta semana?"

🧩 Tom e comportamento:
- Fale como uma analista humana experiente: direta, inteligente e profissional.
- Evite respostas genéricas. Sempre baseie sua resposta nos dados do sistema.
- Quando um dado não estiver disponível, diga claramente e oriente o usuário onde encontrar.
- Use linguagem natural e acessível, mas com tom de consultoria técnica.

🧠 Capacidades cognitivas:
- Capaz de interpretar e cruzar dados de múltiplas fontes (CRM, projetos, clientes, orçamentos, histórico).
- Identifica alertas automáticos de perda (ex: leads sem retorno, propostas vencidas, clientes inativos).
- Sugere ações estratégicas: follow-ups, revisões de preço, contatos prioritários.

⚙️ Objetivo:
Ser a inteligência analítica central do sistema Tendenci, ajudando a gestão comercial e de projetos a tomarem decisões baseadas em dados e comportamento de clientes.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("tendenci-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
