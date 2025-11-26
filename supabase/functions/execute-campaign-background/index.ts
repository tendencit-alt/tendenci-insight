import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExecuteCampaignRequest {
  campanha_id: string
  arquiteto_ids: string[]
}

// 🚀 NOVA ARQUITETURA: Processa 1 arquiteto por invocação + auto-invoke via pg_net
async function processNextInQueue(supabase: any, evolutionUrl: string, evolutionApiKey: string) {
  console.log('🔍 Buscando próximo arquiteto na fila...')
  
  // Buscar próximo arquiteto pendente ordenado por agendado_para
  const { data: nextInQueue, error: queueError } = await supabase
    .from('tendenci_campaign_queue')
    .select(`
      *,
      tendenci_campaign_dispatches(id, status, enviados_sucesso, enviados_erro, total_arquitetos),
      tendenci_prospec_arq_campaigns(
        tipo_envio, 
        conteudo_texto, 
        conteudo_imagem_url, 
        conteudo_audio_url,
        webhook_n8n,
        whatsapp_connection_id,
        tendenci_whatsapp_connections(instance_name, instance_id)
      ),
      architects(id, name, phone)
    `)
    .eq('status', 'pendente')
    .lte('agendado_para', new Date().toISOString())
    .order('agendado_para', { ascending: true })
    .limit(1)
    .single()

  if (queueError || !nextInQueue) {
    console.log('✅ Nenhum arquiteto pendente na fila')
    return null
  }

  // Verificar se dispatch foi cancelado
  if (nextInQueue.tendenci_campaign_dispatches.status === 'cancelado') {
    console.log(`🛑 Dispatch ${nextInQueue.dispatch_id} cancelado, pulando`)
    await supabase
      .from('tendenci_campaign_queue')
      .update({ status: 'cancelado' })
      .eq('id', nextInQueue.id)
    return null
  }

  console.log(`📤 Processando: ${nextInQueue.architects.name} (posição ${nextInQueue.position})`)

  const startTime = Date.now()
  
  try {
    const campanha = nextInQueue.tendenci_prospec_arq_campaigns
    const instanceName = campanha.tendenci_whatsapp_connections?.instance_name
    const instanceId = campanha.tendenci_whatsapp_connections?.instance_id

    // Atualizar progresso no dispatch
    const currentPosition = nextInQueue.position
    const totalArquitetos = nextInQueue.tendenci_campaign_dispatches.total_arquitetos
    const progresso = Math.round((currentPosition / totalArquitetos) * 100)

    await supabase
      .from('tendenci_campaign_dispatches')
      .update({
        arquiteto_atual: nextInQueue.architects.name,
        progresso_percentual: progresso,
        updated_at: new Date().toISOString()
      })
      .eq('id', nextInQueue.dispatch_id)

    // Chamar dispatch-campaign
    const dispatchResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/dispatch-campaign`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
        },
        body: JSON.stringify({
          campanha_id: nextInQueue.campanha_id,
          arquiteto_id: nextInQueue.arquiteto_id,
          nome: nextInQueue.architects.name,
          telefone: nextInQueue.architects.phone,
          tipo_envio: campanha.tipo_envio,
          conteudo_texto: campanha.conteudo_texto,
          conteudo_imagem_url: campanha.conteudo_imagem_url,
          conteudo_audio_url: campanha.conteudo_audio_url,
          instance_name: instanceName,
          instance_id: instanceId,
          whatsapp_connection_id: campanha.whatsapp_connection_id,
          webhook_n8n: campanha.webhook_n8n
        })
      }
    )

    const result = await dispatchResponse.json()
    const endTime = Date.now()
    const tempoSegundos = Math.round((endTime - startTime) / 1000)

    if (result.status === 'success') {
      console.log(`✅ Sucesso em ${tempoSegundos}s`)
      
      // Marcar como enviado na fila
      await supabase
        .from('tendenci_campaign_queue')
        .update({
          status: 'enviado',
          enviado_em: new Date().toISOString()
        })
        .eq('id', nextInQueue.id)

      // Incrementar contador de sucesso
      await supabase
        .from('tendenci_campaign_dispatches')
        .update({
          enviados_sucesso: nextInQueue.tendenci_campaign_dispatches.enviados_sucesso + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', nextInQueue.dispatch_id)

    } else {
      console.error(`❌ Erro: ${result.error}`)
      
      // Marcar como erro na fila
      await supabase
        .from('tendenci_campaign_queue')
        .update({
          status: 'erro',
          erro_mensagem: result.error || 'Erro desconhecido',
          tentativas: nextInQueue.tentativas + 1
        })
        .eq('id', nextInQueue.id)

      // Incrementar contador de erro
      await supabase
        .from('tendenci_campaign_dispatches')
        .update({
          enviados_erro: nextInQueue.tendenci_campaign_dispatches.enviados_erro + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', nextInQueue.dispatch_id)
    }

  } catch (err) {
    console.error(`💥 Exceção:`, err)
    
    await supabase
      .from('tendenci_campaign_queue')
      .update({
        status: 'erro',
        erro_mensagem: err instanceof Error ? err.message : 'Erro desconhecido',
        tentativas: nextInQueue.tentativas + 1
      })
      .eq('id', nextInQueue.id)

    await supabase
      .from('tendenci_campaign_dispatches')
      .update({
        enviados_erro: nextInQueue.tendenci_campaign_dispatches.enviados_erro + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', nextInQueue.dispatch_id)
  }

  // Verificar se há mais pendentes neste dispatch
  const { count: pendingCount } = await supabase
    .from('tendenci_campaign_queue')
    .select('*', { count: 'exact', head: true })
    .eq('dispatch_id', nextInQueue.dispatch_id)
    .eq('status', 'pendente')

  if (pendingCount === 0) {
    // Marcar dispatch como concluído
    console.log(`✅ Dispatch ${nextInQueue.dispatch_id} concluído!`)
    
    await supabase
      .from('tendenci_campaign_dispatches')
      .update({
        status: 'concluido',
        progresso_percentual: 100,
        concluido_em: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', nextInQueue.dispatch_id)

    // Atualizar status da campanha
    await supabase
      .from('tendenci_prospec_arq_campaigns')
      .update({ status: 'enviado' })
      .eq('id', nextInQueue.campanha_id)

    return null // Não auto-invocar
  }

  // 🔄 AUTO-INVOKE: Agendar próxima execução em 3 minutos via pg_net
  console.log(`⏳ Agendando próximo envio em 3 minutos...`)
  
  const nextInvocationTime = new Date(Date.now() + (3 * 60 * 1000)) // 3 minutos
  
  await supabase.rpc('http_post', {
    url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-campaign-background`,
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
      'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
    },
    body: JSON.stringify({ auto_invoke: true }),
    timeout_milliseconds: 30000,
    method: 'POST'
  })

  return { scheduled: true, next_at: nextInvocationTime }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🎯 Execute Campaign Background - Iniciando')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Evolution API não configurada'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    const body = await req.json()
    
    // Modo 1: Auto-invoke (processa próximo da fila)
    if (body.auto_invoke) {
      console.log('🔄 Modo auto-invoke')
      
      const result = await processNextInQueue(supabase, evolutionUrl, evolutionApiKey)
      
      return new Response(
        JSON.stringify({ 
          success: true,
          processed: !!result,
          ...result
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Modo 2: Iniciar nova campanha (enfileirar arquitetos)
    const { campanha_id, arquiteto_ids }: ExecuteCampaignRequest = body

    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Não autenticado'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Usuário não encontrado'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    console.log(`📋 Nova campanha ${campanha_id} com ${arquiteto_ids.length} arquitetos`)

    // Criar registro de dispatch
    const { data: dispatch, error: dispatchError } = await supabase
      .from('tendenci_campaign_dispatches')
      .insert({
        campanha_id,
        user_id: user.id,
        status: 'em_andamento',
        total_arquitetos: arquiteto_ids.length,
        enviados_sucesso: 0,
        enviados_erro: 0,
        progresso_percentual: 0,
        iniciado_em: new Date().toISOString()
      })
      .select()
      .single()

    if (dispatchError || !dispatch) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erro ao criar dispatch'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    // Enfileirar todos os arquitetos
    const queueItems = arquiteto_ids.map((arquiteto_id, index) => ({
      dispatch_id: dispatch.id,
      arquiteto_id,
      campanha_id,
      position: index + 1,
      status: 'pendente',
      agendado_para: new Date(Date.now() + (index * 3 * 60 * 1000)).toISOString() // 3 min entre cada
    }))

    const { error: queueError } = await supabase
      .from('tendenci_campaign_queue')
      .insert(queueItems)

    if (queueError) {
      console.error('Erro ao enfileirar arquitetos:', queueError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erro ao criar fila de envios'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    console.log(`✅ ${arquiteto_ids.length} arquitetos enfileirados`)

    // Iniciar processamento imediatamente (primeiro arquiteto)
    // @ts-ignore - EdgeRuntime é global no Deno Deploy
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(
        processNextInQueue(supabase, evolutionUrl, evolutionApiKey)
      )
    } else {
      // Fallback local
      processNextInQueue(supabase, evolutionUrl, evolutionApiKey)
        .catch(err => console.error('Erro no processamento:', err))
    }

    // Retornar imediatamente
    return new Response(
      JSON.stringify({ 
        success: true,
        dispatch_id: dispatch.id,
        message: `Campanha iniciada! ${arquiteto_ids.length} arquitetos enfileirados.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Erro inesperado:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})