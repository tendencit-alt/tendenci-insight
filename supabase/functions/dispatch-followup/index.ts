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
 * dispatch-followup
 * 
 * CORREÇÕES v2.0:
 * - Logs detalhados para debug de horário
 * - Proteção robusta contra execução fora do horário
 * - Limite de falhas consecutivas por deal (máx 3 em 24h)
 * - Nunca cria logs de "failed" fora do horário comercial
 */

interface DispatchRequest {
  webhook_url?: string
  ignore_time_filter?: boolean
  mode?: 'atendimento' | 'followup'
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
    console.warn(`⚠️ Telefone inválido após formatação: ${phone} -> ${cleaned}`)
    return null
  }
  
  return cleaned
}

// Máximo de falhas consecutivas permitidas em 24h
const MAX_CONSECUTIVE_FAILURES = 3

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🚀 [DISPATCH-FOLLOWUP] Iniciando execução...')
    console.log('═══════════════════════════════════════════════════════════')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
    console.log(`📋 Parâmetros: ignore_time_filter=${ignoreTimeFilter}`)

    // ═══════════════════════════════════════════════════════════
    // VERIFICAÇÃO DE HORÁRIO COMERCIAL (CRÍTICA)
    // ═══════════════════════════════════════════════════════════
    const isBusinessHours = isBusinessHoursBrasil()
    const hour = getCurrentHourBrasil()
    const day = getCurrentDayOfWeekBrasil()
    
    console.log(`🕐 Resumo: Hora=${hour}h, Dia=${day}, BusinessHours=${isBusinessHours}`)
    
    // PROTEÇÃO ROBUSTA: Mesmo com ignore_time_filter, não processa fora do horário
    // A menos que seja um teste explícito (header especial)
    const isTestMode = req.headers.get('X-Test-Mode') === 'true'
    
    if (!isBusinessHours && !isTestMode) {
      console.log('⏰ BLOQUEADO: Fora do horário comercial (9h-18h, Seg-Sex)')
      console.log('📌 Nenhum log será criado, nenhum follow-up será disparado')
      console.log('═══════════════════════════════════════════════════════════')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Fora do horário comercial (9h-18h, Seg-Sex Brasil)',
          dispatched: 0,
          eligible: 0,
          skipped_reason: 'outside_business_hours',
          debug: {
            hour,
            day,
            dayName: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][day],
            isBusinessHours,
            ignoreTimeFilter,
            isTestMode
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determinar webhook a usar (prioridade: IA de atendimento)
    const atendimentoWebhook = Deno.env.get('N8N_ATENDIMENTO_WEBHOOK_URL')
    const followupWebhook = body.webhook_url || Deno.env.get('N8N_FOLLOWUP_WEBHOOK_URL')
    
    const webhookUrl = atendimentoWebhook || followupWebhook
    const isAtendimentoMode = !!atendimentoWebhook

    if (!webhookUrl) {
      console.error('❌ Nenhum webhook configurado')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum webhook configurado. Configure N8N_ATENDIMENTO_WEBHOOK_URL ou N8N_FOLLOWUP_WEBHOOK_URL.' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`📡 Modo: ${isAtendimentoMode ? 'IA de Atendimento' : 'Workflow Separado'}`)
    console.log(`📡 Webhook: ${webhookUrl.substring(0, 50)}...`)

    // Buscar etapa "Follow Up (I.A)"
    const { data: followupStage, error: stageError } = await supabase
      .from('crm_stages')
      .select('id, name')
      .ilike('name', '%Follow Up%')
      .maybeSingle()

    if (stageError) {
      console.warn('⚠️ Erro ao buscar etapa Follow Up:', stageError.message)
    } else if (followupStage) {
      console.log(`✅ Etapa Follow Up encontrada: ${followupStage.name} (${followupStage.id})`)
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
    
    // Contar falhas por deal
    const failureCountByDeal: Record<string, number> = {}
    for (const failure of (recentFailures || [])) {
      if (failure.deal_id) {
        failureCountByDeal[failure.deal_id] = (failureCountByDeal[failure.deal_id] || 0) + 1
      }
    }
    
    // Deals a excluir (3+ falhas em 24h)
    const dealsToExclude = new Set(
      Object.entries(failureCountByDeal)
        .filter(([_, count]) => count >= MAX_CONSECUTIVE_FAILURES)
        .map(([dealId]) => dealId)
    )
    
    if (dealsToExclude.size > 0) {
      console.log(`⛔ ${dealsToExclude.size} deals excluídos por ${MAX_CONSECUTIVE_FAILURES}+ falhas em 24h:`)
      for (const dealId of dealsToExclude) {
        console.log(`   - ${dealId}: ${failureCountByDeal[dealId]} falhas`)
      }
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
          clients(
            name,
            phone
          )
        ),
        profiles:owner_id(full_name)
      `)
      .eq('followup_enabled', true)
      .eq('status', 'aberto')

    // Filtrar por etapa se encontrada
    if (followupStage?.id) {
      query = query.eq('stage_id', followupStage.id)
    }

    const { data: leads, error: leadsError } = await query

    if (leadsError) {
      console.error('❌ Erro ao buscar leads:', leadsError)
      throw leadsError
    }

    console.log(`📊 Total de leads com follow-up ativo: ${leads?.length || 0}`)

    // Cutoff de 48h
    const cutoffTimestamp = get48HoursCutoffUTC()
    console.log(`⏰ Cutoff 48h UTC: ${new Date(cutoffTimestamp).toISOString()}`)
    
    const eligibleLeads = (leads || [])
      .filter(deal => {
        // Verificar se está na lista de excluídos por falhas
        if (dealsToExclude.has(deal.id)) {
          console.log(`⛔ Deal ${deal.id}: Excluído por falhas consecutivas`)
          return false
        }
        
        const currentCount = deal.followup_count || 0
        const maxFollowups = deal.max_followups || 999
        
        if (currentCount >= maxFollowups) {
          console.log(`⛔ Deal ${deal.id}: Atingiu limite (${currentCount}/${maxFollowups})`)
          return false
        }
        
        const mostRecentDate = getMostRecentDate(deal.last_interaction, deal.last_followup_at)
        
        if (!mostRecentDate) {
          console.log(`✅ Deal ${deal.id}: Nunca teve interação, elegível`)
          return true
        }
        
        const isEligible = mostRecentDate.getTime() < cutoffTimestamp
        console.log(`📅 Deal ${deal.id}: Última atividade ${mostRecentDate.toISOString()}, elegível: ${isEligible}`)
        
        return isEligible
      })
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
          max_followups: deal.max_followups || 999,
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

    console.log(`✅ Leads elegíveis para follow-up: ${eligibleLeads.length}`)

    if (eligibleLeads.length === 0) {
      console.log('═══════════════════════════════════════════════════════════')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum lead elegível para follow-up',
          dispatched: 0,
          eligible: 0,
          excluded_by_failures: dealsToExclude.size
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-followup-history`

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Enviar para webhook
    for (const lead of eligibleLeads) {
      try {
        console.log(`📤 Enviando ${lead.client_name} (follow-up #${lead.followup_number})...`)
        
        const payload = {
          ...lead,
          callback_url: callbackUrl
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          console.log(`✅ ${lead.client_name} enviado com sucesso`)
          results.success++
          
          // Registrar log como pending
          await supabase
            .from('followup_logs')
            .insert({
              deal_id: lead.deal_id,
              followup_number: lead.followup_number,
              status: 'pending',
              message_sent: `Enviado para ${isAtendimentoMode ? 'IA de atendimento' : 'n8n'}`
            })
        } else {
          const errorText = await response.text()
          console.error(`❌ Erro ao enviar ${lead.client_name}:`, errorText)
          results.failed++
          results.errors.push(`${lead.client_name}: ${errorText}`)
          
          await supabase
            .from('followup_logs')
            .insert({
              deal_id: lead.deal_id,
              followup_number: lead.followup_number,
              status: 'failed',
              error_message: errorText.substring(0, 500)
            })
        }

      } catch (error: any) {
        console.error(`❌ Erro ao processar ${lead.client_name}:`, error.message)
        results.failed++
        results.errors.push(`${lead.client_name}: ${error.message}`)
        
        await supabase
          .from('followup_logs')
          .insert({
            deal_id: lead.deal_id,
            followup_number: lead.followup_number,
            status: 'failed',
            error_message: error.message?.substring(0, 500) || 'Erro desconhecido'
          })
      }
    }

    console.log(`🏁 Disparo concluído: ${results.success} sucesso, ${results.failed} falhas`)
    console.log('═══════════════════════════════════════════════════════════')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Follow-ups disparados: ${results.success} sucesso, ${results.failed} falhas`,
        mode: isAtendimentoMode ? 'atendimento' : 'followup',
        dispatched: results.success,
        failed: results.failed,
        eligible: eligibleLeads.length,
        excluded_by_failures: dealsToExclude.size,
        errors: results.errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Erro no dispatch-followup:', error)
    console.log('═══════════════════════════════════════════════════════════')
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
