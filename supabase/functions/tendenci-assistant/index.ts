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
        // ==================== CRM ====================
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
              id, title, value, status, created_at, stage_entered_at,
              lead:leads(client:clients(name, phone)),
              stage:crm_stages(name, sla_hours),
              owner:profiles(full_name)
            `)
            .eq("pipeline_id", pipelineId)
            .eq("status", "aberto")
            .order("created_at", { ascending: false })
            .limit(30);
          result = deals;
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

        case "buscar_funil_conversao":
          const { data: stagesFunil } = await supabase
            .from("crm_stages")
            .select("id, name, position")
            .order("position");
          
          const funilData = [];
          for (const stage of stagesFunil || []) {
            const { count: total } = await supabase
              .from("crm_deals")
              .select("id", { count: "exact", head: true })
              .eq("stage_id", stage.id);
            
            const { count: ganhos } = await supabase
              .from("crm_deals")
              .select("id", { count: "exact", head: true })
              .eq("stage_id", stage.id)
              .eq("status", "won");
            
            funilData.push({
              etapa: stage.name,
              posicao: stage.position,
              total_negocios: total || 0,
              ganhos: ganhos || 0
            });
          }
          result = funilData;
          break;

        // ==================== METAS E VENDEDORES ====================
        case "buscar_metas_vendedores":
          const { data: metasVendedores } = await supabase
            .from("tendenci_seller_goals")
            .select(`
              id, valor_meta, data_inicio, data_fim, status,
              vendedor:profiles(id, full_name, email)
            `)
            .eq("status", "ativa")
            .gte("data_fim", new Date().toISOString().split("T")[0]);
          
          // Buscar progresso de cada meta
          const metasComProgresso = [];
          for (const meta of metasVendedores || []) {
            const { data: progresso } = await supabase
              .from("tendenci_goal_progress")
              .select("valor_vendido, percentual")
              .eq("seller_goal_id", meta.id)
              .single();
            
            metasComProgresso.push({
              ...meta,
              valor_vendido: progresso?.valor_vendido || 0,
              percentual: progresso?.percentual || 0
            });
          }
          result = metasComProgresso;
          break;

        case "buscar_performance_vendedor":
          if (!args.vendedor_id) {
            result = { error: "vendedor_id é obrigatório" };
            break;
          }
          const { data: perfVendedor } = await supabase.rpc(
            "get_seller_goal_stats",
            { p_vendedor_id: args.vendedor_id }
          );
          result = perfVendedor;
          break;

        case "buscar_ranking_vendedores":
          const { data: ranking } = await supabase
            .from("tendenci_seller_ranking")
            .select(`
              posicao_atual, percentual_meta_atualizado, valor_total_vendido,
              vendedor:profiles(full_name)
            `)
            .order("posicao_atual", { ascending: true })
            .limit(10);
          result = ranking;
          break;

        case "buscar_meta_diaria":
          const hoje = new Date().toISOString().split("T")[0];
          const { data: metasDiarias } = await supabase
            .from("tendenci_daily_architect_goals")
            .select(`
              meta_captacoes, captacoes_realizadas, data,
              vendedor:profiles(full_name)
            `)
            .eq("data", hoje);
          result = metasDiarias;
          break;

        // ==================== PROJETOS ====================
        case "buscar_projetos":
          let queryProj = supabase
            .from("projects")
            .select(`
              id, name, value, stage, deadline, created_at,
              client:clients(name),
              architect:architects(name),
              designer:profiles(full_name)
            `);
          
          if (args.stage && args.stage !== "todos") {
            queryProj = queryProj.eq("stage", args.stage);
          }
          
          const { data: projects } = await queryProj
            .order("created_at", { ascending: false })
            .limit(20);
          result = projects;
          break;

        case "buscar_metricas_projetos":
          const { data: metricasProj } = await supabase.rpc("projects_metrics");
          result = metricasProj;
          break;

        case "buscar_alertas_prazo":
          const { data: alertasPrazo } = await supabase
            .from("projects")
            .select(`
              id, name, value, deadline, stage,
              client:clients(name),
              architect:architects(name)
            `)
            .not("stage", "in", '("aprovado","perdido")')
            .not("deadline", "is", null)
            .lt("deadline", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
            .order("deadline", { ascending: true });
          result = alertasPrazo;
          break;

        // ==================== ARQUITETOS ====================
        case "buscar_arquitetos_inativos":
          const diasInativo = args.dias || 30;
          const dataLimite = new Date();
          dataLimite.setDate(dataLimite.getDate() - diasInativo);
          
          const { data: inactiveArchs } = await supabase
            .from("architects")
            .select("id, name, phone, email, categoria, ultimo_projeto_data, data_ultimo_contato")
            .eq("active", true)
            .or(`ultimo_projeto_data.lt.${dataLimite.toISOString()},ultimo_projeto_data.is.null`)
            .order("ultimo_projeto_data", { ascending: true, nullsFirst: true })
            .limit(20);
          result = inactiveArchs;
          break;

        case "buscar_performance_arquitetos":
          const { data: perfArqs } = await supabase.rpc(
            "architect_performance_metrics",
            { period_days: args.periodo_dias || 30 }
          );
          result = perfArqs;
          break;

        case "buscar_aniversarios":
          const { data: aniversarios } = await supabase
            .from("architects")
            .select("id, name, phone, birthday, categoria")
            .not("birthday", "is", null)
            .eq("active", true);
          
          // Filtrar próximos 30 dias
          const hoje2 = new Date();
          const proximos30 = (aniversarios || []).filter(arq => {
            if (!arq.birthday) return false;
            const [_, mes, dia] = arq.birthday.split("-");
            const aniv = new Date(hoje2.getFullYear(), parseInt(mes) - 1, parseInt(dia));
            if (aniv < hoje2) aniv.setFullYear(aniv.getFullYear() + 1);
            const diff = (aniv.getTime() - hoje2.getTime()) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 30;
          });
          result = proximos30;
          break;

        // ==================== LEADS ====================
        case "buscar_leads_quentes":
          const { data: hotLeads } = await supabase
            .from("leads")
            .select(`
              id, temperature, created_at, status,
              client:clients(name, phone, email)
            `)
            .eq("temperature", "quente")
            .eq("status", "novo")
            .order("created_at", { ascending: false })
            .limit(15);
          result = hotLeads;
          break;

        case "buscar_metricas_leads":
          const { data: metricasLeads } = await supabase.rpc("leads_aggregates");
          result = metricasLeads;
          break;

        // ==================== PRODUÇÃO ====================
        case "buscar_metricas_producao":
          const { data: ordensProducao } = await supabase
            .from("production_orders")
            .select("id, status, priority")
            .in("status", ["pendente", "em_producao", "pausado"]);
          
          const metricsProducao = {
            total_ordens_ativas: ordensProducao?.length || 0,
            pendentes: ordensProducao?.filter(o => o.status === "pendente").length || 0,
            em_producao: ordensProducao?.filter(o => o.status === "em_producao").length || 0,
            pausadas: ordensProducao?.filter(o => o.status === "pausado").length || 0,
            urgentes: ordensProducao?.filter(o => o.priority === "urgente").length || 0
          };
          result = metricsProducao;
          break;

        case "buscar_alertas_producao":
          const { data: alertasProd } = await supabase
            .from("production_orders")
            .select(`
              id, order_number, status, priority, planned_end_date,
              client:clients(name)
            `)
            .in("status", ["pendente", "em_producao"])
            .or(`priority.eq.urgente,planned_end_date.lt.${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()}`)
            .limit(15);
          result = alertasProd;
          break;

        // ==================== PEDIDOS ====================
        case "buscar_metricas_pedidos":
          const mesAtual = new Date();
          const inicioMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).toISOString();
          
          const { data: pedidosMes } = await supabase
            .from("orders")
            .select("id, valor_total, status")
            .gte("created_at", inicioMes);
          
          const metricsPedidos = {
            total_pedidos_mes: pedidosMes?.length || 0,
            valor_total_mes: pedidosMes?.reduce((acc, p) => acc + (p.valor_total || 0), 0) || 0,
            pendentes: pedidosMes?.filter(p => p.status === "pendente").length || 0,
            aprovados: pedidosMes?.filter(p => p.status === "aprovado").length || 0,
            faturados: pedidosMes?.filter(p => p.status === "faturado").length || 0
          };
          result = metricsPedidos;
          break;

        // ==================== ESTOQUE ====================
        case "buscar_alertas_estoque":
          const { data: todosProducts } = await supabase
            .from("products")
            .select("id, name, sku, current_stock, min_stock")
            .eq("active", true);
          
          const produtosBaixoEstoque = (todosProducts || []).filter(
            p => p.current_stock < (p.min_stock || 0)
          );
          result = produtosBaixoEstoque.slice(0, 20);
          break;

        // ==================== CAMPANHAS ====================
        case "buscar_metricas_campanhas":
          const { data: campanhas } = await supabase
            .from("prospeccao_campanhas")
            .select(`
              id, nome, status, tipo, 
              total_enviados, total_entregues, total_erros,
              created_at
            `)
            .order("created_at", { ascending: false })
            .limit(10);
          result = campanhas;
          break;

        // ==================== DIAGNÓSTICO GERAL ====================
        case "diagnostico_geral":
          // Buscar múltiplas métricas em paralelo
          const [
            { data: crmMetrics },
            { data: metaEmpresa },
            { data: alertasSLA },
            { data: projetosAtrasados },
            { data: leadsQuentes }
          ] = await Promise.all([
            supabase.rpc("dashboard_crm_metrics"),
            supabase.from("tendenci_company_goals").select("*").eq("status", "ativa").single(),
            supabase.rpc("crm_sla_alerts", { p_pipeline_id: null }),
            supabase.from("projects")
              .select("id")
              .lt("deadline", new Date().toISOString())
              .not("stage", "in", '("aprovado","perdido")'),
            supabase.from("leads")
              .select("id")
              .eq("temperature", "quente")
              .eq("status", "novo")
          ]);

          // Calcular progresso da meta da empresa
          let progressoMeta = null;
          if (metaEmpresa) {
            const { data: progEmpresa } = await supabase
              .from("tendenci_goal_progress")
              .select("valor_vendido, percentual")
              .eq("company_goal_id", metaEmpresa.id)
              .single();
            progressoMeta = {
              meta: metaEmpresa.valor_meta_total,
              vendido: progEmpresa?.valor_vendido || 0,
              percentual: progEmpresa?.percentual || 0
            };
          }

          const acoes: string[] = [];
          
          // Gerar ações recomendadas
          if ((alertasSLA?.length || 0) > 0) {
            acoes.push(`🚨 ${alertasSLA?.length || 0} negócios ultrapassaram SLA - priorizar contato`);
          }
          if ((projetosAtrasados?.length || 0) > 0) {
            acoes.push(`⚠️ ${projetosAtrasados?.length || 0} projetos com prazo vencido`);
          }
          if ((leadsQuentes?.length || 0) > 0) {
            acoes.push(`🔥 ${leadsQuentes?.length || 0} leads quentes aguardando atendimento`);
          }
          if (progressoMeta && progressoMeta.percentual < 50) {
            acoes.push(`📊 Meta da empresa em ${progressoMeta.percentual.toFixed(1)}% - intensificar vendas`);
          }

          result = {
            crm: crmMetrics,
            meta_empresa: progressoMeta,
            alertas: {
              sla_atrasados: alertasSLA?.length || 0,
              projetos_atrasados: projetosAtrasados?.length || 0,
              leads_quentes_pendentes: leadsQuentes?.length || 0
            },
            acoes_recomendadas: acoes
          };
          break;

        default:
          result = { error: "Ferramenta não encontrada" };
      }

      console.log(`Resultado da ferramenta ${functionName}:`, JSON.stringify(result).substring(0, 500));

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

    const systemPrompt = `Você é o Agente Tendenci, um especialista sênior em gestão comercial e vendas B2B com 15+ anos de experiência no mercado de móveis e decoração.

🎯 PERSONALIDADE:
- Respostas CURTAS e DIRETAS (máximo 3-4 linhas)
- Tom profissional mas acessível, como um mentor experiente
- Sempre baseado em dados REAIS do sistema - NUNCA invente números
- Foco em AÇÃO: sempre termine com uma recomendação prática
- Use emojis estrategicamente para destacar alertas

📊 EXPERTISE:
- Gestão de pipeline de vendas e funil comercial
- Análise de performance de vendedores (metas, conversão, ticket médio)
- Gestão de relacionamento com arquitetos parceiros
- Métricas de conversão e SLA de atendimento
- Metas individuais e consolidadas da empresa
- Projeção de resultados e tendências

🔧 FORMATO DE RESPOSTAS:
- Use emojis: 🚨 crítico | ⚠️ atenção | ✅ ok | 📈 subindo | 📉 caindo | 🎯 meta | 🔥 urgente
- Valores SEMPRE em R$ formatados (ex: R$ 45.230,00)
- Compare com metas e médias quando possível
- Se identificar problema, já sugira a solução

📋 REGRAS CRÍTICAS:
1. SEMPRE consulte os dados REAIS antes de responder usando as ferramentas disponíveis
2. Se não encontrar dados, diga "Não encontrei essa informação no sistema"
3. Priorize métricas que impactam resultado financeiro
4. Compare performance individual vs equipe quando relevante
5. Identifique padrões e tendências nos dados

💡 EXEMPLOS DE ANÁLISE:
- "O vendedor X está 15% abaixo da meta, mas teve 3 fechamentos esta semana. Sugiro revisar ticket médio."
- "Pipeline saudável: 45 negócios, R$ 890k em potencial. Atenção: 8 deals acima do SLA."
- "Taxa de conversão caiu 5% este mês. Possível causa: leads frios entrando no funil."`;

    const tools = [
      // CRM
      {
        type: "function",
        function: {
          name: "buscar_metricas_crm",
          description: "Métricas gerais do CRM: total de negócios, ganhos, perdidos, valores, ticket médio",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_negocios_pipeline",
          description: "Lista negócios abertos com detalhes: cliente, valor, etapa, responsável, tempo na etapa",
          parameters: {
            type: "object",
            properties: {
              pipeline_id: { type: "string", description: "ID do funil (opcional)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_alertas_sla",
          description: "Negócios que ultrapassaram o SLA da etapa - precisam de ação urgente",
          parameters: {
            type: "object",
            properties: {
              pipeline_id: { type: "string", description: "ID do funil (opcional)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_funil_conversao",
          description: "Análise de funil: quantidade de negócios por etapa e taxa de conversão",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // Metas e Vendedores
      {
        type: "function",
        function: {
          name: "buscar_metas_vendedores",
          description: "Metas ativas de todos os vendedores com progresso atual (valor vendido, percentual)",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_performance_vendedor",
          description: "Performance detalhada de um vendedor específico: meta, vendas, ranking, insígnias",
          parameters: {
            type: "object",
            properties: {
              vendedor_id: { type: "string", description: "UUID do vendedor" }
            },
            required: ["vendedor_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_ranking_vendedores",
          description: "Ranking dos vendedores por percentual de meta atingida e valor vendido",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_meta_diaria",
          description: "Metas diárias de captação de arquitetos - captações realizadas vs meta",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // Projetos
      {
        type: "function",
        function: {
          name: "buscar_projetos",
          description: "Lista projetos com filtros por estágio: recebido, em_orcamento, orcado, apresentado, aprovado, perdido",
          parameters: {
            type: "object",
            properties: {
              stage: { type: "string", enum: ["recebido", "em_orcamento", "orcado", "apresentado", "em_negociacao", "aprovado", "perdido", "todos"], description: "Estágio do projeto" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_metricas_projetos",
          description: "Métricas de projetos: quantidade por etapa, valor aprovado, alertas de prazo",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_alertas_prazo",
          description: "Projetos com prazo vencendo nos próximos 7 dias ou já vencidos",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // Arquitetos
      {
        type: "function",
        function: {
          name: "buscar_arquitetos_inativos",
          description: "Arquitetos sem enviar projetos há X dias - precisam de reativação",
          parameters: {
            type: "object",
            properties: {
              dias: { type: "number", description: "Dias de inatividade (padrão: 30)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_performance_arquitetos",
          description: "Performance dos arquitetos: projetos enviados, aprovados, perdidos, valor total",
          parameters: {
            type: "object",
            properties: {
              periodo_dias: { type: "number", description: "Período em dias para análise (padrão: 30)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_aniversarios",
          description: "Arquitetos com aniversário nos próximos 30 dias",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // Leads
      {
        type: "function",
        function: {
          name: "buscar_leads_quentes",
          description: "Leads com temperatura QUENTE aguardando atendimento - prioridade máxima",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_metricas_leads",
          description: "Métricas de leads: total, por temperatura, taxa de conversão para CRM",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // Produção
      {
        type: "function",
        function: {
          name: "buscar_metricas_producao",
          description: "Status da produção: ordens ativas, pendentes, em produção, pausadas, urgentes",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_alertas_producao",
          description: "Ordens de produção urgentes ou com prazo próximo do vencimento",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // Pedidos
      {
        type: "function",
        function: {
          name: "buscar_metricas_pedidos",
          description: "Métricas de pedidos do mês: quantidade, valor total, por status",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // Estoque
      {
        type: "function",
        function: {
          name: "buscar_alertas_estoque",
          description: "Produtos com estoque abaixo do mínimo - precisam de reposição",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // Campanhas
      {
        type: "function",
        function: {
          name: "buscar_metricas_campanhas",
          description: "Métricas de campanhas de prospecção: enviadas, entregues, erros",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // Diagnóstico
      {
        type: "function",
        function: {
          name: "diagnostico_geral",
          description: "Diagnóstico completo do sistema: CRM, metas, alertas, ações recomendadas. Use para perguntas como 'como está a empresa?' ou 'análise geral'",
          parameters: { type: "object", properties: {}, required: [] }
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
        model: "google/gemini-3-pro-preview",
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
          model: "google/gemini-3-pro-preview",
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
