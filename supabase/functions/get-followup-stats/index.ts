import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { getStartOfDayBrasilAsUTC, getLast7DaysAsUTC } from '../_shared/timezone.ts'

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

    // Buscar o ID da etapa "Follow Up (I.A)" - usando maybeSingle
    const { data: followupStage, error: stageError } = await supabase
      .from('crm_stages')
      .select('id')
      .ilike('name', '%Follow Up%')
      .maybeSingle()

    if (stageError) {
      console.error('Error fetching Follow Up stage:', stageError)
    }
    
    if (!followupStage) {
      console.warn('⚠️ Follow Up stage not found, returning empty stats')
      return new Response(
        JSON.stringify({ 
          success: true,
          stats: {
            queueSize: 0,
            sentToday: 0,
            sentWeek: 0,
            responseRate: 0,
            failedRecent: 0,
            orphanedLogs: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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

    if (categoryFilter) {
      queueQuery = queueQuery.eq('categoria', categoryFilter)
    }

    const { count: queueCount } = await queueQuery

    // Datas para filtros - usando timezone compartilhado (UTC correto)
    const todayStart = getStartOfDayBrasilAsUTC()
    const last7DaysStart = getLast7DaysAsUTC()
    
    console.log('📅 Início do dia Brasil (UTC):', todayStart.toISOString())
    console.log('📅 Últimos 7 dias (UTC):', last7DaysStart.toISOString())

    // Buscar IDs de deals que correspondem à especialização
    let dealsForStatsQuery = supabase
      .from('crm_deals')
      .select('id')

    if (categoryFilter) {
      dealsForStatsQuery = dealsForStatsQuery.eq('categoria', categoryFilter)
    }

    const { data: eligibleDeals } = await dealsForStatsQuery
    const eligibleDealIds = (eligibleDeals || []).map(d => d.id)

    console.log(`📊 Deals elegíveis para stats: ${eligibleDealIds.length}`)

    // Enviados hoje - filtrar por sent_at OU created_at (para capturar todos)
    let sentTodayCount = 0
    if (eligibleDealIds.length > 0) {
      const { count } = await supabase
        .from('followup_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .or(`sent_at.gte.${todayStart.toISOString()},created_at.gte.${todayStart.toISOString()}`)
        .in('deal_id', eligibleDealIds)
      
      sentTodayCount = count || 0
    }

    // Enviados últimos 7 dias
    let sentWeekCount = 0
    if (eligibleDealIds.length > 0) {
      const { count } = await supabase
        .from('followup_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .or(`sent_at.gte.${last7DaysStart.toISOString()},created_at.gte.${last7DaysStart.toISOString()}`)
        .in('deal_id', eligibleDealIds)
      
      sentWeekCount = count || 0
    }

    // Taxa de resposta - verificar se last_interaction > sent_at
    let responseRate = 0
    if (eligibleDealIds.length > 0) {
      const { data: logsData, error: logsError } = await supabase
        .from('followup_logs')
        .select('deal_id, sent_at, created_at')
        .eq('status', 'sent')
        .or(`sent_at.gte.${last7DaysStart.toISOString()},created_at.gte.${last7DaysStart.toISOString()}`)
        .in('deal_id', eligibleDealIds)

      if (!logsError && logsData && logsData.length > 0) {
        const dealIds = [...new Set(logsData.map(log => log.deal_id).filter(Boolean))]
        
        if (dealIds.length > 0) {
          const { data: dealsData } = await supabase
            .from('crm_deals')
            .select('id, last_interaction')
            .in('id', dealIds)

          const dealsMap = new Map((dealsData || []).map(d => [d.id, d.last_interaction]))

          let responseCount = 0
          for (const log of logsData) {
            if (!log.deal_id) continue
            const logSentAt = log.sent_at || log.created_at
            if (!logSentAt) continue
            
            const dealLastInteraction = dealsMap.get(log.deal_id)
            if (dealLastInteraction && new Date(dealLastInteraction) > new Date(logSentAt)) {
              responseCount++
            }
          }

          responseRate = logsData.length > 0 ? Math.round((responseCount / logsData.length) * 100) : 0
        }
      }
    }

    console.log('📊 Taxa de resposta calculada:', responseRate, '%')

    // Falhas recentes
    let failedCount = 0
    if (eligibleDealIds.length > 0) {
      const { count } = await supabase
        .from('followup_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', last7DaysStart.toISOString())
        .in('deal_id', eligibleDealIds)
      
      failedCount = count || 0
    }

    // Identificar e CORRIGIR logs órfãos (pending há mais de 2 horas)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    
    const { data: orphanedLogs, count: orphanedLogsCount } = await supabase
      .from('followup_logs')
      .select('id', { count: 'exact' })
      .eq('status', 'pending')
      .lt('created_at', twoHoursAgo)

    if (orphanedLogsCount && orphanedLogsCount > 0) {
      console.warn(`⚠️ ${orphanedLogsCount} logs órfãos detectados, marcando como failed_timeout...`)
      
      // Auto-corrigir: marcar como failed_timeout
      const { error: updateError } = await supabase
        .from('followup_logs')
        .update({ 
          status: 'failed',
          error_message: 'Timeout - callback do n8n não recebido em 2h'
        })
        .eq('status', 'pending')
        .lt('created_at', twoHoursAgo)
      
      if (updateError) {
        console.error('❌ Erro ao corrigir logs órfãos:', updateError)
      } else {
        console.log(`✅ ${orphanedLogsCount} logs órfãos marcados como failed`)
      }
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
