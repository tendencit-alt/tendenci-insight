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
 * dispatch-followup v3.0
 * 
 * MODO HÍBRIDO:
 * 1. Tenta envio DIRETO via send-followup-whatsapp (preferencial)
 * 2. Fallback para n8n webhook se configurado
 * 
 * CORREÇÕES:
 * - Envio direto elimina dependência do n8n
 * - Proteção robusta contra execução fora do horário
 * - Limite de falhas consecutivas (máx 3 em 24h)
 * - Verificação de Evolution API antes de enviar
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

// Envio direto via edge function interna
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🚀 [DISPATCH-FOLLOWUP v3.0] Iniciando...')
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
    const sendMode = body.mode || 'direct' // Padrão: envio direto
    const sendLimit = body.limit || 10 // Máximo por execução
    
    console.log(`📋 Modo: ${sendMode}, Limite: ${sendLimit}, IgnoreTime: ${ignoreTimeFilter}`)

    // ═══════════════════════════════════════════════════════════
    // VERIFICAÇÃO DE HORÁRIO COMERCIAL (CRÍTICA)
    // ═══════════════════════════════════════════════════════════
    const isBusinessHours = isBusinessHoursBrasil()
    const hour = getCurrentHourBrasil()
    const day = getCurrentDayOfWeekBrasil()
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
    
    console.log(`🕐 Hora Brasil: ${hour}h, Dia: ${dayNames[day]}, Horário Comercial: ${isBusinessHours}`)
    
    // PROTEÇÃO: Apenas teste explícito pode ignorar horário
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
    // BUSCAR DEALS COM FALHAS RECENTES (PARA EXCLUIR)
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
    
    const dealsToExclude = new Set(
      Object.entries(failureCountByDeal)
        .filter(([_, count]) => count >= MAX_CONSECUTIVE_FAILURES)
        .map(([dealId]) => dealId)
    )
    
    if (dealsToExclude.size > 0) {
      console.log(`⛔ ${dealsToExclude.size} deals bloqueados por ${MAX_CONSECUTIVE_FAILURES}+ falhas`)
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

    // Buscar deals elegíveis
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
        if (dealsToExclude.has(deal.id)) return false
        
        const currentCount = deal.followup_count || 0
        const maxFollowups = deal.max_followups || 5
        
        if (currentCount >= maxFollowups) return false
        
        const mostRecentDate = getMostRecentDate(deal.last_interaction, deal.last_followup_at)
        if (!mostRecentDate) return true
        
        return mostRecentDate.getTime() < cutoffTimestamp
      })
      .slice(0, sendLimit) // Limitar quantidade
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
          excluded_by_failures: dealsToExclude.size
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════════════════════════
    // ENVIO - MODO HÍBRIDO
    // ═══════════════════════════════════════════════════════════
    const results = { success: 0, failed: 0, errors: [] as string[] }
    
    const n8nWebhook = body.webhook_url || Deno.env.get('N8N_FOLLOWUP_WEBHOOK_URL')
    const useDirectMode = sendMode === 'direct' || sendMode === 'hybrid'
    const useN8nFallback = sendMode === 'n8n' || (sendMode === 'hybrid' && n8nWebhook)

    for (const lead of eligibleLeads) {
      console.log(`📤 Enviando: ${lead.client_name} (FU #${lead.followup_number})...`)
      
      let sent = false
      let errorMsg = ''
      
      // Tentar envio direto primeiro (se habilitado)
      if (useDirectMode && !sent) {
        const directResult = await sendDirectFollowup(supabaseUrl, supabaseKey, lead)
        
        if (directResult.success) {
          console.log(`✅ [DIRETO] ${lead.client_name} enviado`)
          results.success++
          sent = true
        } else {
          console.warn(`⚠️ [DIRETO] Falha: ${directResult.error}`)
          errorMsg = directResult.error || 'Erro no envio direto'
        }
      }
      
      // Fallback para n8n (se configurado e ainda não enviou)
      if (useN8nFallback && !sent && n8nWebhook) {
        try {
          const response = await fetch(n8nWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...lead,
              callback_url: `${supabaseUrl}/functions/v1/update-followup-history`
            })
          })
          
          if (response.ok) {
            console.log(`✅ [N8N] ${lead.client_name} enviado`)
            results.success++
            sent = true
            
            // Registrar como pending (n8n vai confirmar depois)
            await supabase.from('followup_logs').insert({
              deal_id: lead.deal_id,
              followup_number: lead.followup_number,
              status: 'pending',
              message_sent: 'Enviado para n8n'
            })
          } else {
            const errText = await response.text()
            errorMsg = `N8N: ${errText}`
          }
        } catch (e: any) {
          errorMsg = `N8N: ${e.message}`
        }
      }
      
      // Se falhou em todos os métodos
      if (!sent) {
        console.error(`❌ ${lead.client_name}: ${errorMsg}`)
        results.failed++
        results.errors.push(`${lead.client_name}: ${errorMsg}`)
        
        await supabase.from('followup_logs').insert({
          deal_id: lead.deal_id,
          followup_number: lead.followup_number,
          status: 'failed',
          error_message: errorMsg.substring(0, 500)
        })
      }
      
      // Delay entre envios para não sobrecarregar
      await new Promise(r => setTimeout(r, 2000))
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
        excluded_by_failures: dealsToExclude.size,
        elapsed_ms: elapsed,
        errors: results.errors.slice(0, 5) // Limitar erros retornados
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
