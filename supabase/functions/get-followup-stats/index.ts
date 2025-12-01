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

    // Total na fila (deals com followup_enabled=true e followup_count < max_followups)
    const { count: queueCount } = await supabase
      .from('crm_deals')
      .select('*', { count: 'exact', head: true })
      .eq('followup_enabled', true)
      .or('followup_count.is.null,followup_count.lt.5')

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