import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

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
    // SEM LIMITE de follow-ups - continua até cliente pedir para parar
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

    // Enviados hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: sentToday } = await supabase
      .from('followup_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', today.toISOString())

    // Enviados última semana
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    lastWeek.setHours(0, 0, 0, 0)

    const { count: sentWeek } = await supabase
      .from('followup_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', lastWeek.toISOString())

    // Taxa de resposta (deals que tiveram last_interaction atualizada após follow-up)
    const { data: responseLogs } = await supabase
      .from('followup_logs')
      .select('deal_id, sent_at')
      .eq('status', 'sent')
      .gte('sent_at', lastWeek.toISOString())

    let responseCount = 0
    if (responseLogs && responseLogs.length > 0) {
      for (const log of responseLogs) {
        const { data: deal } = await supabase
          .from('crm_deals')
          .select('last_interaction')
          .eq('id', log.deal_id)
          .single()

        if (deal?.last_interaction && new Date(deal.last_interaction) > new Date(log.sent_at)) {
          responseCount++
        }
      }
    }

    const responseRate = responseLogs && responseLogs.length > 0 
      ? Math.round((responseCount / responseLogs.length) * 100) 
      : 0

    // Falhas recentes
    const { count: failedCount } = await supabase
      .from('followup_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', lastWeek.toISOString())

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