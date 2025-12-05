import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Função para converter para horário de Brasília
function toBrasilTime(date: Date): Date {
  const brasilOffset = -3 * 60 // -3 horas em minutos
  const utcOffset = date.getTimezoneOffset() // offset do servidor em minutos
  return new Date(date.getTime() + (utcOffset + brasilOffset) * 60 * 1000)
}

// Função para obter início do dia em Brasília
function getStartOfDayBrasil(): Date {
  const now = new Date()
  const brasil = toBrasilTime(now)
  brasil.setHours(0, 0, 0, 0)
  return brasil
}

// FASE 7: Renomeado para clareza - retorna data de 7 dias atrás, não "início da semana"
function getLast7DaysBrasil(): Date {
  const now = new Date()
  const brasil = toBrasilTime(now)
  brasil.setDate(brasil.getDate() - 7)
  brasil.setHours(0, 0, 0, 0)
  return brasil
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('📊 Fetching follow-up statistics...')

    // Obter o usuário autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Buscar especialização do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('especializacao, role')
      .eq('id', user.id)
      .single()

    const userEspec = profile?.especializacao
    const isAdmin = profile?.role === 'admin'

    console.log('👤 User especialização:', userEspec, 'isAdmin:', isAdmin)

    // Buscar o ID da etapa "Follow Up (I.A)"
    const { data: followupStage, error: stageError } = await supabase
      .from('crm_stages')
      .select('id')
      .ilike('name', '%Follow Up%')
      .single()

    if (stageError) {
      console.error('Error fetching Follow Up stage:', stageError)
      throw new Error('Follow Up stage not found')
    }

    console.log('✅ Follow Up stage found:', followupStage.id)

    // Determinar filtro de categoria baseado na especialização
    let categoryFilter: string | null = null
    if (!isAdmin && userEspec !== 'todos') {
      if (userEspec === 'moveis_soltos') {
        categoryFilter = 'Móveis Soltos'
      } else if (userEspec === 'moveis_planejados') {
        categoryFilter = 'Planejados'
      }
    }
    console.log('📂 Category filter:', categoryFilter || 'ALL')

    // Total na fila (deals na etapa "Follow Up (I.A)" com status aberto e followup_enabled=true)
    let queueQuery = supabase
      .from('crm_deals')
      .select('*', { count: 'exact', head: true })
      .eq('stage_id', followupStage.id)
      .eq('status', 'aberto')
      .eq('followup_enabled', true)

    // Aplicar filtro de categoria
    if (categoryFilter) {
      queueQuery = queueQuery.eq('categoria', categoryFilter)
    }

    const { count: queueCount } = await queueQuery

    // Datas para filtros
    const todayBrasil = getStartOfDayBrasil()
    const last7Days = getLast7DaysBrasil()
    console.log('📅 Início do dia Brasil:', todayBrasil.toISOString())
    console.log('📅 Últimos 7 dias:', last7Days.toISOString())

    // FASE 4: Enviados hoje - filtrar por especialização via JOIN com crm_deals
    // Primeiro buscar IDs de deals que correspondem à especialização
    let dealsForStatsQuery = supabase
      .from('crm_deals')
      .select('id')

    if (categoryFilter) {
      dealsForStatsQuery = dealsForStatsQuery.eq('categoria', categoryFilter)
    }

    const { data: eligibleDeals } = await dealsForStatsQuery
    const eligibleDealIds = (eligibleDeals || []).map(d => d.id)

    console.log(`📊 Deals elegíveis para stats: ${eligibleDealIds.length}`)

    // Enviados hoje - com filtro de especialização
    let sentTodayCount = 0
    if (eligibleDealIds.length > 0) {
      const { count } = await supabase
        .from('followup_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', todayBrasil.toISOString())
        .in('deal_id', eligibleDealIds)
      
      sentTodayCount = count || 0
    }

    // Enviados últimos 7 dias - com filtro de especialização
    let sentWeekCount = 0
    if (eligibleDealIds.length > 0) {
      const { count } = await supabase
        .from('followup_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', last7Days.toISOString())
        .in('deal_id', eligibleDealIds)
      
      sentWeekCount = count || 0
    }

    // Taxa de resposta - buscar logs primeiro, filtrados por especialização
    let responseRate = 0
    if (eligibleDealIds.length > 0) {
      const { data: logsData, error: logsError } = await supabase
        .from('followup_logs')
        .select('deal_id, sent_at')
        .eq('status', 'sent')
        .gte('sent_at', last7Days.toISOString())
        .in('deal_id', eligibleDealIds)

      if (!logsError && logsData && logsData.length > 0) {
        // Buscar deals correspondentes com last_interaction
        const dealIds = [...new Set(logsData.map(log => log.deal_id).filter(Boolean))]
        
        if (dealIds.length > 0) {
          const { data: dealsData } = await supabase
            .from('crm_deals')
            .select('id, last_interaction')
            .in('id', dealIds)

          // Criar mapa de deals para acesso rápido
          const dealsMap = new Map((dealsData || []).map(d => [d.id, d.last_interaction]))

          let responseCount = 0
          for (const log of logsData) {
            if (!log.deal_id || !log.sent_at) continue
            const dealLastInteraction = dealsMap.get(log.deal_id)
            if (dealLastInteraction && new Date(dealLastInteraction) > new Date(log.sent_at)) {
              responseCount++
            }
          }

          responseRate = logsData.length > 0 ? Math.round((responseCount / logsData.length) * 100) : 0
        }
      }
    }

    console.log('📊 Taxa de resposta calculada:', responseRate, '%')

    // Falhas recentes - com filtro de especialização
    let failedCount = 0
    if (eligibleDealIds.length > 0) {
      const { count } = await supabase
        .from('followup_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', last7Days.toISOString())
        .in('deal_id', eligibleDealIds)
      
      failedCount = count || 0
    }

    // FASE 8: Identificar logs órfãos (pending há mais de 1 hora)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: orphanedLogsCount } = await supabase
      .from('followup_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo)

    if (orphanedLogsCount && orphanedLogsCount > 0) {
      console.warn(`⚠️ ${orphanedLogsCount} logs órfãos (pending há mais de 1h) detectados`)
    }

    console.log('✅ Statistics fetched successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        stats: {
          queueSize: queueCount || 0,
          sentToday: sentTodayCount,
          sentWeek: sentWeekCount,
          responseRate,
          failedRecent: failedCount,
          orphanedLogs: orphanedLogsCount || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Error fetching stats:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
