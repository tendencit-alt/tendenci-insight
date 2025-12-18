import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

// Função para calcular dias úteis entre duas datas
function getBusinessDaysAgo(days: number): Date {
  const date = new Date();
  let businessDays = 0;
  while (businessDays < days) {
    date.setDate(date.getDate() - 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }
  return date;
}

// Função para obter início e fim do mês
function getMonthBounds(monthsAgo: number = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59);
  return { start, end };
}

async function processToolCalls(toolCalls: any[]) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const results = [];

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments || "{}");
    
    console.log(`[Tendenci CEO] Executando: ${functionName}`, args);
    
    let result;

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { start: inicioMesAtual, end: fimMesAtual } = getMonthBounds(0);
      const { start: inicioMesAnterior, end: fimMesAnterior } = getMonthBounds(1);

      switch (functionName) {
        // ==================== CRM BÁSICO ====================
        case "buscar_metricas_crm":
          const { data: crmData, error: crmError } = await supabase.rpc("dashboard_crm_metrics", {
            p_start: thirtyDaysAgo.toISOString(),
            p_end: now.toISOString()
          });
          if (crmError) console.error("[Tendenci] Erro buscar_metricas_crm:", crmError);
          result = crmData;
          break;

        case "buscar_negocios_pipeline":
          const { data: pipelines } = await supabase.from("crm_pipelines").select("id").limit(1);
          const pipelineId = args.pipeline_id || pipelines?.[0]?.id;
          
          const { data: deals } = await supabase
            .from("crm_deals")
            .select(`
              id, title, value, status, created_at, stage_entered_at, categoria, tipo_produto,
              lead:leads(client:clients(name, phone, email)),
              stage:crm_stages(name, sla_hours, position),
              owner:profiles(full_name, email),
              architect:architects(name, phone)
            `)
            .eq("pipeline_id", pipelineId)
            .eq("status", "aberto")
            .order("value", { ascending: false })
            .limit(50);
          result = deals;
          break;

        case "buscar_alertas_sla":
          const { data: pipelinesSLA } = await supabase.from("crm_pipelines").select("id").limit(1);
          const pipelineIdSLA = args.pipeline_id || pipelinesSLA?.[0]?.id;
          
          if (pipelineIdSLA) {
            const { data: slaAlerts } = await supabase.rpc("crm_sla_alerts", { p_pipeline_id: pipelineIdSLA });
            result = slaAlerts;
          } else {
            result = [];
          }
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
            
            const { data: valorEtapa } = await supabase
              .from("crm_deals")
              .select("value")
              .eq("stage_id", stage.id)
              .eq("status", "aberto");
            
            funilData.push({
              etapa: stage.name,
              posicao: stage.position,
              total_negocios: total || 0,
              ganhos: ganhos || 0,
              valor_pipeline: valorEtapa?.reduce((a, d) => a + (d.value || 0), 0) || 0,
              taxa_conversao: total ? ((ganhos || 0) / total * 100).toFixed(1) + "%" : "0%"
            });
          }
          result = funilData;
          break;

        // ==================== CRM AVANÇADO (NOVAS) ====================
        case "buscar_tendencias_crm":
          // Série temporal dos últimos 90 dias
          const { data: timeseries } = await supabase.rpc("crm_timeseries", {
            p_start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            p_end: now.toISOString()
          });
          result = timeseries;
          break;

        case "buscar_tempo_etapas":
          // Tempo médio em cada etapa
          const { data: timeInStage } = await supabase.rpc("crm_time_in_stage");
          result = timeInStage;
          break;

        case "buscar_agregacoes_crm":
          const periodoInicio = args.data_inicio || thirtyDaysAgo.toISOString();
          const periodoFim = args.data_fim || now.toISOString();
          const { data: crmAgg } = await supabase.rpc("crm_agg", {
            p_start: periodoInicio,
            p_end: periodoFim
          });
          result = crmAgg;
          break;

        case "buscar_deals_sem_tarefas":
          // Deals sem tarefas válidas - risco de abandono
          const { data: dealsSemTarefas } = await supabase.rpc("get_deals_without_valid_tasks");
          result = dealsSemTarefas;
          break;

        case "buscar_deal":
          // Detalhes completos de um deal específico
          if (!args.deal_id) {
            result = { error: "deal_id é obrigatório" };
            break;
          }
          const { data: dealDetail } = await supabase
            .from("crm_deals")
            .select(`
              *,
              lead:leads(*, client:clients(*)),
              stage:crm_stages(name, position, sla_hours),
              owner:profiles(full_name, email),
              architect:architects(name, phone, email, categoria, tier),
              tasks:crm_tasks(id, title, status, due_at, tipo_tarefa),
              timeline:crm_timeline(id, message, update_type, created_at)
            `)
            .eq("id", args.deal_id)
            .single();
          result = dealDetail;
          break;

        case "buscar_historico_deal":
          if (!args.deal_id) {
            result = { error: "deal_id é obrigatório" };
            break;
          }
          const { data: dealHistory } = await supabase
            .from("crm_deal_history")
            .select(`
              *,
              from_stage:crm_stages!crm_deal_history_from_stage_id_fkey(name),
              to_stage:crm_stages!crm_deal_history_to_stage_id_fkey(name),
              moved_by_user:profiles!crm_deal_history_moved_by_fkey(full_name)
            `)
            .eq("deal_id", args.deal_id)
            .order("created_at", { ascending: false });
          result = dealHistory;
          break;

        // ==================== CLIENTES ====================
        case "buscar_clientes":
          const { data: clientsData } = await supabase
            .from("clients")
            .select(`
              id, name, phone, email, city, state, cpf_cnpj, tipo_pessoa, created_at
            `)
            .order("created_at", { ascending: false })
            .limit(args.limite || 50);
          
          // Buscar métricas de cada cliente
          const clientsComMetricas = [];
          for (const client of clientsData || []) {
            const { data: leads } = await supabase
              .from("leads")
              .select("id")
              .eq("client_id", client.id);
            
            const { data: dealsCliente } = await supabase
              .from("crm_deals")
              .select("id, value, status")
              .in("lead_id", leads?.map(l => l.id) || []);
            
            clientsComMetricas.push({
              ...client,
              total_leads: leads?.length || 0,
              total_deals: dealsCliente?.length || 0,
              deals_ganhos: dealsCliente?.filter(d => d.status === "won").length || 0,
              valor_total_ganho: dealsCliente?.filter(d => d.status === "won").reduce((a, d) => a + (d.value || 0), 0) || 0
            });
          }
          result = clientsComMetricas;
          break;

        case "buscar_performance_cliente":
          if (!args.client_id) {
            result = { error: "client_id é obrigatório" };
            break;
          }
          const { data: clienteInfo } = await supabase
            .from("clients")
            .select("*")
            .eq("id", args.client_id)
            .single();
          
          const { data: leadsCliente } = await supabase
            .from("leads")
            .select("id, created_at, temperature, status")
            .eq("client_id", args.client_id);
          
          const leadIds = leadsCliente?.map(l => l.id) || [];
          const { data: dealsClientePerf } = await supabase
            .from("crm_deals")
            .select("id, title, value, status, created_at, stage:crm_stages(name)")
            .in("lead_id", leadIds);
          
          const { data: projetosCliente } = await supabase
            .from("projects")
            .select("id, name, value, stage, created_at")
            .eq("client_id", args.client_id);
          
          result = {
            cliente: clienteInfo,
            leads: leadsCliente,
            deals: dealsClientePerf,
            projetos: projetosCliente,
            metricas: {
              total_leads: leadsCliente?.length || 0,
              total_deals: dealsClientePerf?.length || 0,
              deals_ganhos: dealsClientePerf?.filter(d => d.status === "won").length || 0,
              deals_perdidos: dealsClientePerf?.filter(d => d.status === "lost").length || 0,
              valor_total: dealsClientePerf?.filter(d => d.status === "won").reduce((a, d) => a + (d.value || 0), 0) || 0,
              ticket_medio: (() => {
                const ganhos = dealsClientePerf?.filter(d => d.status === "won") || [];
                return ganhos.length ? ganhos.reduce((a, d) => a + (d.value || 0), 0) / ganhos.length : 0;
              })()
            }
          };
          break;

        // ==================== ARQUITETOS AVANÇADO ====================
        case "buscar_agregacoes_arquitetos":
          const { data: archAgg } = await supabase.rpc("architects_aggregates");
          result = archAgg;
          break;

        case "buscar_ranking_arquitetos":
          const tipoRanking = args.tipo || "valor_indicado";
          const { data: archRanking } = await supabase.rpc("get_architect_ranking_by_type", {
            p_ranking_type: tipoRanking,
            p_limit: args.limite || 20
          });
          result = archRanking;
          break;

        case "buscar_indicacoes_arquitetos":
          const { data: indicStats } = await supabase.rpc("get_architect_indication_stats", {
            p_start_date: thirtyDaysAgo.toISOString().split("T")[0],
            p_end_date: now.toISOString().split("T")[0]
          });
          result = indicStats;
          break;

        case "buscar_arquiteto":
          if (!args.architect_id) {
            result = { error: "architect_id é obrigatório" };
            break;
          }
          const { data: archDetail } = await supabase
            .from("architects")
            .select(`
              *,
              vendedor:profiles!architects_vendedor_responsavel_fkey(full_name, email),
              timeline:architect_timeline(id, message, update_type, created_at),
              projetos:architect_projects(id, nome_projeto, valor, tipo, data_projeto)
            `)
            .eq("id", args.architect_id)
            .single();
          
          // Buscar indicações
          const { data: archIndicacoes } = await supabase
            .from("architect_indications")
            .select(`
              id, product_type, value, categoria, created_at,
              deal:crm_deals(id, title, value, status)
            `)
            .eq("architect_id", args.architect_id)
            .order("created_at", { ascending: false })
            .limit(20);
          
          result = { ...archDetail, indicacoes: archIndicacoes };
          break;

        case "buscar_arquitetos_inativos":
          const diasInativo = args.dias || 30;
          const dataLimite = new Date();
          dataLimite.setDate(dataLimite.getDate() - diasInativo);
          
          const { data: inactiveArchs } = await supabase
            .from("architects")
            .select(`
              id, name, phone, email, categoria, tier, city,
              ultimo_projeto_data, data_ultimo_contato,
              vendedor:profiles!architects_vendedor_responsavel_fkey(full_name)
            `)
            .eq("active", true)
            .or(`ultimo_projeto_data.lt.${dataLimite.toISOString()},ultimo_projeto_data.is.null`)
            .order("ultimo_projeto_data", { ascending: true, nullsFirst: true })
            .limit(30);
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
            .select("id, name, phone, birthday, categoria, tier")
            .not("birthday", "is", null)
            .eq("active", true);
          
          const hoje2 = new Date();
          const proximos30 = (aniversarios || []).filter(arq => {
            if (!arq.birthday) return false;
            const [_, mes, dia] = arq.birthday.split("-");
            const aniv = new Date(hoje2.getFullYear(), parseInt(mes) - 1, parseInt(dia));
            if (aniv < hoje2) aniv.setFullYear(aniv.getFullYear() + 1);
            const diff = (aniv.getTime() - hoje2.getTime()) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 30;
          }).map(arq => ({
            ...arq,
            dias_para_aniversario: (() => {
              const [_, mes, dia] = arq.birthday!.split("-");
              const aniv = new Date(hoje2.getFullYear(), parseInt(mes) - 1, parseInt(dia));
              if (aniv < hoje2) aniv.setFullYear(aniv.getFullYear() + 1);
              return Math.ceil((aniv.getTime() - hoje2.getTime()) / (1000 * 60 * 60 * 24));
            })()
          })).sort((a, b) => a.dias_para_aniversario - b.dias_para_aniversario);
          result = proximos30;
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
              percentual: progresso?.percentual || 0,
              falta_para_meta: (meta.valor_meta || 0) - (progresso?.valor_vendido || 0)
            });
          }
          result = metasComProgresso.sort((a, b) => b.percentual - a.percentual);
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

        case "buscar_performance_detalhada_vendedor":
          if (!args.vendedor_id) {
            result = { error: "vendedor_id é obrigatório" };
            break;
          }
          // Buscar meta ativa
          const { data: metaAtiva } = await supabase
            .from("tendenci_seller_goals")
            .select("id")
            .eq("vendedor_id", args.vendedor_id)
            .eq("status", "ativa")
            .single();
          
          if (metaAtiva) {
            const { data: perfDetalhada } = await supabase.rpc("get_seller_performance_by_goal", {
              p_seller_goal_id: metaAtiva.id
            });
            result = perfDetalhada;
          } else {
            result = { error: "Vendedor não possui meta ativa" };
          }
          break;

        case "buscar_ranking_vendedores":
          const { data: ranking } = await supabase
            .from("tendenci_seller_ranking")
            .select(`
              posicao_atual, percentual_meta_atualizado, valor_total_vendido,
              vendedor:profiles(id, full_name, email)
            `)
            .order("posicao_atual", { ascending: true })
            .limit(15);
          result = ranking;
          break;

        case "comparar_vendedores":
          // Comparativo completo dos vendedores
          const { data: todosVendedores } = await supabase
            .from("tendenci_seller_goals")
            .select(`
              id, valor_meta, vendedor_id,
              vendedor:profiles!tendenci_seller_goals_vendedor_id_fkey(id, full_name)
            `)
            .eq("status", "ativa");
          
          const comparativo = [];
          for (const v of todosVendedores || []) {
            const vendedorData = Array.isArray(v.vendedor) ? v.vendedor[0] : v.vendedor;
            const { data: prog } = await supabase
              .from("tendenci_goal_progress")
              .select("valor_vendido, percentual, deals_fechados")
              .eq("seller_goal_id", v.id)
              .single();
            
            // Deals do vendedor
            const { data: dealsVend } = await supabase
              .from("crm_deals")
              .select("id, value, status")
              .eq("owner_id", v.vendedor_id)
              .gte("created_at", inicioMesAtual.toISOString());
            
            comparativo.push({
              vendedor: vendedorData?.full_name,
              vendedor_id: vendedorData?.id,
              meta: v.valor_meta,
              vendido: prog?.valor_vendido || 0,
              percentual: prog?.percentual || 0,
              deals_abertos: dealsVend?.filter(d => d.status === "aberto").length || 0,
              deals_ganhos_mes: dealsVend?.filter(d => d.status === "won").length || 0,
              pipeline_valor: dealsVend?.filter(d => d.status === "aberto").reduce((a, d) => a + (d.value || 0), 0) || 0
            });
          }
          
          // Calcular média
          const mediaPercentual = comparativo.length 
            ? comparativo.reduce((a, v) => a + v.percentual, 0) / comparativo.length 
            : 0;
          
          result = {
            vendedores: comparativo.sort((a, b) => b.percentual - a.percentual),
            media_equipe: mediaPercentual,
            total_equipe: comparativo.reduce((a, v) => a + v.vendido, 0)
          };
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

        case "buscar_stats_metas_diarias":
          const periodoStats = args.periodo_dias || 7;
          const dataInicioPeriodo = new Date();
          dataInicioPeriodo.setDate(dataInicioPeriodo.getDate() - periodoStats);
          
          const { data: dailyStats } = await supabase.rpc("get_daily_goal_stats", {
            p_start_date: dataInicioPeriodo.toISOString().split("T")[0],
            p_end_date: now.toISOString().split("T")[0]
          });
          result = dailyStats;
          break;

        // ==================== PROJETOS ====================
        case "buscar_projetos":
          let queryProj = supabase
            .from("projects")
            .select(`
              id, name, value, stage, deadline, created_at, sent_date, approved_date,
              client:clients(name, phone),
              architect:architects(name, phone, categoria),
              deal:crm_deals(id, title, status)
            `);
          
          if (args.stage && args.stage !== "todos") {
            queryProj = queryProj.eq("stage", args.stage);
          }
          
          const { data: projects } = await queryProj
            .order("created_at", { ascending: false })
            .limit(30);
          result = projects;
          break;

        case "buscar_metricas_projetos":
          const { data: metricasProj } = await supabase.rpc("projects_metrics");
          result = metricasProj;
          break;

        case "buscar_stats_tipo_produto":
          const { data: statsTipo } = await supabase.rpc("get_project_stats_by_type");
          result = statsTipo;
          break;

        case "buscar_metricas_projetos_historico":
          const { data: projHistorico } = await supabase.rpc("projects_metrics_by_history", {
            p_months: args.meses || 6
          });
          result = projHistorico;
          break;

        case "buscar_alertas_prazo":
          const { data: alertasPrazo } = await supabase
            .from("projects")
            .select(`
              id, name, value, deadline, stage, created_at,
              client:clients(name, phone),
              architect:architects(name)
            `)
            .not("stage", "in", '("aprovado","perdido")')
            .not("deadline", "is", null)
            .lt("deadline", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
            .order("deadline", { ascending: true });
          
          result = (alertasPrazo || []).map(p => ({
            ...p,
            dias_restantes: Math.ceil((new Date(p.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            atrasado: new Date(p.deadline) < now
          }));
          break;

        // ==================== LEADS ====================
        case "buscar_leads_quentes":
          const { data: hotLeads } = await supabase
            .from("leads")
            .select(`
              id, temperature, created_at, status, utm_source, utm_campaign,
              client:clients(name, phone, email, city)
            `)
            .eq("temperature", "quente")
            .eq("status", "novo")
            .order("created_at", { ascending: false })
            .limit(20);
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
            .select("id, status, priority, planned_end_date")
            .in("status", ["pendente", "em_producao", "pausado"]);
          
          const atrasadas = (ordensProducao || []).filter(
            o => o.planned_end_date && new Date(o.planned_end_date) < now
          ).length;
          
          result = {
            total_ordens_ativas: ordensProducao?.length || 0,
            pendentes: ordensProducao?.filter(o => o.status === "pendente").length || 0,
            em_producao: ordensProducao?.filter(o => o.status === "em_producao").length || 0,
            pausadas: ordensProducao?.filter(o => o.status === "pausado").length || 0,
            urgentes: ordensProducao?.filter(o => o.priority === "urgente").length || 0,
            atrasadas: atrasadas
          };
          break;

        case "buscar_alertas_producao":
          const { data: alertasProd } = await supabase
            .from("production_orders")
            .select(`
              id, order_number, status, priority, planned_end_date, created_at,
              client:clients(name, phone),
              order:orders(order_number, valor_total)
            `)
            .in("status", ["pendente", "em_producao"])
            .or(`priority.eq.urgente,planned_end_date.lt.${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()}`)
            .limit(20);
          result = alertasProd;
          break;

        // ==================== PEDIDOS ====================
        case "buscar_metricas_pedidos":
          const { data: pedidosMes } = await supabase
            .from("orders")
            .select("id, valor_total, status, created_at")
            .gte("created_at", inicioMesAtual.toISOString());
          
          const { data: pedidosMesAnterior } = await supabase
            .from("orders")
            .select("valor_total, status")
            .gte("created_at", inicioMesAnterior.toISOString())
            .lt("created_at", fimMesAnterior.toISOString());
          
          const valorMes = pedidosMes?.reduce((acc, p) => acc + (p.valor_total || 0), 0) || 0;
          const valorMesAnterior = pedidosMesAnterior?.reduce((acc, p) => acc + (p.valor_total || 0), 0) || 0;
          
          result = {
            total_pedidos_mes: pedidosMes?.length || 0,
            valor_total_mes: valorMes,
            pendentes: pedidosMes?.filter(p => p.status === "pendente").length || 0,
            aprovados: pedidosMes?.filter(p => p.status === "aprovado").length || 0,
            faturados: pedidosMes?.filter(p => p.status === "faturado").length || 0,
            comparativo_mes_anterior: {
              valor_anterior: valorMesAnterior,
              variacao_percentual: valorMesAnterior ? ((valorMes - valorMesAnterior) / valorMesAnterior * 100).toFixed(1) : "N/A"
            }
          };
          break;

        // ==================== ESTOQUE ====================
        case "buscar_alertas_estoque":
          const { data: todosProducts } = await supabase
            .from("products")
            .select("id, name, code, current_stock, min_stock, cost_price, sale_price")
            .eq("active", true);
          
          const produtosBaixoEstoque = (todosProducts || [])
            .filter(p => p.current_stock < (p.min_stock || 0))
            .map(p => ({
              ...p,
              deficit: (p.min_stock || 0) - p.current_stock,
              valor_reposicao: ((p.min_stock || 0) - p.current_stock) * (p.cost_price || 0)
            }))
            .sort((a, b) => b.deficit - a.deficit);
          result = produtosBaixoEstoque.slice(0, 25);
          break;

        // ==================== CAMPANHAS ====================
        case "buscar_metricas_campanhas":
          const { data: campanhas } = await supabase
            .from("prospeccao_campanhas")
            .select(`
              id, nome, status, tipo, 
              total_enviados, total_entregues, total_erros,
              created_at, executed_at
            `)
            .order("created_at", { ascending: false })
            .limit(15);
          
          result = (campanhas || []).map(c => ({
            ...c,
            taxa_entrega: c.total_enviados ? ((c.total_entregues || 0) / c.total_enviados * 100).toFixed(1) + "%" : "0%",
            taxa_erro: c.total_enviados ? ((c.total_erros || 0) / c.total_enviados * 100).toFixed(1) + "%" : "0%"
          }));
          break;

        // ==================== ANÁLISE ESTRATÉGICA CEO ====================
        case "comparar_periodos":
          const periodoTipo = args.tipo || "mes"; // mes, trimestre
          
          let p1Start, p1End, p2Start, p2End;
          if (periodoTipo === "trimestre") {
            const trimAtual = Math.floor(now.getMonth() / 3);
            p1Start = new Date(now.getFullYear(), trimAtual * 3, 1);
            p1End = new Date(now.getFullYear(), (trimAtual + 1) * 3, 0);
            p2Start = new Date(now.getFullYear(), (trimAtual - 1) * 3, 1);
            p2End = new Date(now.getFullYear(), trimAtual * 3, 0);
          } else {
            p1Start = inicioMesAtual;
            p1End = fimMesAtual;
            p2Start = inicioMesAnterior;
            p2End = fimMesAnterior;
          }
          
          // Buscar métricas dos dois períodos
          const [{ data: metricasP1 }, { data: metricasP2 }] = await Promise.all([
            supabase.rpc("crm_agg", { p_start: p1Start.toISOString(), p_end: p1End.toISOString() }),
            supabase.rpc("crm_agg", { p_start: p2Start.toISOString(), p_end: p2End.toISOString() })
          ]);
          
          // Pedidos dos dois períodos
          const [{ data: pedidosP1 }, { data: pedidosP2 }] = await Promise.all([
            supabase.from("orders").select("valor_total, status").gte("created_at", p1Start.toISOString()).lte("created_at", p1End.toISOString()),
            supabase.from("orders").select("valor_total, status").gte("created_at", p2Start.toISOString()).lte("created_at", p2End.toISOString())
          ]);
          
          const valorPedidosP1 = pedidosP1?.reduce((a, p) => a + (p.valor_total || 0), 0) || 0;
          const valorPedidosP2 = pedidosP2?.reduce((a, p) => a + (p.valor_total || 0), 0) || 0;
          
          const calcVariacao = (atual: number, anterior: number) => 
            anterior ? ((atual - anterior) / anterior * 100).toFixed(1) : "N/A";
          
          result = {
            periodo_atual: {
              nome: periodoTipo === "trimestre" ? `Q${Math.floor(now.getMonth() / 3) + 1}` : now.toLocaleString('pt-BR', { month: 'long' }),
              inicio: p1Start.toISOString().split("T")[0],
              fim: p1End.toISOString().split("T")[0],
              crm: metricasP1,
              pedidos_valor: valorPedidosP1,
              pedidos_qtd: pedidosP1?.length || 0
            },
            periodo_anterior: {
              nome: periodoTipo === "trimestre" ? `Q${Math.floor(now.getMonth() / 3)}` : new Date(inicioMesAnterior).toLocaleString('pt-BR', { month: 'long' }),
              inicio: p2Start.toISOString().split("T")[0],
              fim: p2End.toISOString().split("T")[0],
              crm: metricasP2,
              pedidos_valor: valorPedidosP2,
              pedidos_qtd: pedidosP2?.length || 0
            },
            variacoes: {
              deals_valor: calcVariacao(metricasP1?.total_value || 0, metricasP2?.total_value || 0) + "%",
              deals_qtd: calcVariacao(metricasP1?.total_deals || 0, metricasP2?.total_deals || 0) + "%",
              pedidos_valor: calcVariacao(valorPedidosP1, valorPedidosP2) + "%",
              ticket_medio: calcVariacao(metricasP1?.avg_value || 0, metricasP2?.avg_value || 0) + "%"
            },
            tendencia: (metricasP1?.total_value || 0) > (metricasP2?.total_value || 0) ? "📈 crescimento" : "📉 queda"
          };
          break;

        case "prever_fechamento_mes":
          // Buscar deals abertos
          const { data: dealsAbertos } = await supabase
            .from("crm_deals")
            .select("id, value, stage_id, created_at, stage:crm_stages(position, name)")
            .eq("status", "aberto");
          
          // Taxa de conversão histórica por posição no funil
          const taxasConversao: { [key: number]: number } = {
            0: 0.15, // Primeira etapa
            1: 0.25,
            2: 0.40,
            3: 0.55,
            4: 0.70,
            5: 0.85
          };
          
          // Calcular previsão ponderada
          let previsaoTotal = 0;
          const dealsComPrevisao = [];
          for (const deal of dealsAbertos || []) {
            const stageData = Array.isArray(deal.stage) ? deal.stage[0] : deal.stage;
            const posicao = stageData?.position || 0;
            const taxa = taxasConversao[posicao] || 0.30;
            const previsaoDeal = (deal.value || 0) * taxa;
            previsaoTotal += previsaoDeal;
            dealsComPrevisao.push({
              titulo: deal.id,
              valor: deal.value,
              etapa: stageData?.name,
              probabilidade: `${(taxa * 100).toFixed(0)}%`,
              previsao: previsaoDeal
            });
          }
          
          const diasRestantesMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
          const pipelineTotal = dealsAbertos?.reduce((a, d) => a + (d.value || 0), 0) || 0;
          
          // Buscar meta da empresa
          const { data: metaEmpresaPrevisao } = await supabase
            .from("tendenci_company_goals")
            .select("valor_meta_total")
            .eq("status", "ativa")
            .single();
          
          // Valor já vendido no mês
          const { data: vendidoMes } = await supabase
            .from("crm_deals")
            .select("value")
            .eq("status", "won")
            .gte("updated_at", inicioMesAtual.toISOString());
          
          const jaVendido = vendidoMes?.reduce((a, d) => a + (d.value || 0), 0) || 0;
          const projecaoTotal = jaVendido + previsaoTotal;
          
          result = {
            pipeline_total: pipelineTotal,
            total_deals_abertos: dealsAbertos?.length || 0,
            previsao_fechamento: previsaoTotal,
            ja_vendido_mes: jaVendido,
            projecao_total_mes: projecaoTotal,
            meta_empresa: metaEmpresaPrevisao?.valor_meta_total || 0,
            percentual_projetado_meta: metaEmpresaPrevisao?.valor_meta_total 
              ? ((projecaoTotal / metaEmpresaPrevisao.valor_meta_total) * 100).toFixed(1) + "%"
              : "N/A",
            dias_restantes_mes: diasRestantesMes,
            confianca: "média (baseado em histórico)",
            top_oportunidades: dealsComPrevisao.sort((a, b) => b.previsao - a.previsao).slice(0, 10)
          };
          break;

        case "identificar_gargalos":
          // Tempo em cada etapa
          const { data: tempoEtapas } = await supabase.rpc("crm_time_in_stage");
          
          // Identificar gargalos (acima do SLA)
          const gargalos = [];
          for (const etapa of tempoEtapas || []) {
            const slaHoras = etapa.sla_hours || 24;
            const tempoMedio = etapa.avg_hours || 0;
            
            if (tempoMedio > slaHoras) {
              // Valor travado nesta etapa
              const { data: dealsEtapa } = await supabase
                .from("crm_deals")
                .select("id, value, title, stage_entered_at")
                .eq("stage_id", etapa.stage_id)
                .eq("status", "aberto");
              
              const valorTravado = dealsEtapa?.reduce((a, d) => a + (d.value || 0), 0) || 0;
              const dealsAtrasados = dealsEtapa?.filter(d => {
                const horasNaEtapa = (now.getTime() - new Date(d.stage_entered_at).getTime()) / (1000 * 60 * 60);
                return horasNaEtapa > slaHoras;
              }) || [];
              
              gargalos.push({
                etapa: etapa.stage_name,
                tempo_medio_horas: Math.round(tempoMedio),
                sla_horas: slaHoras,
                excesso_percentual: Math.round((tempoMedio / slaHoras - 1) * 100),
                deals_na_etapa: dealsEtapa?.length || 0,
                deals_atrasados: dealsAtrasados.length,
                valor_travado: valorTravado,
                acao_recomendada: tempoMedio > slaHoras * 2 
                  ? "🔴 CRÍTICO: Revisar processo urgente" 
                  : "🟡 ATENÇÃO: Monitorar e acelerar"
              });
            }
          }
          
          // Deals sem tarefas (outro tipo de gargalo)
          const { data: semTarefas } = await supabase.rpc("get_deals_without_valid_tasks");
          
          result = {
            gargalos_funil: gargalos.sort((a, b) => b.excesso_percentual - a.excesso_percentual),
            total_valor_travado: gargalos.reduce((a, g) => a + g.valor_travado, 0),
            deals_sem_tarefas: semTarefas?.length || 0,
            recomendacao_principal: gargalos.length > 0 
              ? `Priorizar etapa "${gargalos[0]?.etapa}" com R$ ${gargalos[0]?.valor_travado?.toLocaleString('pt-BR')} travados`
              : "Funil saudável, sem gargalos críticos"
          };
          break;

        // ==================== DIAGNÓSTICO GERAL CEO ====================
        case "diagnostico_geral":
          const diagNow = new Date();
          const diagThirtyDaysAgo = new Date(diagNow.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          const { data: defaultPipeline } = await supabase
            .from("crm_pipelines")
            .select("id")
            .limit(1)
            .single();
          
          const [
            { data: crmMetrics, error: diagCrmError },
            { data: metaEmpresa },
            { data: alertasSLA },
            { data: projetosAtrasados },
            { data: leadsQuentes },
            { data: tempoEtapasDiag },
            { data: dealsSemTarefasDiag }
          ] = await Promise.all([
            supabase.rpc("dashboard_crm_metrics", {
              p_start: diagThirtyDaysAgo.toISOString(),
              p_end: diagNow.toISOString()
            }),
            supabase.from("tendenci_company_goals").select("*").eq("status", "ativa").single(),
            defaultPipeline?.id 
              ? supabase.rpc("crm_sla_alerts", { p_pipeline_id: defaultPipeline.id })
              : Promise.resolve({ data: [] }),
            supabase.from("projects")
              .select("id, name, value")
              .lt("deadline", diagNow.toISOString())
              .not("stage", "in", '("aprovado","perdido")'),
            supabase.from("leads")
              .select("id")
              .eq("temperature", "quente")
              .eq("status", "novo"),
            supabase.rpc("crm_time_in_stage"),
            supabase.rpc("get_deals_without_valid_tasks")
          ]);
          
          if (diagCrmError) console.error("[Tendenci] Erro diagnóstico CRM:", diagCrmError);

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
              percentual: progEmpresa?.percentual || 0,
              falta: (metaEmpresa.valor_meta_total || 0) - (progEmpresa?.valor_vendido || 0)
            };
          }

          // Identificar maior gargalo
          const maiorGargalo = (tempoEtapasDiag || [])
            .filter((e: any) => (e.avg_hours || 0) > (e.sla_hours || 24))
            .sort((a: any, b: any) => (b.avg_hours / b.sla_hours) - (a.avg_hours / a.sla_hours))[0];

          const acoes: string[] = [];
          
          if ((alertasSLA?.length || 0) > 0) {
            acoes.push(`🚨 ${alertasSLA?.length || 0} negócios acima do SLA - contatar HOJE`);
          }
          if ((dealsSemTarefasDiag?.length || 0) > 0) {
            acoes.push(`⚠️ ${dealsSemTarefasDiag?.length || 0} deals sem tarefas - risco de abandono`);
          }
          if ((projetosAtrasados?.length || 0) > 0) {
            const valorAtrasado = projetosAtrasados?.reduce((a: number, p: any) => a + (p.value || 0), 0) || 0;
            acoes.push(`📋 ${projetosAtrasados?.length || 0} projetos atrasados (R$ ${valorAtrasado.toLocaleString('pt-BR')})`);
          }
          if ((leadsQuentes?.length || 0) > 0) {
            acoes.push(`🔥 ${leadsQuentes?.length || 0} leads QUENTES aguardando - prioridade máxima`);
          }
          if (progressoMeta && progressoMeta.percentual < 50) {
            acoes.push(`📊 Meta em ${progressoMeta.percentual.toFixed(1)}% - faltam R$ ${progressoMeta.falta.toLocaleString('pt-BR')}`);
          }
          if (maiorGargalo) {
            acoes.push(`🔴 Gargalo em "${maiorGargalo.stage_name}" - ${Math.round(maiorGargalo.avg_hours)}h vs SLA ${maiorGargalo.sla_hours}h`);
          }

          result = {
            resumo_executivo: {
              pipeline_total: crmMetrics?.pipeline_value || 0,
              deals_abertos: crmMetrics?.total_open || 0,
              ticket_medio: crmMetrics?.avg_value || 0,
              taxa_conversao: crmMetrics?.conversion_rate || 0
            },
            meta_empresa: progressoMeta,
            saude_pipeline: {
              sla_atrasados: alertasSLA?.length || 0,
              deals_sem_tarefas: dealsSemTarefasDiag?.length || 0,
              maior_gargalo: maiorGargalo ? {
                etapa: maiorGargalo.stage_name,
                tempo_medio: Math.round(maiorGargalo.avg_hours),
                sla: maiorGargalo.sla_hours
              } : null
            },
            alertas: {
              projetos_atrasados: projetosAtrasados?.length || 0,
              leads_quentes_pendentes: leadsQuentes?.length || 0
            },
            acoes_prioritarias: acoes.slice(0, 5),
            status_geral: acoes.length === 0 ? "🟢 Operação saudável" : 
                          acoes.length <= 2 ? "🟡 Atenção necessária" : "🔴 Ação urgente"
          };
          break;

        default:
          result = { error: `Ferramenta "${functionName}" não encontrada` };
      }

      console.log(`[Tendenci CEO] Resultado ${functionName}:`, JSON.stringify(result).substring(0, 800));

      results.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result || { error: "Sem dados" }),
      });
    } catch (error) {
      console.error(`[Tendenci CEO] Erro em ${functionName}:`, error);
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

    const systemPrompt = `Você é o **Agente Tendenci**, um DIRETOR COMERCIAL SÊNIOR (CCO) com 20+ anos de experiência em empresas milionárias do setor de móveis, decoração e marcenaria.

🎯 SEU PAPEL ESTRATÉGICO:
Você é o braço direito do CEO. Analisa dados em tempo real, identifica padrões, prevê tendências e dá recomendações estratégicas com base em DADOS CONCRETOS do sistema. Sua análise deve ter o nível de um consultor de R$ 50.000/mês.

💼 NÍVEL DE ANÁLISE C-LEVEL:
- **Visão holística**: Conecte dados de vendas, produção, arquitetos e clientes
- **Análise preditiva**: Identifique tendências e projete resultados do mês
- **Benchmarking**: Compare performances (vendedores x média, atual x anterior)
- **Gargalos**: Encontre onde o dinheiro está travando no funil
- **ROI de parcerias**: Avalie retorno dos arquitetos parceiros
- **Estratégia**: Sugira ações de alto impacto financeiro

📊 MÉTRICAS DE CEO (sempre inclua quando relevante):
- Pipeline health: valor total, conversão por etapa, velocidade
- Performance individual vs média da equipe
- Ticket médio e tendência (subindo/caindo)
- Tempo médio de fechamento e onde trava
- Arquitetos mais rentáveis (ROI real)
- Previsão de fechamento do mês vs meta
- Comparativo com período anterior

🔧 FORMATO CEO - MÁXIMA EFICIÊNCIA:
- 3-4 linhas MAX por insight (CEO não lê textão)
- Números SEMPRE comparativos: "R$ 45k (+12% vs mês anterior)"
- Use indicadores visuais: 🟢 ok | 🟡 atenção | 🔴 crítico | 📈 subindo | 📉 caindo
- Priorize pelo IMPACTO EM R$, não por urgência
- SEMPRE termine com: "**Ação recomendada:** [específica e executável]"

📋 REGRAS ABSOLUTAS:
1. SEMPRE use as ferramentas para consultar dados REAIS - NUNCA invente números
2. Se não encontrar dados, diga claramente: "Não encontrei essa informação"
3. Compare SEMPRE: atual vs meta, atual vs período anterior, individual vs equipe
4. Identifique a CAUSA raiz, não só o sintoma
5. Quantifique o impacto em R$ sempre que possível
6. Seja direto e estratégico - você é um consultor premium

💡 EXEMPLOS DE ANÁLISE CEO:

Pergunta: "Como está o pipeline?"
Resposta:
"📊 **Pipeline: R$ 890.450** (45 deals)
- Ticket médio: R$ 19.787 📈 (+8% vs mês anterior)  
- 🔴 8 deals acima do SLA na etapa "Proposta" (R$ 145k travados)
- Taxa conversão: 23% 📉 (era 28% - verificar qualificação)

**Ação:** Ligar para os 3 maiores deals em SLA hoje - potencial R$ 89k"

Pergunta: "Ranking de vendedores"
Resposta:
"🏆 **Ranking - Dezembro:**
1. João: 87% da meta (R$ 174k) ⭐ melhor conversão
2. Maria: 72% da meta (R$ 144k) - pipeline forte
3. Pedro: 45% da meta (R$ 90k) 🔴 abaixo média

📊 Média equipe: 68% | Meta empresa: 65% atingida

**Ação:** Reunião com Pedro para revisar pipeline (12 deals parados)"`;

    const tools = [
      // ==================== CRM BÁSICO ====================
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
          description: "Lista negócios abertos com detalhes: cliente, valor, etapa, responsável, arquiteto",
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
          description: "Análise de funil: quantidade e valor por etapa, taxa de conversão",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // ==================== CRM AVANÇADO ====================
      {
        type: "function",
        function: {
          name: "buscar_tendencias_crm",
          description: "Série temporal de métricas CRM dos últimos 90 dias - para análise de tendências",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_tempo_etapas",
          description: "Tempo médio que deals ficam em cada etapa - identificar gargalos",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_agregacoes_crm",
          description: "Agregações avançadas do CRM com filtro de período",
          parameters: {
            type: "object",
            properties: {
              data_inicio: { type: "string", description: "Data início (ISO)" },
              data_fim: { type: "string", description: "Data fim (ISO)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_deals_sem_tarefas",
          description: "Deals sem tarefas programadas - RISCO de abandono",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_deal",
          description: "Detalhes completos de um deal específico com histórico e tarefas",
          parameters: {
            type: "object",
            properties: {
              deal_id: { type: "string", description: "UUID do deal" }
            },
            required: ["deal_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_historico_deal",
          description: "Histórico de movimentações de um deal específico",
          parameters: {
            type: "object",
            properties: {
              deal_id: { type: "string", description: "UUID do deal" }
            },
            required: ["deal_id"]
          }
        }
      },
      // ==================== CLIENTES ====================
      {
        type: "function",
        function: {
          name: "buscar_clientes",
          description: "Lista clientes com métricas: leads, deals, valor total",
          parameters: {
            type: "object",
            properties: {
              limite: { type: "number", description: "Quantidade de clientes (padrão: 50)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_performance_cliente",
          description: "Performance detalhada de um cliente: histórico de compras, projetos, ticket médio",
          parameters: {
            type: "object",
            properties: {
              client_id: { type: "string", description: "UUID do cliente" }
            },
            required: ["client_id"]
          }
        }
      },
      // ==================== ARQUITETOS ====================
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
          name: "buscar_agregacoes_arquitetos",
          description: "Agregações de arquitetos: total por categoria, tier, status",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_ranking_arquitetos",
          description: "Ranking de arquitetos por tipo: valor_indicado, projetos_aprovados, quantidade_projetos",
          parameters: {
            type: "object",
            properties: {
              tipo: { type: "string", enum: ["valor_indicado", "projetos_aprovados", "quantidade_projetos"], description: "Tipo de ranking" },
              limite: { type: "number", description: "Quantidade no ranking (padrão: 20)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_indicacoes_arquitetos",
          description: "Estatísticas de indicações de arquitetos no período",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_arquiteto",
          description: "Detalhes completos de um arquiteto: timeline, projetos, indicações, vendedor responsável",
          parameters: {
            type: "object",
            properties: {
              architect_id: { type: "string", description: "UUID do arquiteto" }
            },
            required: ["architect_id"]
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
      // ==================== METAS E VENDEDORES ====================
      {
        type: "function",
        function: {
          name: "buscar_metas_vendedores",
          description: "Metas ativas de todos os vendedores com progresso atual",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_performance_vendedor",
          description: "Performance de um vendedor específico: meta, vendas, ranking",
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
          name: "buscar_performance_detalhada_vendedor",
          description: "Performance DETALHADA por meta: deals por etapa, conversão, histórico",
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
          description: "Ranking dos vendedores por percentual de meta e valor vendido",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "comparar_vendedores",
          description: "Comparativo COMPLETO dos vendedores: meta, vendido, pipeline, média da equipe",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_meta_diaria",
          description: "Metas diárias de captação de arquitetos - hoje",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_stats_metas_diarias",
          description: "Estatísticas de metas diárias dos últimos X dias",
          parameters: {
            type: "object",
            properties: {
              periodo_dias: { type: "number", description: "Dias para análise (padrão: 7)" }
            }
          }
        }
      },
      // ==================== PROJETOS ====================
      {
        type: "function",
        function: {
          name: "buscar_projetos",
          description: "Lista projetos com filtros por estágio",
          parameters: {
            type: "object",
            properties: {
              stage: { type: "string", enum: ["recebido", "em_orcamento", "orcado", "apresentado", "em_negociacao", "aprovado", "perdido", "todos"], description: "Estágio" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_metricas_projetos",
          description: "Métricas de projetos: quantidade por etapa, valor aprovado",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_stats_tipo_produto",
          description: "Estatísticas de projetos por tipo de produto",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_metricas_projetos_historico",
          description: "Métricas de projetos com histórico mensal",
          parameters: {
            type: "object",
            properties: {
              meses: { type: "number", description: "Quantidade de meses (padrão: 6)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_alertas_prazo",
          description: "Projetos com prazo vencendo ou já vencidos",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // ==================== LEADS ====================
      {
        type: "function",
        function: {
          name: "buscar_leads_quentes",
          description: "Leads QUENTES aguardando atendimento - PRIORIDADE MÁXIMA",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_metricas_leads",
          description: "Métricas de leads: total, por temperatura, taxa conversão para CRM",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // ==================== PRODUÇÃO ====================
      {
        type: "function",
        function: {
          name: "buscar_metricas_producao",
          description: "Status da produção: ordens ativas, pendentes, urgentes, atrasadas",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_alertas_producao",
          description: "Ordens de produção urgentes ou com prazo crítico",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // ==================== PEDIDOS ====================
      {
        type: "function",
        function: {
          name: "buscar_metricas_pedidos",
          description: "Métricas de pedidos do mês com comparativo do mês anterior",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // ==================== ESTOQUE ====================
      {
        type: "function",
        function: {
          name: "buscar_alertas_estoque",
          description: "Produtos com estoque abaixo do mínimo - precisam reposição",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // ==================== CAMPANHAS ====================
      {
        type: "function",
        function: {
          name: "buscar_metricas_campanhas",
          description: "Métricas de campanhas de prospecção: taxa entrega, erros",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // ==================== ANÁLISE ESTRATÉGICA CEO ====================
      {
        type: "function",
        function: {
          name: "comparar_periodos",
          description: "ANÁLISE COMPARATIVA: mês atual vs anterior ou trimestre atual vs anterior. Essencial para identificar tendências.",
          parameters: {
            type: "object",
            properties: {
              tipo: { type: "string", enum: ["mes", "trimestre"], description: "Tipo de comparação (padrão: mes)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "prever_fechamento_mes",
          description: "PREVISÃO DE FECHAMENTO: projeta quanto vai fechar no mês baseado no pipeline atual e taxas históricas de conversão. Compara com meta.",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "identificar_gargalos",
          description: "IDENTIFICAR GARGALOS: onde os deals estão travando, quanto dinheiro está parado, ações recomendadas por etapa.",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // ==================== DIAGNÓSTICO ====================
      {
        type: "function",
        function: {
          name: "diagnostico_geral",
          description: "DIAGNÓSTICO CEO COMPLETO: resumo executivo, meta empresa, saúde do pipeline, gargalos, alertas e ações prioritárias. Use para 'como está a empresa?' ou 'análise geral'.",
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
          JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente novamente." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no Lovable." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[Tendenci CEO] Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("[Tendenci CEO] AI Response received");

    const toolCalls = aiResponse.choices?.[0]?.message?.tool_calls;
    
    if (toolCalls && toolCalls.length > 0) {
      console.log(`[Tendenci CEO] Processando ${toolCalls.length} ferramentas`);
      const toolResults = await processToolCalls(toolCalls);
      
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
        JSON.stringify({ content: finalData.choices[0].message.content }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ content: aiResponse.choices[0].message.content }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[Tendenci CEO] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
