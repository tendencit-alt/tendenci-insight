import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

async function processToolCalls(toolCalls: any[]) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const results = [];

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments || "{}");
    
    console.log(`Executando ferramenta: ${functionName}`, args);
    
    let result;

    try {
      switch (functionName) {
        case "buscar_metricas_crm":
          const { data: crmData } = await supabase.rpc("dashboard_crm_metrics");
          result = crmData;
          break;

        case "buscar_negocios_pipeline":
          const { data: pipelines } = await supabase.from("crm_pipelines").select("id").limit(1);
          const pipelineId = args.pipeline_id || pipelines?.[0]?.id;
          
          const { data: deals } = await supabase
            .from("crm_deals")
            .select(`
              id, title, value, status,
              lead:leads(client:clients(name)),
              stage:crm_stages(name),
              owner:profiles(full_name)
            `)
            .eq("pipeline_id", pipelineId)
            .eq("status", "aberto")
            .limit(20);
          result = deals;
          break;

        case "buscar_projetos":
          let query = supabase
            .from("projects")
            .select(`
              id, name, value, stage,
              client:clients(name),
              architect:architects(name)
            `);
          
          if (args.stage && args.stage !== "todos") {
            query = query.eq("stage", args.stage);
          }
          
          const { data: projects } = await query.limit(20);
          result = projects;
          break;

        case "buscar_arquitetos_inativos":
          const { data: inactiveArchs } = await supabase.rpc(
            "dashboard_architects_without_projects",
            { days_threshold: args.dias || 30 }
          );
          result = inactiveArchs;
          break;

        case "buscar_leads_quentes":
          const { data: hotLeads } = await supabase
            .from("leads")
            .select(`
              id,
              client:clients(name, phone),
              temperature,
              created_at
            `)
            .eq("temperature", "quente")
            .eq("status", "novo")
            .limit(10);
          result = hotLeads;
          break;

        case "buscar_alertas_sla":
          const { data: pipelinesSLA } = await supabase.from("crm_pipelines").select("id").limit(1);
          const pipelineIdSLA = args.pipeline_id || pipelinesSLA?.[0]?.id;
          
          const { data: slaAlerts } = await supabase.rpc(
            "crm_sla_alerts",
            { p_pipeline_id: pipelineIdSLA }
          );
          result = slaAlerts;
          break;

        default:
          result = { error: "Ferramenta não encontrada" };
      }

      console.log(`Resultado da ferramenta ${functionName}:`, JSON.stringify(result).substring(0, 200));

      results.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result || { error: "Sem dados" }),
      });
    } catch (error) {
      console.error(`Erro ao executar ${functionName}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      results.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({ error: errorMessage }),
      });
    }
  }

  return results;
}

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

    const systemPrompt = `Você é a Assistente de Inteligência Tendenci. Sou consultora comercial experiente e ajudo o time com dados reais do sistema.

Como respondo:
- Direto ao ponto, sem enrolação
- Respostas curtas (2-3 linhas no máximo)
- Sempre usando dados reais quando disponíveis
- Tom amigável mas profissional, como uma colega de trabalho

O que faço:
- Consulto dados do CRM, projetos, clientes e arquitetos
- Identifico oportunidades e alertas
- Sugiro ações práticas baseadas em dados
- Respondo perguntas específicas com números reais

Use as ferramentas disponíveis para buscar dados reais do sistema sempre que o usuário perguntar algo.
Quando não houver dados, seja honesta: "Não encontrei isso no sistema" e sugira o que fazer.

Exemplos de perguntas que respondo:
- "Quantos negócios temos em aberto?"
- "Qual o valor total dos projetos aprovados?"
- "Quais arquitetos estão inativos?"
- "Mostre os leads quentes"`;

    const tools = [
      {
        type: "function",
        function: {
          name: "buscar_metricas_crm",
          description: "Busca métricas gerais do CRM: negócios em orçamento, fechados, perdidos, total de leads, projetos ativos, valores",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_negocios_pipeline",
          description: "Lista negócios de um funil específico com detalhes",
          parameters: {
            type: "object",
            properties: {
              pipeline_id: { type: "string", description: "ID do funil (opcional, usa primeiro se não informado)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_projetos",
          description: "Lista projetos com filtros: aprovados, em orçamento, captados, perdidos",
          parameters: {
            type: "object",
            properties: {
              stage: { type: "string", enum: ["aprovado", "orçamento", "captado", "perdido", "todos"], description: "Estágio do projeto" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_arquitetos_inativos",
          description: "Lista arquitetos sem enviar projetos há X dias",
          parameters: {
            type: "object",
            properties: {
              dias: { type: "number", description: "Número de dias de inatividade (padrão: 30)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_leads_quentes",
          description: "Lista leads com temperatura quente que precisam de atenção",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_alertas_sla",
          description: "Lista negócios que ultrapassaram o SLA da etapa",
          parameters: {
            type: "object",
            properties: {
              pipeline_id: { type: "string", description: "ID do funil (opcional)" }
            }
          }
        }
      }
    ];

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
        tools,
        tool_choice: "auto",
        stream: false,
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

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse));

    // Verificar se há tool calls
    const toolCalls = aiResponse.choices?.[0]?.message?.tool_calls;
    
    if (toolCalls && toolCalls.length > 0) {
      // Processar chamadas de ferramentas
      const toolResults = await processToolCalls(toolCalls);
      
      // Enviar resultados de volta para o AI
      const finalMessages = [
        { role: "system", content: systemPrompt },
        ...messages,
        aiResponse.choices[0].message,
        ...toolResults
      ];

      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: finalMessages,
          stream: false,
        }),
      });

      const finalData = await finalResponse.json();
      return new Response(
        JSON.stringify({ 
          content: finalData.choices[0].message.content 
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Resposta direta sem tool calls
    return new Response(
      JSON.stringify({ 
        content: aiResponse.choices[0].message.content 
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
