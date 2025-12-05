import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  isBusinessHoursBrasil, 
  getCurrentHourBrasil, 
  getCurrentDayOfWeekBrasil,
  get48HoursCutoffUTC,
  getMostRecentDate
} from '../_shared/timezone.ts'

interface DispatchRequest {
  webhook_url: string
  ignore_time_filter?: boolean
}

interface LeadForFollowup {
  deal_id: string
  lead_id: string
  client_name: string
  client_phone: string
  conversation_history: string | null
  followup_count: number
  max_followups: number
  followup_number: number // Número do follow-up que será enviado
  owner_id: string | null
  owner_name: string | null
  product_type: string | null
  categoria: string | null
  last_interaction: string | null
}

// Formata número brasileiro para WhatsApp
function formatBrazilianPhone(phone: string | null): string | null {
  if (!phone) return null
  
  let cleaned = phone.replace(/\D/g, '')
  
  // Remove 55 duplicado no início
  if (cleaned.startsWith('5555')) {
    cleaned = cleaned.substring(2)
  }
  
  // Remove 0 inicial antes do DDD
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  
  // Se começa com 55 e tem 0 depois, remover o 0
  if (cleaned.startsWith('550')) {
    cleaned = '55' + cleaned.substring(3)
  }
  
  // Adicionar 9 se número tem 10 dígitos (DDD + 8 dígitos) e não começa com 55
  if (cleaned.length === 10 && !cleaned.startsWith('55')) {
    cleaned = cleaned.substring(0, 2) + '9' + cleaned.substring(2)
  }
  
  // Se tem 12 dígitos e começa com 55, adicionar o 9
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    cleaned = cleaned.substring(0, 4) + '9' + cleaned.substring(4)
  }
  
  // Adicionar 55 se não tem
  if (!cleaned.startsWith('55') && cleaned.length >= 10) {
    cleaned = '55' + cleaned
  }
  
  // Validar tamanho final (13 dígitos: 55 + DDD + 9 + número)
  if (cleaned.length < 12 || cleaned.length > 13) {
    console.warn(`⚠️ Telefone inválido após formatação: ${phone} -> ${cleaned}`)
    return null
  }
  
  return cleaned
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

    const { webhook_url, ignore_time_filter = false }: DispatchRequest = await req.json()

    if (!webhook_url) {
      throw new Error('webhook_url é obrigatório')
    }

    console.log('🚀 Iniciando disparo de follow-ups...')
    console.log('📡 Webhook URL:', webhook_url)

    // Verificar horário comercial usando timezone compartilhado
    const hour = getCurrentHourBrasil()
    const day = getCurrentDayOfWeekBrasil()
    const isBusinessHours = isBusinessHoursBrasil()
    
    console.log(`🕐 Horário Brasil: ${hour}h, dia: ${day}, comercial: ${isBusinessHours}`)
    
    if (!ignore_time_filter && !isBusinessHours) {
      console.log('⏰ Fora do horário comercial. Abortando.')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Fora do horário comercial',
          dispatched: 0,
          eligible: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar ID da etapa "Follow Up (I.A)" - usando maybeSingle para não dar erro
    const { data: followupStage, error: stageError } = await supabase
      .from('crm_stages')
      .select('id, name')
      .ilike('name', '%Follow Up%')
      .maybeSingle()

    if (stageError) {
      console.warn('⚠️ Erro ao buscar etapa Follow Up:', stageError.message)
    } else if (followupStage) {
      console.log(`✅ Etapa Follow Up encontrada: ${followupStage.name} (${followupStage.id})`)
    } else {
      console.log('ℹ️ Etapa "Follow Up" não encontrada, buscando sem filtro de etapa')
    }

    // Buscar leads elegíveis para follow-up
    let query = supabase
      .from('crm_deals')
      .select(`
        id,
        lead_id,
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

    // Adicionar filtro de etapa se encontrada
    if (followupStage?.id) {
      query = query.eq('stage_id', followupStage.id)
    }

    const { data: leads, error: leadsError } = await query

    if (leadsError) {
      console.error('❌ Erro ao buscar leads:', leadsError)
      throw leadsError
    }

    console.log(`📊 Total de leads com follow-up ativo${followupStage ? ' na etapa Follow Up' : ''}: ${leads?.length || 0}`)

    // Cutoff de 48h em UTC (consistente)
    const cutoffTimestamp = get48HoursCutoffUTC()
    console.log(`⏰ Cutoff 48h UTC: ${new Date(cutoffTimestamp).toISOString()}`)
    
    const eligibleLeads = (leads || [])
      .filter(deal => {
        // Verificar max_followups ANTES de enviar
        const currentCount = deal.followup_count || 0
        const maxFollowups = deal.max_followups || 999 // Se não definido, continua indefinidamente
        
        if (currentCount >= maxFollowups) {
          console.log(`⛔ Deal ${deal.id}: Atingiu limite de follow-ups (${currentCount}/${maxFollowups})`)
          return false
        }
        
        // Usar Math.max para pegar a data mais recente entre last_interaction e last_followup_at
        const mostRecentDate = getMostRecentDate(deal.last_interaction, deal.last_followup_at)
        
        // Se nunca teve interação, é elegível
        if (!mostRecentDate) {
          console.log(`✅ Deal ${deal.id}: Nunca teve interação, elegível`)
          return true
        }
        
        // Comparar timestamps em UTC (ambos são UTC)
        const mostRecentTimestamp = mostRecentDate.getTime()
        const isEligible = mostRecentTimestamp < cutoffTimestamp
        
        console.log(`📅 Deal ${deal.id}: Última atividade ${mostRecentDate.toISOString()}, cutoff ${new Date(cutoffTimestamp).toISOString()}, elegível: ${isEligible}`)
        
        return isEligible
      })
      .map(deal => {
        // Corrigir acesso: leads pode ser array ou objeto
        const leadsData = deal.leads
        const clientData = Array.isArray(leadsData) 
          ? leadsData[0]?.clients 
          : (leadsData as any)?.clients
        
        const leadPhone = clientData?.phone
        const phone = formatBrazilianPhone(leadPhone)
        const clientName = clientData?.name || 'Cliente'
        
        // Calcular o número do follow-up que será enviado
        const followupNumber = (deal.followup_count || 0) + 1
        
        return {
          deal_id: deal.id,
          lead_id: deal.lead_id,
          client_name: clientName,
          client_phone: phone,
          conversation_history: deal.conversation_history,
          followup_count: deal.followup_count || 0,
          max_followups: deal.max_followups || 999,
          followup_number: followupNumber, // Enviar no payload para n8n
          owner_id: deal.owner_id,
          owner_name: (deal.profiles as any)?.full_name || null,
          product_type: deal.product_type,
          categoria: deal.categoria,
          last_interaction: deal.last_interaction
        }
      })
      .filter((lead): lead is LeadForFollowup => lead.client_phone !== null)

    console.log(`✅ Leads elegíveis para follow-up: ${eligibleLeads.length}`)

    if (eligibleLeads.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum lead elegível para follow-up',
          dispatched: 0,
          eligible: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Callback URL para n8n atualizar histórico após envio
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-followup-history`

    // Enviar para webhook n8n
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const lead of eligibleLeads) {
      try {
        console.log(`📤 Enviando lead ${lead.client_name} (follow-up #${lead.followup_number}) para webhook...`)
        
        const payload = {
          deal_id: lead.deal_id,
          client_name: lead.client_name,
          client_phone: lead.client_phone,
          conversation_history: lead.conversation_history || '',
          followup_count: lead.followup_count,
          followup_number: lead.followup_number, // SINCRONIZAR com update-followup-history
          product_type: lead.product_type,
          categoria: lead.categoria,
          last_interaction: lead.last_interaction,
          callback_url: callbackUrl
        }

        const response = await fetch(webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          console.log(`✅ Lead ${lead.client_name} enviado com sucesso`)
          results.success++
          
          // Registrar log com status 'pending' e followup_number correto
          const { error: logError } = await supabase
            .from('followup_logs')
            .insert({
              deal_id: lead.deal_id,
              followup_number: lead.followup_number,
              status: 'pending',
              message_sent: 'Enviado para n8n via webhook - aguardando processamento'
            })
          
          if (logError) {
            console.warn(`⚠️ Erro ao criar log pending: ${logError.message}`)
          }
        } else {
          const errorText = await response.text()
          console.error(`❌ Erro ao enviar lead ${lead.client_name}:`, errorText)
          results.failed++
          results.errors.push(`${lead.client_name}: ${errorText}`)
          
          // Registrar falha
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
        console.error(`❌ Erro ao processar lead ${lead.client_name}:`, error.message)
        results.failed++
        results.errors.push(`${lead.client_name}: ${error.message}`)
      }
    }

    console.log(`🏁 Disparo concluído: ${results.success} sucesso, ${results.failed} falhas`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Follow-ups disparados: ${results.success} sucesso, ${results.failed} falhas`,
        dispatched: results.success,
        failed: results.failed,
        eligible: eligibleLeads.length,
        errors: results.errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Erro no dispatch-followup:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
