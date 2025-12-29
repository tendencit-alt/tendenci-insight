import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  isBusinessHoursBrasil, 
  getCurrentHourBrasil, 
  getCurrentDayOfWeekBrasil,
  get48HoursCutoffUTC,
  getMostRecentDate
} from '../_shared/timezone.ts'

/**
 * dispatch-followup v6.0
 * 
 * MELHORIAS v6.0:
 * - Tracking de sessão em tempo real (dispatch_sessions + dispatch_session_items)
 * - Atualização em tempo real do progresso
 * - Cálculo de tempo estimado
 */

interface DispatchRequest {
  webhook_url?: string
  ignore_time_filter?: boolean
  mode?: 'direct' | 'n8n' | 'hybrid'
  limit?: number
  source?: 'cron' | 'manual'
}

const DISPATCH_COOLDOWN_MINUTES = 30
const MAX_CONSECUTIVE_FAILURES = 3
const MAX_GLOBAL_FAILURES_PER_HOUR = 10

interface LeadForFollowup {
  deal_id: string
  session_id: string
  client_name: string
  client_phone: string
  conversation_history: string | null
  followup_count: number
  max_followups: number
  followup_number: number
  owner_id: string | null
  owner_name: string | null
  product_type: string | null
  categoria: string | null
  last_interaction: string | null
  type: 'followup_trigger'
}

function formatBrazilianPhone(phone: string | null): string | null {
  if (!phone) return null
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('5555')) cleaned = cleaned.substring(2)
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1)
  if (cleaned.startsWith('550')) cleaned = '55' + cleaned.substring(3)
  if (cleaned.length === 10 && !cleaned.startsWith('55')) {
    cleaned = cleaned.substring(0, 2) + '9' + cleaned.substring(2)
  }
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    cleaned = cleaned.substring(0, 4) + '9' + cleaned.substring(4)
  }
  if (!cleaned.startsWith('55') && cleaned.length >= 10) {
    cleaned = '55' + cleaned
  }
  if (cleaned.length < 12 || cleaned.length > 13) {
    console.warn(`⚠️ Telefone inválido: ${phone} -> ${cleaned}`)
    return null
  }
  return cleaned
}

async function sendDirectFollowup(
  supabaseUrl: string,
  supabaseKey: string,
  lead: LeadForFollowup,
  source: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-followup-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        deal_id: lead.deal_id,
        client_name: lead.client_name,
        client_phone: lead.client_phone,
        conversation_history: lead.conversation_history,
        followup_count: lead.followup_count,
        max_followups: lead.max_followups,
        followup_number: lead.followup_number,
        owner_id: lead.owner_id,
        owner_name: lead.owner_name,
        product_type: lead.product_type,
        categoria: lead.categoria,
        source
      })
    })
    const data = await response.json()
    return data.success ? { success: true, messageId: data.messageId } : { success: false, error: data.error || 'Erro desconhecido' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
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
      console.error('❌ Erro ao criar sessão de disparo:', error)
      return null
    }
    
    console.log(`📋 Sessão de disparo criada: ${data.id}`)
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
  leads: LeadForFollowup[]
): Promise<void> {
  try {
    const items = leads.map(lead => ({
      session_id: sessionId,
      deal_id: lead.deal_id,
      client_name: lead.client_name,
      client_phone: lead.client_phone,
      followup_number: lead.followup_number,
      status: 'pending'
    }))
    
    await supabase.from('dispatch_session_items').insert(items)
    console.log(`📝 ${items.length} itens criados na sessão`)
  } catch (e) {
    console.error('❌ Erro ao criar itens da sessão:', e)
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
      if (errorMessage) {
        update.error_message = errorMessage.substring(0, 500)
      }
    }
    
    await supabase
      .from('dispatch_session_items')
      .update(update)
      .eq('session_id', sessionId)
      .eq('deal_id', dealId)
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

  try {
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🚀 [DISPATCH-FOLLOWUP v6.0] Iniciando com tracking realtime...')
    console.log('═══════════════════════════════════════════════════════════')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    let body: DispatchRequest = {}
    try {
      const text = await req.text()
      if (text) body = JSON.parse(text)
    } catch { /* Body vazio - ok para CRON */ }

    const ignoreTimeFilter = body.ignore_time_filter || false
    const sendMode = body.mode || 'direct'
    const sendLimit = body.limit || 10
    const dispatchSource = body.source || 'cron'
    
    console.log(`📋 Modo: ${sendMode}, Limite: ${sendLimit}, Source: ${dispatchSource}`)

    // Verificação de cooldown
    const cooldownMinutesAgo = new Date(Date.now() - DISPATCH_COOLDOWN_MINUTES * 60 * 1000).toISOString()
    const { data: recentDispatches } = await supabase
      .from('followup_logs')
      .select('created_at, source, status')
      .in('status', ['sent', 'pending'])
      .gte('created_at', cooldownMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
    
    const recentDispatch = recentDispatches?.[0]
    if (recentDispatch && dispatchSource === 'cron') {
      const recentTime = new Date(recentDispatch.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      console.log(`⏸️ CRON abortado: disparo recente às ${recentTime}`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Cooldown ativo`,
          dispatched: 0,
          eligible: 0,
          skipped_reason: 'cooldown_active'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificação de horário comercial
    const isBusinessHours = isBusinessHoursBrasil()
    const hour = getCurrentHourBrasil()
    const day = getCurrentDayOfWeekBrasil()
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
    
    console.log(`🕐 Hora Brasil: ${hour}h, Dia: ${dayNames[day]}`)
    
    const isTestMode = req.headers.get('X-Test-Mode') === 'true'
    if (!isBusinessHours && !isTestMode) {
      console.log('⏰ BLOQUEADO: Fora do horário comercial')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Fora do horário comercial',
          dispatched: 0,
          eligible: 0,
          skipped_reason: 'outside_business_hours'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar limite global de falhas
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentGlobalFailures } = await supabase
      .from('followup_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', oneHourAgo)
    
    if ((recentGlobalFailures || 0) >= MAX_GLOBAL_FAILURES_PER_HOUR) {
      console.error(`🚨 SISTEMA PAUSADO: ${recentGlobalFailures} falhas na última hora`)
      await logSystemError(supabase, 'Sistema de Follow-up Pausado', 'dispatch-followup',
        `${recentGlobalFailures} falhas na última hora`, 'critical', { failures_last_hour: recentGlobalFailures })
      return new Response(
        JSON.stringify({ success: false, error: 'Sistema pausado por excesso de falhas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar deals com falhas recentes e desabilitar
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentFailures } = await supabase
      .from('followup_logs')
      .select('deal_id')
      .eq('status', 'failed')
      .gte('created_at', twentyFourHoursAgo)
    
    const failureCountByDeal: Record<string, number> = {}
    for (const failure of (recentFailures || [])) {
      if (failure.deal_id) {
        failureCountByDeal[failure.deal_id] = (failureCountByDeal[failure.deal_id] || 0) + 1
      }
    }
    
    const dealsToDisable = Object.entries(failureCountByDeal)
      .filter(([_, count]) => count >= MAX_CONSECUTIVE_FAILURES)
      .map(([dealId]) => dealId)
    
    if (dealsToDisable.length > 0) {
      console.log(`⛔ Desabilitando ${dealsToDisable.length} deals por excesso de falhas`)
      await supabase.from('crm_deals').update({ followup_enabled: false }).in('id', dealsToDisable)
    }

    // Buscar etapa "Follow Up"
    const { data: followupStage } = await supabase
      .from('crm_stages')
      .select('id, name')
      .ilike('name', '%Follow Up%')
      .maybeSingle()

    // Buscar deals elegíveis
    let query = supabase
      .from('crm_deals')
      .select(`
        id, lead_id, title, conversation_history, followup_count, max_followups,
        owner_id, product_type, categoria, last_interaction, last_followup_at,
        leads(id, client_id, clients(name, phone)),
        profiles:owner_id(full_name)
      `)
      .eq('followup_enabled', true)
      .eq('status', 'aberto')

    if (followupStage?.id) query = query.eq('stage_id', followupStage.id)
    const { data: leads, error: leadsError } = await query

    if (leadsError) throw leadsError
    console.log(`📊 Deals com follow-up ativo: ${leads?.length || 0}`)

    const cutoffTimestamp = get48HoursCutoffUTC()
    
    const eligibleLeads = (leads || [])
      .filter(deal => {
        if (dealsToDisable.includes(deal.id)) return false
        const currentCount = deal.followup_count || 0
        const maxFollowups = deal.max_followups || 5
        if (currentCount >= maxFollowups) return false
        const mostRecentDate = getMostRecentDate(deal.last_interaction, deal.last_followup_at)
        if (!mostRecentDate) return true
        return mostRecentDate.getTime() < cutoffTimestamp
      })
      .slice(0, sendLimit)
      .map(deal => {
        const leadsData = deal.leads
        const clientData = Array.isArray(leadsData) ? leadsData[0]?.clients : (leadsData as any)?.clients
        const phone = formatBrazilianPhone(clientData?.phone)
        const clientName = clientData?.name || 'Cliente'
        return {
          deal_id: deal.id,
          session_id: deal.id,
          client_name: clientName,
          client_phone: phone,
          conversation_history: deal.conversation_history,
          followup_count: deal.followup_count || 0,
          max_followups: deal.max_followups || 5,
          followup_number: (deal.followup_count || 0) + 1,
          owner_id: deal.owner_id,
          owner_name: (deal.profiles as any)?.full_name || null,
          product_type: deal.product_type,
          categoria: deal.categoria,
          last_interaction: deal.last_interaction,
          type: 'followup_trigger' as const
        }
      })
      .filter((lead): lead is LeadForFollowup => lead.client_phone !== null)

    console.log(`✅ Elegíveis para envio: ${eligibleLeads.length}`)

    if (eligibleLeads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum lead elegível', dispatched: 0, eligible: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════════════════════════
    // CRIAR SESSÃO DE DISPARO (REALTIME)
    // ═══════════════════════════════════════════════════════════
    const sessionId = await createDispatchSession(supabase, 'followup', dispatchSource, eligibleLeads.length)
    
    if (sessionId) {
      await createSessionItems(supabase, sessionId, eligibleLeads)
    }

    // ═══════════════════════════════════════════════════════════
    // ENVIO COM TRACKING EM TEMPO REAL
    // ═══════════════════════════════════════════════════════════
    const results = { success: 0, failed: 0, via_direct: 0, errors: [] as string[] }
    const processingTimes: number[] = []

    for (let i = 0; i < eligibleLeads.length; i++) {
      const lead = eligibleLeads[i]
      const leadStartTime = Date.now()
      
      console.log(`📤 [${i+1}/${eligibleLeads.length}] Enviando: ${lead.client_name} (FU #${lead.followup_number})...`)
      
      // Atualizar status para processing
      if (sessionId) {
        await updateSessionItem(supabase, sessionId, lead.deal_id, 'processing')
      }
      
      // Envio direto
      const directResult = await sendDirectFollowup(supabaseUrl, supabaseKey, lead, dispatchSource)
      const leadElapsed = Date.now() - leadStartTime
      processingTimes.push(leadElapsed)
      
      if (directResult.success) {
        console.log(`✅ ${lead.client_name} enviado em ${leadElapsed}ms`)
        results.success++
        results.via_direct++
        
        if (sessionId) {
          await updateSessionItem(supabase, sessionId, lead.deal_id, 'sent')
        }
      } else {
        console.error(`❌ ${lead.client_name}: ${directResult.error}`)
        results.failed++
        results.errors.push(`${lead.client_name}: ${directResult.error}`)
        
        if (sessionId) {
          await updateSessionItem(supabase, sessionId, lead.deal_id, 'failed', directResult.error)
        }
        
        // Log de erro
        const { data: existingLog } = await supabase
          .from('followup_logs')
          .select('id')
          .eq('deal_id', lead.deal_id)
          .eq('followup_number', lead.followup_number)
          .maybeSingle()
        
        if (!existingLog) {
          await supabase.from('followup_logs').insert({
            deal_id: lead.deal_id,
            followup_number: lead.followup_number,
            status: 'failed',
            error_message: (directResult.error || '').substring(0, 500),
            source: dispatchSource
          })
        }
      }
      
      // Atualizar sessão com progresso
      if (sessionId) {
        const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        await updateSession(supabase, sessionId, {
          processed: i + 1,
          success_count: results.success,
          failed_count: results.failed,
          avg_time_per_lead_ms: Math.round(avgTime)
        })
      }
      
      // Delay entre envios
      await new Promise(r => setTimeout(r, 2000))
    }

    // Finalizar sessão
    if (sessionId) {
      await updateSession(supabase, sessionId, {
        status: 'completed',
        processed: eligibleLeads.length,
        success_count: results.success,
        failed_count: results.failed
      })
    }

    const elapsed = Date.now() - startTime
    console.log(`🏁 Concluído: ${results.success} ✅, ${results.failed} ❌ (${elapsed}ms)`)
    console.log('═══════════════════════════════════════════════════════════')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${results.success} enviados, ${results.failed} falhas`,
        mode: sendMode,
        dispatched: results.success,
        failed: results.failed,
        eligible: eligibleLeads.length,
        session_id: sessionId,
        elapsed_ms: elapsed,
        source: dispatchSource,
        errors: results.errors.slice(0, 5)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
