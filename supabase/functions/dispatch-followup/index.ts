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
 * dispatch-followup v4.0
 * 
 * MODO n8n + OpenAI COMO PADRÃO:
 * 1. Health check do n8n antes de enviar
 * 2. Retry automático com backoff
 * 3. Fallback para envio direto apenas se n8n falhar
 * 4. Desabilita deals com excesso de falhas
 * 5. Alertas automáticos em system_errors
 */

interface DispatchRequest {
  webhook_url?: string
  ignore_time_filter?: boolean
  mode?: 'direct' | 'n8n' | 'hybrid'
  limit?: number
}

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

// Formata número brasileiro para WhatsApp
function formatBrazilianPhone(phone: string | null): string | null {
  if (!phone) return null
  
  let cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('5555')) {
    cleaned = cleaned.substring(2)
  }
  
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  
  if (cleaned.startsWith('550')) {
    cleaned = '55' + cleaned.substring(3)
  }
  
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

// Máximo de falhas consecutivas permitidas em 24h
const MAX_CONSECUTIVE_FAILURES = 3

// Limite global de falhas por hora (pausa sistema)
const MAX_GLOBAL_FAILURES_PER_HOUR = 10

// Verificar saúde do n8n webhook
async function checkN8nHealth(webhookUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(webhookUrl, { 
      method: 'HEAD',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    // HEAD pode retornar 405 (Method Not Allowed) mas indica que o servidor está online
    return response.ok || response.status === 405
  } catch (error) {
    console.warn('⚠️ n8n health check failed:', error)
    return false
  }
}

// Envio direto via edge function interna (FALLBACK)
async function sendDirectFollowup(
  supabaseUrl: string,
  supabaseKey: string,
  lead: LeadForFollowup
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
        categoria: lead.categoria
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      return { success: true, messageId: data.messageId }
    } else {
      return { success: false, error: data.error || 'Erro desconhecido' }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Envio via n8n com retry
async function sendN8nFollowup(
  webhookUrl: string,
  lead: LeadForFollowup,
  callbackUrl: string,
  maxRetries: number = 2
): Promise<{ success: boolean; error?: string }> {
  let lastError = ''
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delayMs = attempt === 1 ? 5000 : 15000
        console.log(`🔄 Retry ${attempt}/${maxRetries} após ${delayMs/1000}s...`)
        await new Promise(r => setTimeout(r, delayMs))
      }
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lead,
          callback_url: callbackUrl
        })
      })
      
      if (response.ok) {
        return { success: true }
      }
      
      const errText = await response.text()
      lastError = `HTTP ${response.status}: ${errText.substring(0, 200)}`
      console.warn(`⚠️ n8n attempt ${attempt + 1} failed:`, lastError)
      
    } catch (e: any) {
      lastError = e.message
      console.warn(`⚠️ n8n attempt ${attempt + 1} error:`, lastError)
    }
  }
  
  return { success: false, error: lastError }
}

// Registrar erro no system_errors
async function logSystemError(
  supabase: any,
  title: string,
  module: string,
  description: string,
  severity: string = 'high',
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    await supabase.from('system_errors').insert({
      title,
      module,
      description,
      severity,
      status: 'open',
      metadata
    })
    console.log(`🚨 System error logged: ${title}`)
  } catch (e) {
    console.error('Failed to log system error:', e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🚀 [DISPATCH-FOLLOWUP v4.0] Iniciando (n8n + OpenAI)...')
    console.log('═══════════════════════════════════════════════════════════')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parsear body
    let body: DispatchRequest = {}
    try {
      const text = await req.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch {
      // Body vazio - ok para CRON
    }

    const ignoreTimeFilter = body.ignore_time_filter || false
    // ✅ MUDANÇA: Padrão agora é 'n8n' para usar OpenAI
    const sendMode = body.mode || 'n8n'
    const sendLimit = body.limit || 10
    
    console.log(`📋 Modo: ${sendMode}, Limite: ${sendLimit}, IgnoreTime: ${ignoreTimeFilter}`)

    // ═══════════════════════════════════════════════════════════
    // VERIFICAÇÃO DE HORÁRIO COMERCIAL (CRÍTICA)
    // ═══════════════════════════════════════════════════════════
    const isBusinessHours = isBusinessHoursBrasil()
    const hour = getCurrentHourBrasil()
    const day = getCurrentDayOfWeekBrasil()
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
    
    console.log(`🕐 Hora Brasil: ${hour}h, Dia: ${dayNames[day]}, Horário Comercial: ${isBusinessHours}`)
    
    const isTestMode = req.headers.get('X-Test-Mode') === 'true'
    
    if (!isBusinessHours && !isTestMode) {
      console.log('⏰ BLOQUEADO: Fora do horário comercial (9h-18h, Seg-Sex)')
      console.log('═══════════════════════════════════════════════════════════')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Fora do horário comercial',
          dispatched: 0,
          eligible: 0,
          skipped_reason: 'outside_business_hours',
          debug: { hour, day: dayNames[day], isBusinessHours, isTestMode }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════════════════════════
    // VERIFICAR LIMITE GLOBAL DE FALHAS/HORA
    // ═══════════════════════════════════════════════════════════
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { count: recentGlobalFailures } = await supabase
      .from('followup_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', oneHourAgo)
    
    if ((recentGlobalFailures || 0) >= MAX_GLOBAL_FAILURES_PER_HOUR) {
      console.error(`🚨 SISTEMA PAUSADO: ${recentGlobalFailures} falhas na última hora`)
      
      await logSystemError(
        supabase,
        'Sistema de Follow-up Pausado',
        'dispatch-followup',
        `${recentGlobalFailures} falhas na última hora. Sistema pausado automaticamente.`,
        'critical',
        { failures_last_hour: recentGlobalFailures, threshold: MAX_GLOBAL_FAILURES_PER_HOUR }
      )
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Sistema pausado por excesso de falhas',
          failures_last_hour: recentGlobalFailures,
          threshold: MAX_GLOBAL_FAILURES_PER_HOUR
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════════════════════════
    // BUSCAR DEALS COM FALHAS RECENTES E DESABILITAR
    // ═══════════════════════════════════════════════════════════
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
    
    // ✅ CORREÇÃO: Desabilitar followup_enabled para deals com excesso de falhas
    if (dealsToDisable.length > 0) {
      console.log(`⛔ Desabilitando ${dealsToDisable.length} deals por excesso de falhas`)
      
      const { error: disableError } = await supabase
        .from('crm_deals')
        .update({ 
          followup_enabled: false
        })
        .in('id', dealsToDisable)
      
      if (disableError) {
        console.error('Erro ao desabilitar deals:', disableError)
      } else {
        // Registrar na timeline de cada deal
        for (const dealId of dealsToDisable) {
          await supabase.from('crm_timeline').insert({
            deal_id: dealId,
            message: `Follow-up automático desabilitado: ${MAX_CONSECUTIVE_FAILURES}+ falhas em 24h`,
            update_type: 'Sistema - Alerta'
          })
        }
        
        // Alertar no system_errors
        await logSystemError(
          supabase,
          `${dealsToDisable.length} deals desabilitados por falhas`,
          'dispatch-followup',
          `Deals desabilitados automaticamente por ${MAX_CONSECUTIVE_FAILURES}+ falhas em 24h`,
          'medium',
          { deal_ids: dealsToDisable }
        )
      }
    }

    // ═══════════════════════════════════════════════════════════
    // VERIFICAR SAÚDE DO N8N (SE MODO N8N)
    // ═══════════════════════════════════════════════════════════
    const n8nWebhook = body.webhook_url || Deno.env.get('N8N_FOLLOWUP_WEBHOOK_URL')
    let n8nHealthy = false
    
    if (sendMode === 'n8n' || sendMode === 'hybrid') {
      if (n8nWebhook) {
        n8nHealthy = await checkN8nHealth(n8nWebhook)
        console.log(`🔌 n8n health check: ${n8nHealthy ? '✅ Online' : '❌ Offline'}`)
        
        if (!n8nHealthy) {
          await logSystemError(
            supabase,
            'n8n Webhook Offline',
            'dispatch-followup',
            'Não foi possível conectar ao webhook do n8n. Usando fallback direto.',
            'high',
            { webhook_url: n8nWebhook?.substring(0, 50) + '...' }
          )
        }
      } else {
        console.warn('⚠️ N8N_FOLLOWUP_WEBHOOK_URL não configurada')
      }
    }

    // Buscar etapa "Follow Up"
    const { data: followupStage } = await supabase
      .from('crm_stages')
      .select('id, name')
      .ilike('name', '%Follow Up%')
      .maybeSingle()

    if (followupStage) {
      console.log(`✅ Etapa Follow Up: ${followupStage.name}`)
    }

    // Buscar deals elegíveis (excluindo os que acabaram de ser desabilitados)
    let query = supabase
      .from('crm_deals')
      .select(`
        id,
        lead_id,
        title,
        conversation_history,
        followup_count,
        max_followups,
        owner_id,
        product_type,
        categoria,
        last_interaction,
        last_followup_at,
        leads(
          id,
          client_id,
          clients(name, phone)
        ),
        profiles:owner_id(full_name)
      `)
      .eq('followup_enabled', true)
      .eq('status', 'aberto')

    if (followupStage?.id) {
      query = query.eq('stage_id', followupStage.id)
    }

    const { data: leads, error: leadsError } = await query

    if (leadsError) {
      console.error('❌ Erro ao buscar leads:', leadsError)
      throw leadsError
    }

    console.log(`📊 Deals com follow-up ativo: ${leads?.length || 0}`)

    // Cutoff de 48h
    const cutoffTimestamp = get48HoursCutoffUTC()
    
    const eligibleLeads = (leads || [])
      .filter(deal => {
        // Não incluir deals que acabaram de ser desabilitados
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
        const clientData = Array.isArray(leadsData) 
          ? leadsData[0]?.clients 
          : (leadsData as any)?.clients
        
        const phone = formatBrazilianPhone(clientData?.phone)
        const clientName = clientData?.name || 'Cliente'
        const followupNumber = (deal.followup_count || 0) + 1
        
        return {
          deal_id: deal.id,
          session_id: deal.id,
          client_name: clientName,
          client_phone: phone,
          conversation_history: deal.conversation_history,
          followup_count: deal.followup_count || 0,
          max_followups: deal.max_followups || 5,
          followup_number: followupNumber,
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
      console.log('═══════════════════════════════════════════════════════════')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum lead elegível',
          dispatched: 0,
          eligible: 0,
          disabled_deals: dealsToDisable.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════════════════════════
    // ENVIO - PRIORIDADE N8N COM FALLBACK
    // ═══════════════════════════════════════════════════════════
    const results = { success: 0, failed: 0, via_n8n: 0, via_direct: 0, errors: [] as string[] }
    const callbackUrl = `${supabaseUrl}/functions/v1/update-followup-history`

    for (const lead of eligibleLeads) {
      console.log(`📤 Enviando: ${lead.client_name} (FU #${lead.followup_number})...`)
      
      let sent = false
      let errorMsg = ''
      let sentVia = ''
      
      // ✅ PRIORIDADE 1: Tentar n8n (com retry automático)
      if ((sendMode === 'n8n' || sendMode === 'hybrid') && n8nWebhook && n8nHealthy) {
        // Criar log como pending antes de enviar
        await supabase.from('followup_logs').insert({
          deal_id: lead.deal_id,
          followup_number: lead.followup_number,
          status: 'pending',
          message_sent: 'Enviado para n8n + OpenAI'
        })
        
        const n8nResult = await sendN8nFollowup(n8nWebhook, lead, callbackUrl, 2)
        
        if (n8nResult.success) {
          console.log(`✅ [N8N] ${lead.client_name} enviado`)
          results.success++
          results.via_n8n++
          sent = true
          sentVia = 'n8n'
        } else {
          console.warn(`⚠️ [N8N] Falha após retries: ${n8nResult.error}`)
          errorMsg = n8nResult.error || 'Erro no n8n'
          
          // Atualizar log para failed
          await supabase
            .from('followup_logs')
            .update({ 
              status: 'failed', 
              error_message: errorMsg.substring(0, 500) 
            })
            .eq('deal_id', lead.deal_id)
            .eq('followup_number', lead.followup_number)
            .eq('status', 'pending')
        }
      }
      
      // ✅ FALLBACK: Envio direto se n8n falhou ou não está configurado
      if (!sent && (sendMode === 'hybrid' || sendMode === 'direct' || !n8nHealthy)) {
        console.log(`🔄 Tentando fallback direto para ${lead.client_name}...`)
        
        const directResult = await sendDirectFollowup(supabaseUrl, supabaseKey, lead)
        
        if (directResult.success) {
          console.log(`✅ [DIRETO] ${lead.client_name} enviado`)
          results.success++
          results.via_direct++
          sent = true
          sentVia = 'direct'
        } else {
          console.error(`❌ [DIRETO] Falha: ${directResult.error}`)
          errorMsg = directResult.error || 'Erro no envio direto'
        }
      }
      
      // Se falhou em todos os métodos
      if (!sent) {
        console.error(`❌ ${lead.client_name}: ${errorMsg}`)
        results.failed++
        results.errors.push(`${lead.client_name}: ${errorMsg}`)
        
        // Garantir que existe um log de falha
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
            error_message: errorMsg.substring(0, 500)
          })
        }
      }
      
      // Delay entre envios para não sobrecarregar
      await new Promise(r => setTimeout(r, 2000))
    }

    const elapsed = Date.now() - startTime
    console.log(`🏁 Concluído: ${results.success} ✅ (n8n: ${results.via_n8n}, direto: ${results.via_direct}), ${results.failed} ❌ (${elapsed}ms)`)
    console.log('═══════════════════════════════════════════════════════════')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${results.success} enviados, ${results.failed} falhas`,
        mode: sendMode,
        dispatched: results.success,
        via_n8n: results.via_n8n,
        via_direct: results.via_direct,
        failed: results.failed,
        eligible: eligibleLeads.length,
        disabled_deals: dealsToDisable.length,
        n8n_healthy: n8nHealthy,
        elapsed_ms: elapsed,
        errors: results.errors.slice(0, 5)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Erro:', error)
    console.log('═══════════════════════════════════════════════════════════')
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
