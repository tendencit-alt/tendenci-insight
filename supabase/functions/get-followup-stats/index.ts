import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// FASE 3: Função para converter para horário de Brasília
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

// Função para obter início da semana em Brasília
function getStartOfWeekBrasil(): Date {
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

    console.log('👤 User especialização:', userEspec)

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

    // Total na fila (deals na etapa "Follow Up (I.A)" com status aberto e followup_enabled=true)
    let queueQuery = supabase
      .from('crm_deals')
      .select('*', { count: 'exact', head: true })
      .eq('stage_id', followupStage.id)
      .eq('status', 'aberto')
      .eq('followup_enabled', true)

    // Aplicar filtro de categoria baseado na especialização
    if (!isAdmin && userEspec !== 'todos') {
      if (userEspec === 'moveis_soltos') {
        queueQuery = queueQuery.eq('categoria', 'Móveis Soltos')
      } else if (userEspec === 'moveis_planejados') {
        queueQuery = queueQuery.eq('categoria', 'Planejados')
      }
    }

    const { count: queueCount } = await queueQuery

    // FASE 3: Enviados hoje - usando horário Brasil
    const todayBrasil = getStartOfDayBrasil()
    console.log('📅 Início do dia Brasil:', todayBrasil.toISOString())
    
    // FASE 8: Contar status 'sent' (confirmado pelo callback) para métricas precisas
    const { count: sentToday } = await supabase
      .from('followup_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', todayBrasil.toISOString())

    // FASE 3: Enviados última semana - usando horário Brasil
    const lastWeekBrasil = getStartOfWeekBrasil()
    console.log('📅 Início da semana Brasil:', lastWeekBrasil.toISOString())

    const { count: sentWeek } = await supabase
      .from('followup_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', lastWeekBrasil.toISOString())

    // FASE 9: Taxa de resposta - query corrigida sem FK sintaxe problemática
    // Buscar logs primeiro
    const { data: logsData, error: logsError } = await supabase
      .from('followup_logs')
      .select('deal_id, sent_at')
      .eq('status', 'sent')
      .gte('sent_at', lastWeekBrasil.toISOString())

    let responseRate = 0
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
          if (!log.deal_id) continue
          const dealLastInteraction = dealsMap.get(log.deal_id)
          if (dealLastInteraction && new Date(dealLastInteraction) > new Date(log.sent_at)) {
            responseCount++
          }
        }

        responseRate = Math.round((responseCount / logsData.length) * 100)
      }
    }

    console.log('📊 Taxa de resposta calculada:', responseRate, '%')

    // Falhas recentes (inclui 'failed' e 'pending' não confirmados)
    const { count: failedCount } = await supabase
      .from('followup_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', lastWeekBrasil.toISOString())

    console.log('✅ Statistics fetched successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        stats: {
          queueSize: queueCount || 0,
          sentToday: sentToday || 0,
          sentWeek: sentWeek || 0,
          responseRate,
          failedRecent: failedCount || 0
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
