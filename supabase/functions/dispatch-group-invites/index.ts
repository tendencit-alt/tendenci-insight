import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DISPATCH_COOLDOWN_MINUTES = 30
const MAX_GLOBAL_FAILURES_PER_HOUR = 10

/**
 * dispatch-group-invites v3.0
 * 
 * MELHORIAS v3.0:
 * - Tracking de sessão em tempo real (dispatch_sessions + dispatch_session_items)
 * - Atualização em tempo real do progresso
 */

function isBusinessHours(): boolean {
  const now = new Date()
  const brasilOffset = -3 * 60
  const brasilTime = new Date(now.getTime() + (now.getTimezoneOffset() + brasilOffset) * 60000)
  const hour = brasilTime.getHours()
  const dayOfWeek = brasilTime.getDay()
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const isWorkingHours = hour >= 9 && hour < 18
  return isWeekday && isWorkingHours
}

async function logSystemError(
  supabase: any,
  title: string,
  module: string,
  description: string,
  severity: string = 'high',
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    await supabase.from('system_errors').insert({ title, module, description, severity, status: 'open', metadata })
    console.log(`🚨 System error logged: ${title}`)
  } catch (e) {
    console.error('Failed to log system error:', e)
  }
}

// Criar sessão de disparo
async function createDispatchSession(
  supabase: any,
  type: 'followup' | 'group_invite',
  source: string,
  totalLeads: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('dispatch_sessions')
      .insert({
        type,
        source,
        status: 'running',
        total_leads: totalLeads,
        processed: 0,
        success_count: 0,
        failed_count: 0,
        skipped_count: 0,
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()
    
    if (error) {
      console.error('❌ Erro ao criar sessão:', error)
      return null
    }
    console.log(`📋 Sessão criada: ${data.id}`)
    return data.id
  } catch (e) {
    console.error('❌ Erro ao criar sessão:', e)
    return null
  }
}

// Criar itens da sessão
async function createSessionItems(
  supabase: any,
  sessionId: string,
  deals: any[]
): Promise<void> {
  try {
    const items = deals.map(deal => ({
      session_id: sessionId,
      deal_id: deal.deal_id,
      client_name: deal.client_name,
      client_phone: deal.client_phone,
      status: 'pending'
    }))
    await supabase.from('dispatch_session_items').insert(items)
    console.log(`📝 ${items.length} itens criados`)
  } catch (e) {
    console.error('❌ Erro ao criar itens:', e)
  }
}

// Atualizar item da sessão
async function updateSessionItem(
  supabase: any,
  sessionId: string,
  dealId: string,
  status: 'processing' | 'sent' | 'failed' | 'skipped',
  errorMessage?: string
): Promise<void> {
  try {
    const update: Record<string, any> = { status }
    if (status === 'processing') {
      update.processing_started_at = new Date().toISOString()
    } else {
      update.processed_at = new Date().toISOString()
      if (errorMessage) update.error_message = errorMessage.substring(0, 500)
    }
    await supabase.from('dispatch_session_items').update(update).eq('session_id', sessionId).eq('deal_id', dealId)
  } catch (e) {
    console.error('❌ Erro ao atualizar item:', e)
  }
}

// Atualizar sessão
async function updateSession(
  supabase: any,
  sessionId: string,
  updates: {
    processed?: number
    success_count?: number
    failed_count?: number
    skipped_count?: number
    status?: 'running' | 'completed' | 'failed'
    avg_time_per_lead_ms?: number
  }
): Promise<void> {
  try {
    const data: Record<string, any> = { ...updates }
    if (updates.status === 'completed' || updates.status === 'failed') {
      data.completed_at = new Date().toISOString()
    }
    await supabase.from('dispatch_sessions').update(data).eq('id', sessionId)
  } catch (e) {
    console.error('❌ Erro ao atualizar sessão:', e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🚀 [dispatch-group-invites v3.0] Iniciando com tracking...')
  console.log('═══════════════════════════════════════════════════════════')

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let body: { limit?: number; ignore_business_hours?: boolean; source?: 'cron' | 'manual' } = {}
    try { body = await req.json() } catch { body = {} }

    const limit = body.limit || 30
    const ignoreBusinessHours = body.ignore_business_hours || false
    const dispatchSource = body.source || 'cron'
    
    console.log(`📋 Limite: ${limit}, Source: ${dispatchSource}`)

    // Cooldown check
    const cooldownMinutesAgo = new Date(Date.now() - DISPATCH_COOLDOWN_MINUTES * 60 * 1000).toISOString()
    const { data: recentDispatches } = await supabase
      .from('crm_deals')
      .select('group_invite_sent_at')
      .eq('group_invite_sent', true)
      .gte('group_invite_sent_at', cooldownMinutesAgo)
      .order('group_invite_sent_at', { ascending: false })
      .limit(1)
    
    if (recentDispatches?.[0]?.group_invite_sent_at && dispatchSource === 'cron') {
      const recentTime = new Date(recentDispatches[0].group_invite_sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      console.log(`⏸️ CRON abortado: convite recente às ${recentTime}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Cooldown ativo', dispatched: 0, skipped: 0, failed: 0, source: dispatchSource }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Global failure check
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentGlobalFailures } = await supabase
      .from('system_errors')
      .select('*', { count: 'exact', head: true })
      .eq('module', 'group-invite')
      .gte('created_at', oneHourAgo)
    
    if ((recentGlobalFailures || 0) >= MAX_GLOBAL_FAILURES_PER_HOUR) {
      console.error(`🚨 SISTEMA PAUSADO: ${recentGlobalFailures} falhas`)
      await logSystemError(supabase, 'Sistema de Convites Pausado', 'group-invite',
        `${recentGlobalFailures} falhas na última hora`, 'critical', { failures_last_hour: recentGlobalFailures })
      return new Response(
        JSON.stringify({ success: false, error: 'Sistema pausado por excesso de falhas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    // Business hours check
    if (!ignoreBusinessHours && !isBusinessHours()) {
      console.log('⏰ Fora do horário comercial')
      return new Response(
        JSON.stringify({ success: true, message: 'Fora do horário comercial', dispatched: 0, skipped: 0, failed: 0, source: dispatchSource }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Buscar deals elegíveis
    console.log('🔍 Buscando deals elegíveis...')
    const eligibleResponse = await supabase.functions.invoke('get-eligible-group-invites', { body: { limit } })

    if (eligibleResponse.error) {
      const errorMsg = `Erro ao buscar elegíveis: ${eligibleResponse.error.message}`
      console.error(`❌ ${errorMsg}`)
      await logSystemError(supabase, 'Erro ao buscar deals elegíveis', 'group-invite', errorMsg, 'high', { error: eligibleResponse.error })
      throw new Error(errorMsg)
    }

    const deals = eligibleResponse.data?.deals || []
    console.log(`📊 Deals elegíveis: ${deals.length}`)

    if (deals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum deal elegível', dispatched: 0, skipped: 0, failed: 0, source: dispatchSource }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ═══════════════════════════════════════════════════════════
    // CRIAR SESSÃO DE DISPARO
    // ═══════════════════════════════════════════════════════════
    const sessionId = await createDispatchSession(supabase, 'group_invite', dispatchSource, deals.length)
    
    if (sessionId) {
      await createSessionItems(supabase, sessionId, deals)
    }

    // ═══════════════════════════════════════════════════════════
    // ENVIO COM TRACKING
    // ═══════════════════════════════════════════════════════════
    let dispatched = 0
    let failed = 0
    const results: any[] = []
    const processingTimes: number[] = []

    for (let i = 0; i < deals.length; i++) {
      const deal = deals[i]
      const leadStartTime = Date.now()
      
      try {
        console.log(`📨 [${i+1}/${deals.length}] Enviando convite para ${deal.client_name}...`)
        
        if (sessionId) {
          await updateSessionItem(supabase, sessionId, deal.deal_id, 'processing')
        }
        
        const sendResponse = await supabase.functions.invoke('send-group-invite', {
          body: {
            deal_id: deal.deal_id,
            client_name: deal.client_name,
            client_phone: deal.client_phone,
            owner_id: deal.owner_id,
            source: dispatchSource
          }
        })

        const leadElapsed = Date.now() - leadStartTime
        processingTimes.push(leadElapsed)

        if (sendResponse.error) {
          console.error(`❌ Falha deal ${deal.deal_id}:`, sendResponse.error)
          failed++
          results.push({ deal_id: deal.deal_id, success: false, error: sendResponse.error.message })
          
          if (sessionId) {
            await updateSessionItem(supabase, sessionId, deal.deal_id, 'failed', sendResponse.error.message)
          }
          
          await logSystemError(supabase, 'Falha ao enviar convite', 'group-invite',
            `Deal ${deal.deal_id} (${deal.client_name}): ${sendResponse.error.message}`, 'medium',
            { deal_id: deal.deal_id, client_name: deal.client_name, error: sendResponse.error.message })
        } else {
          console.log(`✅ Sucesso deal ${deal.deal_id} em ${leadElapsed}ms`)
          dispatched++
          results.push({ deal_id: deal.deal_id, success: true })
          
          if (sessionId) {
            await updateSessionItem(supabase, sessionId, deal.deal_id, 'sent')
          }
        }

        // Atualizar sessão com progresso
        if (sessionId) {
          const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
          await updateSession(supabase, sessionId, {
            processed: i + 1,
            success_count: dispatched,
            failed_count: failed,
            avg_time_per_lead_ms: Math.round(avgTime)
          })
        }

        await new Promise(resolve => setTimeout(resolve, 1500))

      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Erro desconhecido'
        console.error(`❌ Erro deal ${deal.deal_id}:`, error)
        failed++
        results.push({ deal_id: deal.deal_id, success: false, error: errMsg })
        
        if (sessionId) {
          await updateSessionItem(supabase, sessionId, deal.deal_id, 'failed', errMsg)
        }
        
        await logSystemError(supabase, 'Erro inesperado ao enviar convite', 'group-invite',
          `Deal ${deal.deal_id}: ${errMsg}`, 'high', { deal_id: deal.deal_id, error: errMsg })
      }
    }

    // Finalizar sessão
    if (sessionId) {
      await updateSession(supabase, sessionId, {
        status: 'completed',
        processed: deals.length,
        success_count: dispatched,
        failed_count: failed
      })
    }

    const elapsed = Date.now() - startTime
    console.log(`🏁 Concluído em ${elapsed}ms: ${dispatched} enviados, ${failed} falhas`)
    console.log('═══════════════════════════════════════════════════════════')

    return new Response(
      JSON.stringify({
        success: true,
        dispatched,
        failed,
        total_eligible: deals.length,
        results,
        session_id: sessionId,
        elapsed_ms: elapsed,
        source: dispatchSource
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
