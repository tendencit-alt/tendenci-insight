import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  isBusinessHoursBrasil, 
  get48HoursCutoffUTC,
  getMostRecentDate,
  getCurrentHourBrasil,
  getCurrentDayOfWeekBrasil
} from '../_shared/timezone.ts'

/**
 * get-eligible-followups
 * 
 * CORREÇÕES v2.0:
 * - Logs detalhados para debug de horário
 * - Filtro para excluir deals com falhas consecutivas (3+ em 24h)
 * - Proteção robusta contra execução fora do horário
 * 
 * Endpoint para a IA de atendimento consultar quais deals precisam de follow-up.
 * Retorna lista de deals elegíveis com todas as informações necessárias para
 * a IA gerar e enviar mensagens personalizadas.
 */

interface EligibleDeal {
  deal_id: string
  session_id: string
  client_name: string
  client_phone: string
  conversation_history: string | null
  followup_count: number
  followup_number: number
  max_followups: number
  product_type: string | null
  categoria: string | null
  last_interaction: string | null
  owner_name: string | null
  deal_title: string
}

// Máximo de falhas consecutivas permitidas em 24h
const MAX_CONSECUTIVE_FAILURES = 3

// Formata número brasileiro para WhatsApp
function formatBrazilianPhone(phone: string | null): string | null {
  if (!phone) return null
  
  let cleaned = phone.replace(/\D/g, '')
  
  // Remove prefixos duplicados
  if (cleaned.startsWith('5555')) {
    cleaned = cleaned.substring(2)
  }
  
  // Remove zero à esquerda
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  
  // Corrige 550XX para 55XX
  if (cleaned.startsWith('550')) {
    cleaned = '55' + cleaned.substring(3)
  }
  
  // Adiciona 9 para números sem (10 dígitos sem 55)
  if (cleaned.length === 10 && !cleaned.startsWith('55')) {
    cleaned = cleaned.substring(0, 2) + '9' + cleaned.substring(2)
  }
  
  // Adiciona 9 para números com 55 mas sem 9 (12 dígitos)
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    cleaned = cleaned.substring(0, 4) + '9' + cleaned.substring(4)
  }
  
  // Adiciona 55 se não tiver
  if (!cleaned.startsWith('55') && cleaned.length >= 10) {
    cleaned = '55' + cleaned
  }
  
  // Valida tamanho final (55 + DDD + 9 + 8 dígitos = 13)
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
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🔍 [GET-ELIGIBLE-FOLLOWUPS] Iniciando busca...')
    console.log('═══════════════════════════════════════════════════════════')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parâmetros opcionais do body
    let body: { ignore_time_filter?: boolean; limit?: number } = {}
    try {
      const text = await req.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch {
      // Body vazio - ok
    }

    const ignoreTimeFilter = body.ignore_time_filter || false
    const limit = body.limit || 50

    console.log(`📋 Parâmetros: ignore_time_filter=${ignoreTimeFilter}, limit=${limit}`)

    // ═══════════════════════════════════════════════════════════
    // VERIFICAÇÃO DE HORÁRIO COMERCIAL (CRÍTICA)
    // ═══════════════════════════════════════════════════════════
    const isBusinessHours = isBusinessHoursBrasil()
    const hour = getCurrentHourBrasil()
    const day = getCurrentDayOfWeekBrasil()
    
    console.log(`🕐 Resumo: Hora=${hour}h, Dia=${day}, BusinessHours=${isBusinessHours}`)

    // PROTEÇÃO ROBUSTA: Mesmo com ignore_time_filter, não processa fora do horário
    const isTestMode = req.headers.get('X-Test-Mode') === 'true'
    
    if (!isBusinessHours && !isTestMode) {
      console.log('⏰ BLOQUEADO: Fora do horário comercial (9h-18h, Seg-Sex)')
      console.log('═══════════════════════════════════════════════════════════')
      return new Response(
        JSON.stringify({ 
          success: true, 
          eligible: [],
          count: 0,
          message: 'Fora do horário comercial (Seg-Sex 9h-18h Brasil)',
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
      console.log(`⛔ ${dealsToExclude.size} deals excluídos por ${MAX_CONSECUTIVE_FAILURES}+ falhas em 24h`)
    }

    // Buscar etapa "Follow Up (I.A)"
    const { data: followupStage, error: stageError } = await supabase
      .from('crm_stages')
      .select('id, name')
      .ilike('name', '%Follow Up%')
      .maybeSingle()

    if (stageError) {
      console.warn('⚠️ Erro ao buscar etapa Follow Up:', stageError.message)
    }

    const followupStageId = followupStage?.id
    console.log(`📌 Etapa Follow Up: ${followupStage?.name || 'não encontrada'} (${followupStageId || 'N/A'})`)

    // Buscar deals elegíveis
    let query = supabase
      .from('crm_deals')
      .select(`
        id,
        title,
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

    // Filtrar por etapa se encontrada
    if (followupStageId) {
      query = query.eq('stage_id', followupStageId)
    }

    const { data: deals, error: dealsError } = await query.limit(limit * 2) // Buscar mais para filtrar depois

    if (dealsError) {
      console.error('❌ Erro ao buscar deals:', dealsError)
      throw dealsError
    }

    console.log(`📊 Deals com follow-up ativo: ${deals?.length || 0}`)

    // Cutoff de 48h
    const cutoffTimestamp = get48HoursCutoffUTC()
    console.log(`⏰ Cutoff 48h: ${new Date(cutoffTimestamp).toISOString()}`)

    // Filtrar deals elegíveis
    const eligibleDeals: EligibleDeal[] = []

    for (const deal of (deals || [])) {
      // Verificar se está na lista de excluídos por falhas
      if (dealsToExclude.has(deal.id)) {
        console.log(`⛔ Deal ${deal.id}: Excluído por falhas consecutivas`)
        continue
      }

      const currentCount = deal.followup_count || 0
      const maxFollowups = deal.max_followups || 999

      // Verificar limite de follow-ups
      if (currentCount >= maxFollowups) {
        console.log(`⛔ Deal ${deal.id}: Atingiu limite (${currentCount}/${maxFollowups})`)
        continue
      }

      // Verificar tempo desde última interação
      const mostRecentDate = getMostRecentDate(deal.last_interaction, deal.last_followup_at)
      
      if (mostRecentDate && mostRecentDate.getTime() >= cutoffTimestamp) {
        console.log(`⏳ Deal ${deal.id}: Interação recente, aguardando`)
        continue
      }

      // Extrair dados do cliente
      const leadsData = deal.leads
      const clientData = Array.isArray(leadsData) 
        ? leadsData[0]?.clients 
        : (leadsData as any)?.clients

      const clientName = clientData?.name || 'Cliente'
      const rawPhone = clientData?.phone
      const formattedPhone = formatBrazilianPhone(rawPhone)

      // Verificar telefone válido
      if (!formattedPhone) {
        console.log(`📵 Deal ${deal.id}: Telefone inválido (${rawPhone})`)
        continue
      }

      const followupNumber = currentCount + 1

      eligibleDeals.push({
        deal_id: deal.id,
        session_id: deal.id, // Usar deal_id como session_id para a IA
        client_name: clientName,
        client_phone: formattedPhone,
        conversation_history: deal.conversation_history,
        followup_count: currentCount,
        followup_number: followupNumber,
        max_followups: maxFollowups,
        product_type: deal.product_type,
        categoria: deal.categoria,
        last_interaction: deal.last_interaction,
        owner_name: (deal.profiles as any)?.full_name || null,
        deal_title: deal.title
      })

      console.log(`✅ Deal ${deal.id} elegível: ${clientName} - Follow-up #${followupNumber}`)

      // Limitar quantidade
      if (eligibleDeals.length >= limit) {
        break
      }
    }

    console.log(`🎯 Total elegíveis: ${eligibleDeals.length}`)
    console.log('═══════════════════════════════════════════════════════════')

    return new Response(
      JSON.stringify({ 
        success: true, 
        eligible: eligibleDeals,
        count: eligibleDeals.length,
        excluded_by_failures: dealsToExclude.size,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-followup-history`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Erro em get-eligible-followups:', error)
    console.log('═══════════════════════════════════════════════════════════')
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
