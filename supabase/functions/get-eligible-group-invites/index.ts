import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EligibleDeal {
  deal_id: string
  deal_title: string
  client_name: string
  client_phone: string
  owner_id: string | null
  status: string
  created_at: string
  days_in_pipeline: number
}

/**
 * Formata número de telefone brasileiro para WhatsApp
 */
function formatBrazilianPhone(phone: string | null): string | null {
  if (!phone) return null
  
  let clean = phone.replace(/\D/g, '')
  
  // Remover zeros à esquerda
  while (clean.startsWith('0')) {
    clean = clean.substring(1)
  }
  
  if (clean.length < 10 || clean.length > 13) return null
  
  // Normalizar para 11 dígitos (DDD + 9 + 8 dígitos)
  if (clean.length === 10) {
    clean = clean.slice(0, 2) + '9' + clean.slice(2)
  } else if (clean.length === 12 && clean.startsWith('55')) {
    clean = clean.slice(2, 4) + '9' + clean.slice(4)
  } else if (clean.length === 13 && clean.startsWith('55')) {
    clean = clean.slice(2)
  }
  
  if (clean.length !== 11) return null
  
  const ddd = parseInt(clean.slice(0, 2))
  if (ddd < 11 || ddd > 99) return null
  
  if (clean[2] !== '9') return null
  
  return clean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('🔍 [get-eligible-group-invites] Iniciando busca...')

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parâmetros opcionais
    let body: { limit?: number; ignore_time_filter?: boolean } = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const limit = body.limit || 50
    const ignoreTimeFilter = body.ignore_time_filter || false

    // Calcular data de 7 dias atrás
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoffDate = sevenDaysAgo.toISOString()

    console.log(`📅 Cutoff date: ${cutoffDate}`)
    console.log(`🔢 Limit: ${limit}`)

    // Buscar deals elegíveis:
    // - created_at <= 7 dias atrás
    // - group_invite_sent = false (ou null)
    // - Qualquer status (aberto, won, lost)
    // - Qualquer stage
    const { data: deals, error: dealsError } = await supabase
      .from('crm_deals')
      .select(`
        id,
        title,
        status,
        owner_id,
        created_at,
        lead_id,
        leads!crm_deals_lead_id_fkey (
          id,
          clients!leads_client_id_fkey (
            id,
            name,
            phone
          )
        )
      `)
      .lte('created_at', cutoffDate)
      .or('group_invite_sent.is.null,group_invite_sent.eq.false')
      .limit(limit * 2) // Buscar mais para compensar filtros

    if (dealsError) {
      console.error('❌ Erro ao buscar deals:', dealsError)
      throw dealsError
    }

    console.log(`📊 Deals encontrados (pré-filtro): ${deals?.length || 0}`)

    const eligibleDeals: EligibleDeal[] = []

    for (const deal of deals || []) {
      // Extrair dados do cliente
      const lead = deal.leads as any
      const client = lead?.clients as any
      
      if (!client?.phone) {
        console.log(`⏭️ Deal ${deal.id} sem telefone de cliente`)
        continue
      }

      // Validar e formatar telefone
      const formattedPhone = formatBrazilianPhone(client.phone)
      if (!formattedPhone) {
        console.log(`⏭️ Deal ${deal.id} com telefone inválido: ${client.phone}`)
        continue
      }

      // Calcular dias no pipeline
      const createdAt = new Date(deal.created_at)
      const now = new Date()
      const daysInPipeline = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

      eligibleDeals.push({
        deal_id: deal.id,
        deal_title: deal.title,
        client_name: client.name || 'Cliente',
        client_phone: formattedPhone,
        owner_id: deal.owner_id,
        status: deal.status || 'aberto',
        created_at: deal.created_at,
        days_in_pipeline: daysInPipeline
      })

      if (eligibleDeals.length >= limit) break
    }

    const elapsed = Date.now() - startTime
    console.log(`✅ [get-eligible-group-invites] Concluído em ${elapsed}ms`)
    console.log(`📊 Deals elegíveis: ${eligibleDeals.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        eligible_count: eligibleDeals.length,
        deals: eligibleDeals,
        cutoff_date: cutoffDate,
        elapsed_ms: elapsed
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
