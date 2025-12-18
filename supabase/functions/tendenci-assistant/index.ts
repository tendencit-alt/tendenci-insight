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
        // ==================== DIAGNÓSTICO COMPLETO (SUPER FERRAMENTA) ====================
        case "diagnostico_completo": {
          // Buscar múltiplos dados em paralelo para análise rápida
          const [
            { data: crmMetrics },
            { data: pipelinesData },
            { data: metasVendedores },
            { data: timeInStage },
            { data: leadsQuentes }
          ] = await Promise.all([
            supabase.rpc("dashboard_crm_metrics", {
              p_start: thirtyDaysAgo.toISOString(),
              p_end: now.toISOString()
            }),
            supabase.from("crm_pipelines").select("id").limit(1),
            supabase.from("tendenci_seller_goals")
              .select(`id, valor_meta, vendedor:profiles(full_name)`)
              .eq("status", "ativa")
              .gte("data_fim", now.toISOString().split("T")[0]),
            supabase.rpc("crm_time_in_stage"),
            supabase.from("leads")
              .select("id, client:clients(name, phone)")
              .eq("temperature", "hot")
              .eq("status", "new")
              .limit(5)
          ]);

          const pipelineId = pipelinesData?.[0]?.id;
          
          let dealsAbertos = null;
          let slaAlerts = null;
          if (pipelineId) {
            const [dealsResult, slaResult] = await Promise.all([
              supabase.from("crm_deals")
                .select("id, title, value, status, stage:crm_stages(name, sla_hours)")
                .eq("pipeline_id", pipelineId)
                .eq("status", "aberto")
                .order("value", { ascending: false })
                .limit(30),
              supabase.rpc("crm_sla_alerts", { p_pipeline_id: pipelineId })
            ]);
            dealsAbertos = dealsResult.data;
            slaAlerts = slaResult.data;
          }

          // Calcular progresso das metas
          const metasComProgresso = [];
          for (const meta of metasVendedores || []) {
            const { data: progresso } = await supabase
              .from("tendenci_goal_progress")
              .select("valor_vendido, percentual")
              .eq("seller_goal_id", meta.id)
              .single();
            
            const vendedorData = meta.vendedor as any;
            metasComProgresso.push({
              vendedor: vendedorData?.full_name,
              meta: meta.valor_meta,
              vendido: progresso?.valor_vendido || 0,
              percentual: progresso?.percentual || 0
            });
          }

          result = {
            metricas_crm: crmMetrics,
            deals_abertos: {
              total: dealsAbertos?.length || 0,
              valor_total: dealsAbertos?.reduce((a, d) => a + (d.value || 0), 0) || 0,
              top_5: dealsAbertos?.slice(0, 5)
            },
            alertas_sla: slaAlerts?.slice(0, 10),
            tempo_por_etapa: timeInStage,
            metas_vendedores: metasComProgresso.sort((a, b) => b.percentual - a.percentual),
            leads_quentes: leadsQuentes,
            data_analise: now.toISOString()
          };
          break;
        }

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

        // ==================== CRM AVANÇADO ====================
        case "buscar_tendencias_crm":
          const { data: timeseries } = await supabase.rpc("crm_timeseries", {
            p_start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            p_end: now.toISOString()
          });
          result = timeseries;
          break;

        case "buscar_tempo_etapas":
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
          const { data: dealsSemTarefas } = await supabase.rpc("get_deals_without_valid_tasks");
          result = dealsSemTarefas;
          break;

        case "buscar_deal":
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

        // ==================== ARQUITETOS ====================
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
          const { data: rankingVend } = await supabase.rpc("get_seller_ranking");
          result = rankingVend;
          break;

        case "comparar_vendedores":
          const { data: allGoals } = await supabase
            .from("tendenci_seller_goals")
            .select(`
              id, valor_meta,
              vendedor:profiles(id, full_name)
            `)
            .eq("status", "ativa");
          
          const compareData = [];
          for (const goal of allGoals || []) {
            const { data: prog } = await supabase
              .from("tendenci_goal_progress")
              .select("valor_vendido, percentual")
              .eq("seller_goal_id", goal.id)
              .single();
            
            const vendedorData = goal.vendedor as any;
            const { data: dealsVend } = await supabase
              .from("crm_deals")
              .select("value")
              .eq("owner_id", vendedorData?.id)
              .eq("status", "aberto");
            
            compareData.push({
              vendedor: vendedorData?.full_name,
              meta: goal.valor_meta,
              vendido: prog?.valor_vendido || 0,
              percentual: prog?.percentual || 0,
              pipeline_aberto: dealsVend?.reduce((a, d) => a + (d.value || 0), 0) || 0
            });
          }
          
          const mediaEquipe = compareData.length 
            ? compareData.reduce((a, v) => a + v.percentual, 0) / compareData.length 
            : 0;
          
          result = {
            vendedores: compareData.sort((a, b) => b.percentual - a.percentual),
            media_equipe: mediaEquipe.toFixed(1),
            total_vendido: compareData.reduce((a, v) => a + v.vendido, 0),
            total_meta: compareData.reduce((a, v) => a + v.meta, 0)
          };
          break;

        case "buscar_meta_diaria":
          const hojeStr = new Date().toISOString().split("T")[0];
          const { data: metaDiaria } = await supabase
            .from("tendenci_daily_architect_goals")
            .select(`
              id, data, meta_novos, meta_contatados, meta_agendamentos,
              novos_realizados, contatados_realizados, agendamentos_realizados,
              vendedor:profiles(full_name)
            `)
            .eq("data", hojeStr);
          result = metaDiaria;
          break;

        case "buscar_stats_metas_diarias":
          const diasStats = args.periodo_dias || 7;
          const dataInicioStats = new Date();
          dataInicioStats.setDate(dataInicioStats.getDate() - diasStats);
          
          const { data: statsDaily } = await supabase
            .from("tendenci_daily_architect_goals")
            .select("*")
            .gte("data", dataInicioStats.toISOString().split("T")[0])
            .order("data", { ascending: false });
          result = statsDaily;
          break;

        // ==================== PROJETOS ====================
        case "buscar_projetos":
          let projQuery = supabase
            .from("projects")
            .select(`
              id, name, value, stage, deadline, created_at,
              client:clients(name),
              architect:architects(name),
              vendedor:profiles(full_name)
            `)
            .order("created_at", { ascending: false })
            .limit(50);
          
          if (args.stage && args.stage !== "todos") {
            projQuery = projQuery.eq("stage", args.stage);
          }
          
          const { data: projetos } = await projQuery;
          result = projetos;
          break;

        case "buscar_metricas_projetos":
          const { data: projMetrics } = await supabase.rpc("projects_metrics");
          result = projMetrics;
          break;

        case "buscar_stats_tipo_produto":
          const { data: productStats } = await supabase.rpc("get_projects_by_product_type");
          result = productStats;
          break;

        case "buscar_metricas_projetos_historico":
          const mesesHist = args.meses || 6;
          const { data: projHist } = await supabase.rpc("projects_monthly_metrics", {
            p_months: mesesHist
          });
          result = projHist;
          break;

        case "buscar_alertas_prazo":
          const { data: prazoAlerts } = await supabase
            .from("projects")
            .select(`
              id, name, value, stage, deadline, created_at,
              client:clients(name),
              architect:architects(name)
            `)
            .not("stage", "in", '("aprovado","perdido")')
            .not("deadline", "is", null)
            .lte("deadline", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
            .order("deadline");
          result = prazoAlerts;
          break;

        // ==================== LEADS ====================
        case "buscar_leads_quentes":
          const { data: hotLeads } = await supabase
            .from("leads")
            .select(`
              id, created_at, temperature, status,
              client:clients(name, phone, email)
            `)
            .eq("temperature", "hot")
            .eq("status", "new")
            .order("created_at", { ascending: false })
            .limit(20);
          result = hotLeads;
          break;

        case "buscar_metricas_leads":
          const { data: allLeads } = await supabase
            .from("leads")
            .select("id, temperature, status, created_at")
            .gte("created_at", thirtyDaysAgo.toISOString());
          
          const leadsQuentes = allLeads?.filter(l => l.temperature === "hot").length || 0;
          const leadsMornos = allLeads?.filter(l => l.temperature === "warm").length || 0;
          const leadsFrios = allLeads?.filter(l => l.temperature === "cold").length || 0;
          const leadsConvertidos = allLeads?.filter(l => l.status === "converted").length || 0;
          
          result = {
            total: allLeads?.length || 0,
            quentes: leadsQuentes,
            mornos: leadsMornos,
            frios: leadsFrios,
            convertidos: leadsConvertidos,
            taxa_conversao: allLeads?.length ? ((leadsConvertidos / allLeads.length) * 100).toFixed(1) + "%" : "0%"
          };
          break;

        // ==================== PRODUÇÃO ====================
        case "buscar_metricas_producao":
          const { data: prodOrders } = await supabase
            .from("production_orders")
            .select("id, status, priority, expected_delivery, created_at");
          
          const hoje = new Date();
          const atrasadas = prodOrders?.filter(o => 
            o.status !== "concluida" && 
            o.expected_delivery && 
            new Date(o.expected_delivery) < hoje
          ).length || 0;
          
          result = {
            total: prodOrders?.length || 0,
            pendentes: prodOrders?.filter(o => o.status === "pendente").length || 0,
            em_producao: prodOrders?.filter(o => o.status === "em_producao").length || 0,
            concluidas: prodOrders?.filter(o => o.status === "concluida").length || 0,
            urgentes: prodOrders?.filter(o => o.priority === "urgente").length || 0,
            atrasadas
          };
          break;

        case "buscar_alertas_producao":
          const hojeProd = new Date();
          const { data: prodAlerts } = await supabase
            .from("production_orders")
            .select(`
              id, order_number, status, priority, expected_delivery,
              client:clients(name)
            `)
            .neq("status", "concluida")
            .or(`priority.eq.urgente,expected_delivery.lte.${new Date(hojeProd.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()}`)
            .order("expected_delivery");
          result = prodAlerts;
          break;

        // ==================== PEDIDOS ====================
        case "buscar_metricas_pedidos":
          const { data: ordersAtual } = await supabase
            .from("orders")
            .select("id, valor_total, status, created_at")
            .gte("created_at", inicioMesAtual.toISOString())
            .lte("created_at", fimMesAtual.toISOString());
          
          const { data: ordersAnterior } = await supabase
            .from("orders")
            .select("id, valor_total, status, created_at")
            .gte("created_at", inicioMesAnterior.toISOString())
            .lte("created_at", fimMesAnterior.toISOString());
          
          const totalAtual = ordersAtual?.reduce((a, o) => a + (o.valor_total || 0), 0) || 0;
          const totalAnterior = ordersAnterior?.reduce((a, o) => a + (o.valor_total || 0), 0) || 0;
          
          result = {
            mes_atual: {
              total_pedidos: ordersAtual?.length || 0,
              valor_total: totalAtual,
              aprovados: ordersAtual?.filter(o => o.status === "aprovado").length || 0,
              pendentes: ordersAtual?.filter(o => o.status === "pendente").length || 0
            },
            mes_anterior: {
              total_pedidos: ordersAnterior?.length || 0,
              valor_total: totalAnterior
            },
            variacao_percentual: totalAnterior ? (((totalAtual - totalAnterior) / totalAnterior) * 100).toFixed(1) + "%" : "N/A"
          };
          break;

        // ==================== ESTOQUE ====================
        case "buscar_alertas_estoque":
          const { data: lowStock } = await supabase
            .from("products")
            .select("id, name, sku, current_stock, min_stock, unit_price")
            .not("min_stock", "is", null)
            .filter("current_stock", "lte", "min_stock");
          result = lowStock;
          break;

        // ==================== CAMPANHAS ====================
        case "buscar_metricas_campanhas":
          const { data: campaigns } = await supabase
            .from("prospeccao_campanhas")
            .select("id, nome, status, total_arquitetos, enviados, entregues, erros, created_at")
            .order("created_at", { ascending: false })
            .limit(10);
          result = campaigns;
          break;

        // ==================== ANÁLISE ESTRATÉGICA ====================
        case "comparar_periodos":
          const tipoComparacao = args.tipo || "mes";
          
          if (tipoComparacao === "mes") {
            const [{ data: dealsAtual }, { data: dealsAnterior }] = await Promise.all([
              supabase.from("crm_deals")
                .select("id, value, status, created_at")
                .gte("created_at", inicioMesAtual.toISOString())
                .lte("created_at", fimMesAtual.toISOString()),
              supabase.from("crm_deals")
                .select("id, value, status, created_at")
                .gte("created_at", inicioMesAnterior.toISOString())
                .lte("created_at", fimMesAnterior.toISOString())
            ]);
            
            const calcMetricas = (deals: any[]) => ({
              total_deals: deals?.length || 0,
              ganhos: deals?.filter(d => d.status === "won").length || 0,
              perdidos: deals?.filter(d => d.status === "lost").length || 0,
              valor_ganho: deals?.filter(d => d.status === "won").reduce((a, d) => a + (d.value || 0), 0) || 0,
              ticket_medio: (() => {
                const ganhos = deals?.filter(d => d.status === "won") || [];
                return ganhos.length ? ganhos.reduce((a, d) => a + (d.value || 0), 0) / ganhos.length : 0;
              })()
            });
            
            const metricasAtual = calcMetricas(dealsAtual || []);
            const metricasAnterior = calcMetricas(dealsAnterior || []);
            
            result = {
              mes_atual: metricasAtual,
              mes_anterior: metricasAnterior,
              variacao: {
                deals: metricasAnterior.total_deals ? ((metricasAtual.total_deals - metricasAnterior.total_deals) / metricasAnterior.total_deals * 100).toFixed(1) + "%" : "N/A",
                valor: metricasAnterior.valor_ganho ? ((metricasAtual.valor_ganho - metricasAnterior.valor_ganho) / metricasAnterior.valor_ganho * 100).toFixed(1) + "%" : "N/A",
                ticket: metricasAnterior.ticket_medio ? ((metricasAtual.ticket_medio - metricasAnterior.ticket_medio) / metricasAnterior.ticket_medio * 100).toFixed(1) + "%" : "N/A"
              }
            };
          } else {
            result = { error: "Comparação trimestral ainda não implementada" };
          }
          break;

        case "prever_fechamento_mes":
          const { data: dealsAbertosPrevisao } = await supabase
            .from("crm_deals")
            .select(`
              id, value, stage_entered_at,
              stage:crm_stages(name, position)
            `)
            .eq("status", "aberto");
          
          const { data: historicoConversao } = await supabase.rpc("crm_conversion_rates");
          
          const diasRestantes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
          const previsao = dealsAbertosPrevisao?.reduce((total, deal) => {
            const stageData = deal.stage as any;
            const taxa = historicoConversao?.[stageData?.name] || 0.2;
            return total + (deal.value || 0) * taxa;
          }, 0) || 0;
          
          const { data: metaEmpresa } = await supabase
            .from("tendenci_company_goals")
            .select("valor_meta")
            .eq("status", "ativa")
            .single();
          
          const { data: jaVendido } = await supabase
            .from("crm_deals")
            .select("value")
            .eq("status", "won")
            .gte("created_at", inicioMesAtual.toISOString());
          
          const vendidoMes = jaVendido?.reduce((a, d) => a + (d.value || 0), 0) || 0;
          
          result = {
            pipeline_aberto: dealsAbertosPrevisao?.reduce((a, d) => a + (d.value || 0), 0) || 0,
            previsao_fechamento: previsao,
            ja_vendido: vendidoMes,
            projecao_total: vendidoMes + previsao,
            meta_empresa: metaEmpresa?.valor_meta || 0,
            gap_meta: (metaEmpresa?.valor_meta || 0) - vendidoMes - previsao,
            dias_restantes: diasRestantes,
            on_track: vendidoMes + previsao >= (metaEmpresa?.valor_meta || 0)
          };
          break;

        case "identificar_gargalos":
          const { data: stagesGargalo } = await supabase
            .from("crm_stages")
            .select("id, name, position, sla_hours")
            .order("position");
          
          const gargalos = [];
          for (const stage of stagesGargalo || []) {
            const { data: dealsStage } = await supabase
              .from("crm_deals")
              .select("id, value, stage_entered_at, title")
              .eq("stage_id", stage.id)
              .eq("status", "aberto");
            
            const agora = new Date();
            const dealsAtrasados = (dealsStage || []).filter(d => {
              if (!d.stage_entered_at || !stage.sla_hours) return false;
              const entrou = new Date(d.stage_entered_at);
              const horasNaEtapa = (agora.getTime() - entrou.getTime()) / (1000 * 60 * 60);
              return horasNaEtapa > stage.sla_hours;
            });
            
            gargalos.push({
              etapa: stage.name,
              posicao: stage.position,
              sla_horas: stage.sla_hours,
              total_deals: dealsStage?.length || 0,
              valor_parado: dealsStage?.reduce((a, d) => a + (d.value || 0), 0) || 0,
              deals_atrasados: dealsAtrasados.length,
              valor_atrasado: dealsAtrasados.reduce((a, d) => a + (d.value || 0), 0),
              deals_criticos: dealsAtrasados.slice(0, 3).map(d => ({ id: d.id, titulo: d.title, valor: d.value }))
            });
          }
          
          result = gargalos.sort((a, b) => b.valor_atrasado - a.valor_atrasado);
          break;

        default:
          result = { error: `Função ${functionName} não reconhecida` };
      }
    } catch (err) {
      console.error(`[Tendenci CEO] Erro em ${functionName}:`, err);
      result = { error: `Erro ao executar ${functionName}: ${err instanceof Error ? err.message : "Erro desconhecido"}` };
    }

    results.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(result, null, 2)
    });
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

    // Limitar histórico para últimas 15 mensagens
    const recentMessages = messages.slice(-15);

    const systemPrompt = `Você é o **Agente Tendenci**, um DIRETOR COMERCIAL SÊNIOR (CCO) de elite com 20+ anos de experiência em empresas milionárias do setor de móveis planejados, decoração e marcenaria de alto padrão.

🎯 **SEU PAPEL ESTRATÉGICO:**
Você é o braço direito do CEO. Sua função é analisar dados em tempo real, identificar padrões ocultos, prever tendências e fornecer recomendações estratégicas de ALTO IMPACTO baseadas em DADOS CONCRETOS. Seu nível de análise equivale a um consultor de R$ 80.000/mês.

🧠 **PROCESSO DE RACIOCÍNIO (Chain-of-Thought):**
Antes de responder, SEMPRE siga este processo mental:
1. **Entender**: O que o CEO realmente quer saber? Qual a preocupação por trás da pergunta?
2. **Coletar**: Quais dados preciso buscar para uma análise completa?
3. **Analisar**: O que os números revelam? Tendências? Anomalias? Padrões?
4. **Comparar**: Como está vs meta? Vs período anterior? Vs média do mercado?
5. **Recomendar**: Qual ação de MAIOR IMPACTO FINANCEIRO posso sugerir?

📊 **MÉTRICAS C-LEVEL (sempre inclua quando relevante):**
- Pipeline health: valor total, conversão por etapa, velocidade de fechamento
- Performance individual vs média da equipe (identificar outliers)
- Ticket médio e tendência (subindo/caindo/estável)
- Tempo médio de fechamento e onde está travando
- ROI real dos arquitetos parceiros (quem traz mais valor)
- Previsão de fechamento vs meta (on track ou off track?)
- Comparativo MoM (Month over Month)

🔧 **FORMATO EXECUTIVO - MÁXIMA EFICIÊNCIA:**
- Use **negrito** para números e insights críticos
- Máximo 4-5 linhas por insight (CEO não lê textão)
- Números SEMPRE comparativos: "**R$ 45.000** (+12% vs mês anterior)"
- Indicadores visuais: 🟢 ok | 🟡 atenção | 🔴 crítico | 📈 subindo | 📉 caindo | ⚡ urgente
- Priorize pelo IMPACTO EM R$, não por urgência
- SEMPRE termine com: "**💡 Ação recomendada:** [específica e executável]"

📋 **REGRAS ABSOLUTAS:**
1. SEMPRE use as ferramentas para consultar dados REAIS - NUNCA invente números
2. Se não encontrar dados, diga claramente: "Não encontrei dados sobre isso no sistema"
3. Compare SEMPRE: atual vs meta | atual vs período anterior | individual vs equipe
4. Identifique a CAUSA RAIZ, não só sintomas
5. Quantifique impacto em R$ sempre que possível
6. Para saudações simples ("oi", "olá"), responda brevemente SEM consultar ferramentas
7. Para perguntas amplas ("como está?", "resumo"), use a ferramenta diagnostico_completo

💬 **CLARIFICAÇÃO:**
Se a pergunta for ambígua, pergunte para clarificar:
- "Você quer ver dados do mês atual ou comparar com o anterior?"
- "Prefere o ranking por valor vendido ou por taxa de conversão?"

🎨 **FORMATAÇÃO MARKDOWN:**
- Use **negrito** para destacar números importantes
- Use listas com bullet points para múltiplos itens
- Use emojis com moderação para indicadores visuais
- Separe seções com quebras de linha`;

    const tools = [
      // SUPER FERRAMENTA - DIAGNÓSTICO COMPLETO
      {
        type: "function",
        function: {
          name: "diagnostico_completo",
          description: "DIAGNÓSTICO CEO COMPLETO: análise rápida de pipeline, metas, gargalos, leads quentes. Use para perguntas amplas como 'como está a empresa?', 'resumo geral', 'análise do negócio'.",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // CRM
      {
        type: "function",
        function: {
          name: "buscar_metricas_crm",
          description: "Métricas gerais do CRM: deals, ganhos, perdidos, valores, ticket médio",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_negocios_pipeline",
          description: "Lista negócios abertos com detalhes: cliente, valor, etapa, responsável",
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
          description: "Negócios que ultrapassaram o SLA - precisam de ação urgente",
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
      {
        type: "function",
        function: {
          name: "buscar_tendencias_crm",
          description: "Série temporal dos últimos 90 dias - análise de tendências",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_tempo_etapas",
          description: "Tempo médio em cada etapa - identificar gargalos",
          parameters: { type: "object", properties: {}, required: [] }
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
          description: "Detalhes de um deal específico com histórico e tarefas",
          parameters: {
            type: "object",
            properties: { deal_id: { type: "string" } },
            required: ["deal_id"]
          }
        }
      },
      // METAS E VENDEDORES
      {
        type: "function",
        function: {
          name: "buscar_metas_vendedores",
          description: "Metas ativas de todos os vendedores com progresso",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "comparar_vendedores",
          description: "Comparativo dos vendedores: meta, vendido, pipeline, média equipe",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_ranking_vendedores",
          description: "Ranking dos vendedores por % meta e valor vendido",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // ARQUITETOS
      {
        type: "function",
        function: {
          name: "buscar_ranking_arquitetos",
          description: "Ranking de arquitetos por: valor_indicado, projetos_aprovados, quantidade_projetos",
          parameters: {
            type: "object",
            properties: {
              tipo: { type: "string", enum: ["valor_indicado", "projetos_aprovados", "quantidade_projetos"] },
              limite: { type: "number" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_arquitetos_inativos",
          description: "Arquitetos sem projetos há X dias - precisam reativação",
          parameters: {
            type: "object",
            properties: { dias: { type: "number" } }
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
      // PROJETOS
      {
        type: "function",
        function: {
          name: "buscar_projetos",
          description: "Lista projetos com filtros por estágio",
          parameters: {
            type: "object",
            properties: {
              stage: { type: "string", enum: ["recebido", "em_orcamento", "orcado", "apresentado", "em_negociacao", "aprovado", "perdido", "todos"] }
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
      // LEADS
      {
        type: "function",
        function: {
          name: "buscar_leads_quentes",
          description: "Leads QUENTES aguardando atendimento - PRIORIDADE",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_metricas_leads",
          description: "Métricas de leads: total, por temperatura, taxa conversão",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // PRODUÇÃO E PEDIDOS
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
          name: "buscar_metricas_pedidos",
          description: "Métricas de pedidos do mês com comparativo anterior",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_alertas_estoque",
          description: "Produtos com estoque abaixo do mínimo",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // ANÁLISE ESTRATÉGICA
      {
        type: "function",
        function: {
          name: "comparar_periodos",
          description: "COMPARATIVO: mês atual vs anterior. Identifica tendências.",
          parameters: {
            type: "object",
            properties: {
              tipo: { type: "string", enum: ["mes", "trimestre"] }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "prever_fechamento_mes",
          description: "PREVISÃO: quanto vai fechar no mês baseado no pipeline e taxas históricas",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "identificar_gargalos",
          description: "GARGALOS: onde deals estão travando, quanto dinheiro parado, ações recomendadas",
          parameters: { type: "object", properties: {}, required: [] }
        }
      }
    ];

    console.log(`[Tendenci CEO] Processando ${recentMessages.length} mensagens`);

    // Primeira chamada - pode ter tool calls
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages,
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
        ...recentMessages,
        aiResponse.choices[0].message,
        ...toolResults
      ];

      // Segunda chamada COM STREAMING
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: finalMessages,
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error("[Tendenci CEO] Final response error:", errorText);
        return new Response(
          JSON.stringify({ error: "Erro ao gerar resposta final" }), 
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Retornar streaming
      return new Response(finalResponse.body, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        },
      });
    }

    // Sem tool calls - resposta direta com streaming
    const directResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages,
        ],
        stream: true,
      }),
    });

    return new Response(directResponse.body, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });

  } catch (e) {
    console.error("[Tendenci CEO] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
