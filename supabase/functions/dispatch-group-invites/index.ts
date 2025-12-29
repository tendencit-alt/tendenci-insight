import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Verifica se estamos em horário comercial (Brasil)
 */
function isBusinessHours(): boolean {
  const now = new Date()
  const brasilOffset = -3 * 60 // UTC-3
  const brasilTime = new Date(now.getTime() + (now.getTimezoneOffset() + brasilOffset) * 60000)
  
  const hour = brasilTime.getHours()
  const dayOfWeek = brasilTime.getDay() // 0 = domingo, 6 = sábado
  
  // Segunda a Sexta, 9h às 18h
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const isWorkingHours = hour >= 9 && hour < 18
  
  return isWeekday && isWorkingHours
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('🚀 [dispatch-group-invites] Iniciando dispatch...')

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parâmetros opcionais
    let body: { limit?: number; ignore_business_hours?: boolean } = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const limit = body.limit || 30
    const ignoreBusinessHours = body.ignore_business_hours || false

    // Verificar horário comercial
    if (!ignoreBusinessHours && !isBusinessHours()) {
      console.log('⏰ Fora do horário comercial. Abortando.')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Fora do horário comercial (9h-18h, Seg-Sex)',
          dispatched: 0,
          skipped: 0,
          failed: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Buscar deals elegíveis
    console.log('🔍 Buscando deals elegíveis...')
    
    const eligibleResponse = await supabase.functions.invoke('get-eligible-group-invites', {
      body: { limit }
    })

    if (eligibleResponse.error) {
      throw new Error(`Erro ao buscar elegíveis: ${eligibleResponse.error.message}`)
    }

    const eligibleData = eligibleResponse.data
    const deals = eligibleData?.deals || []

    console.log(`📊 Deals elegíveis encontrados: ${deals.length}`)

    if (deals.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum deal elegível para convite',
          dispatched: 0,
          skipped: 0,
          failed: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Enviar convites
    let dispatched = 0
    let failed = 0
    const results: any[] = []

    for (const deal of deals) {
      try {
        console.log(`📨 Enviando convite para deal ${deal.deal_id}...`)
        
        const sendResponse = await supabase.functions.invoke('send-group-invite', {
          body: {
            deal_id: deal.deal_id,
            client_name: deal.client_name,
            client_phone: deal.client_phone,
            owner_id: deal.owner_id
          }
        })

        if (sendResponse.error) {
          console.error(`❌ Falha deal ${deal.deal_id}:`, sendResponse.error)
          failed++
          results.push({
            deal_id: deal.deal_id,
            success: false,
            error: sendResponse.error.message
          })
        } else {
          console.log(`✅ Sucesso deal ${deal.deal_id}`)
          dispatched++
          results.push({
            deal_id: deal.deal_id,
            success: true
          })
        }

        // Delay entre envios para não sobrecarregar API
        await new Promise(resolve => setTimeout(resolve, 1500))

      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Erro desconhecido'
        console.error(`❌ Erro ao processar deal ${deal.deal_id}:`, error)
        failed++
        results.push({
          deal_id: deal.deal_id,
          success: false,
          error: errMsg
        })
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`🏁 [dispatch-group-invites] Concluído em ${elapsed}ms`)
    console.log(`📊 Resultados: ${dispatched} enviados, ${failed} falhas`)

    return new Response(
      JSON.stringify({
        success: true,
        dispatched,
        failed,
        total_eligible: deals.length,
        results,
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
