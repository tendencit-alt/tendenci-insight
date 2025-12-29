import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cooldown em minutos para evitar sobreposição de disparos
const DISPATCH_COOLDOWN_MINUTES = 30

// Limite global de falhas por hora (pausa sistema)
const MAX_GLOBAL_FAILURES_PER_HOUR = 10

/**
 * dispatch-group-invites v2.0
 * 
 * MELHORIAS v2.0:
 * - Registro de falhas em system_errors
 * - Proteção contra excesso de falhas globais
 * - Source corretamente propagado
 * - Melhor logging
 */

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
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🚀 [dispatch-group-invites v2.0] Iniciando dispatch...')
  console.log('═══════════════════════════════════════════════════════════')

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parâmetros opcionais
    let body: { limit?: number; ignore_business_hours?: boolean; source?: 'cron' | 'manual' } = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const limit = body.limit || 30
    const ignoreBusinessHours = body.ignore_business_hours || false
    const dispatchSource = body.source || 'cron'
    
    console.log(`📋 Limite: ${limit}, IgnoreBusinessHours: ${ignoreBusinessHours}, Source: ${dispatchSource}`)

    // ═══════════════════════════════════════════════════════════
    // VERIFICAÇÃO DE COOLDOWN (evitar sobreposição)
    // ═══════════════════════════════════════════════════════════
    const cooldownMinutesAgo = new Date(Date.now() - DISPATCH_COOLDOWN_MINUTES * 60 * 1000).toISOString()
    
    // Verificar disparos recentes de convites de grupo
    const { data: recentDispatches } = await supabase
      .from('crm_deals')
      .select('group_invite_sent_at')
      .eq('group_invite_sent', true)
      .gte('group_invite_sent_at', cooldownMinutesAgo)
      .order('group_invite_sent_at', { ascending: false })
      .limit(1)
    
    const recentDispatch = recentDispatches?.[0]
    
    if (recentDispatch && recentDispatch.group_invite_sent_at) {
      const recentTime = new Date(recentDispatch.group_invite_sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      
      if (dispatchSource === 'cron') {
        // CRON aborta silenciosamente se houve disparo recente
        console.log(`⏸️ CRON abortado: convite recente às ${recentTime} - cooldown ${DISPATCH_COOLDOWN_MINUTES}min ativo`)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Cooldown ativo - convite recente às ${recentTime}`,
            dispatched: 0,
            skipped: 0,
            failed: 0,
            skipped_reason: 'cooldown_active',
            source: dispatchSource
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      } else {
        // Manual prossegue com aviso
        console.log(`⚠️ Disparo manual sobrepondo convite recente às ${recentTime}`)
      }
    }

    // ═══════════════════════════════════════════════════════════
    // VERIFICAR LIMITE GLOBAL DE FALHAS/HORA
    // ═══════════════════════════════════════════════════════════
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    // Contar falhas recentes no system_errors relacionadas a group invites
    const { count: recentGlobalFailures } = await supabase
      .from('system_errors')
      .select('*', { count: 'exact', head: true })
      .eq('module', 'group-invite')
      .gte('created_at', oneHourAgo)
    
    if ((recentGlobalFailures || 0) >= MAX_GLOBAL_FAILURES_PER_HOUR) {
      console.error(`🚨 SISTEMA PAUSADO: ${recentGlobalFailures} falhas na última hora`)
      
      await logSystemError(
        supabase,
        'Sistema de Convites de Grupo Pausado',
        'group-invite',
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
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503 
        }
      )
    }

    // Verificar horário comercial
    if (!ignoreBusinessHours && !isBusinessHours()) {
      console.log('⏰ Fora do horário comercial. Abortando.')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Fora do horário comercial (9h-18h, Seg-Sex)',
          dispatched: 0,
          skipped: 0,
          failed: 0,
          source: dispatchSource
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
      const errorMsg = `Erro ao buscar elegíveis: ${eligibleResponse.error.message}`
      console.error(`❌ ${errorMsg}`)
      
      await logSystemError(
        supabase,
        'Erro ao buscar deals elegíveis',
        'group-invite',
        errorMsg,
        'high',
        { error: eligibleResponse.error }
      )
      
      throw new Error(errorMsg)
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
          failed: 0,
          source: dispatchSource
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
            owner_id: deal.owner_id,
            source: dispatchSource
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
          
          // ✅ CORREÇÃO v2.0: Registrar falha em system_errors
          await logSystemError(
            supabase,
            `Falha ao enviar convite de grupo`,
            'group-invite',
            `Deal ${deal.deal_id} (${deal.client_name}): ${sendResponse.error.message}`,
            'medium',
            { 
              deal_id: deal.deal_id, 
              client_name: deal.client_name,
              error: sendResponse.error.message,
              source: dispatchSource
            }
          )
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
        
        // ✅ CORREÇÃO v2.0: Registrar falha em system_errors
        await logSystemError(
          supabase,
          `Erro inesperado ao enviar convite de grupo`,
          'group-invite',
          `Deal ${deal.deal_id}: ${errMsg}`,
          'high',
          { 
            deal_id: deal.deal_id, 
            error: errMsg,
            source: dispatchSource
          }
        )
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`🏁 [dispatch-group-invites] Concluído em ${elapsed}ms`)
    console.log(`📊 Resultados: ${dispatched} enviados, ${failed} falhas`)
    console.log('═══════════════════════════════════════════════════════════')

    return new Response(
      JSON.stringify({
        success: true,
        dispatched,
        failed,
        total_eligible: deals.length,
        results,
        elapsed_ms: elapsed,
        source: dispatchSource
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro:', error)
    console.log('═══════════════════════════════════════════════════════════')
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