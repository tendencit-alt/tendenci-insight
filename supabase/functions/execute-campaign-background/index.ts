import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExecuteCampaignRequest {
  campanha_id: string
  arquiteto_ids: string[]
}

interface ProcessNextRequest {
  process_next: boolean
  dispatch_id?: string
}

// 🎯 NOVA ARQUITETURA: Processa APENAS 1 arquiteto por invocação
// Frontend controla o intervalo de 3 minutos entre invocações
async function processNextInQueue(supabase: any) {
  console.log('🔍 [PROCESS] Buscando próximo arquiteto pendente...')
  
  // Buscar próximo arquiteto pendente ordenado por agendado_para
  const { data: nextInQueue, error: queueError } = await supabase
    .from('tendenci_campaign_queue')
    .select(`
      *,
      tendenci_campaign_dispatches!inner(id, status, enviados_sucesso, enviados_erro, total_arquitetos),
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
    .eq('tendenci_campaign_dispatches.status', 'em_andamento')
    .lte('agendado_para', new Date().toISOString())
    .order('agendado_para', { ascending: true })
    .limit(1)
    .single()

  if (queueError) {
    console.log('⚠️ [PROCESS] Nenhum item pendente encontrado')
    return { 
      success: true, 
      processed: false, 
      has_more: false,
      message: 'Nenhum item pendente'
    }
  }

  if (!nextInQueue) {
    console.log('✅ [PROCESS] Fila vazia')
    return { 
      success: true, 
      processed: false, 
      has_more: false,
      message: 'Fila vazia'
    }
  }

  console.log(`📤 [PROCESS] Processando: ${nextInQueue.architects.name} (posição ${nextInQueue.position}/${nextInQueue.tendenci_campaign_dispatches[0].total_arquitetos})`)

  const startTime = Date.now()
  
  try {
    const dispatch = nextInQueue.tendenci_campaign_dispatches[0]
    const campanha = nextInQueue.tendenci_prospec_arq_campaigns

    // Supabase retorna relacionamentos como array
    const whatsappConn = Array.isArray(campanha.tendenci_whatsapp_connections)
      ? campanha.tendenci_whatsapp_connections[0]
      : campanha.tendenci_whatsapp_connections
    
    const instanceName = whatsappConn?.instance_name
    const instanceId = whatsappConn?.instance_id

    // Atualizar progresso no dispatch
    const currentPosition = nextInQueue.position
    const totalArquitetos = dispatch.total_arquitetos
    const progresso = Math.round((currentPosition / totalArquitetos) * 100)

    console.log(`📊 [PROCESS] Atualizando progresso: ${progresso}%`)

    await supabase
      .from('tendenci_campaign_dispatches')
      .update({
        arquiteto_atual: nextInQueue.architects.name,
        progresso_percentual: progresso,
        updated_at: new Date().toISOString()
      })
      .eq('id', nextInQueue.dispatch_id)

    // Chamar dispatch-campaign
    console.log('🚀 [PROCESS] Chamando dispatch-campaign...')
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
      console.log(`✅ [PROCESS] Sucesso em ${tempoSegundos}s`)
      
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
          enviados_sucesso: dispatch.enviados_sucesso + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', nextInQueue.dispatch_id)

    } else {
      console.error(`❌ [PROCESS] Erro no envio: ${result.error}`)
      
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
          enviados_erro: dispatch.enviados_erro + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', nextInQueue.dispatch_id)
    }

  } catch (err) {
    console.error(`💥 [PROCESS] Exceção:`, err)
    
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
        enviados_erro: nextInQueue.tendenci_campaign_dispatches[0].enviados_erro + 1,
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

  console.log(`📊 [PROCESS] Itens pendentes restantes: ${pendingCount || 0}`)

  if (pendingCount === 0) {
    // Marcar dispatch como concluído
    console.log(`✅ [PROCESS] Dispatch ${nextInQueue.dispatch_id} concluído!`)
    
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

    return {
      success: true,
      processed: true,
      has_more: false,
      message: 'Dispatch concluído',
      dispatch_id: nextInQueue.dispatch_id
    }
  }

  return {
    success: true,
    processed: true,
    has_more: true,
    message: 'Item processado com sucesso',
    dispatch_id: nextInQueue.dispatch_id,
    remaining: pendingCount
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🎯 [MAIN] Execute Campaign Background - Iniciando')

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

    const body = await req.json() as ExecuteCampaignRequest | ProcessNextRequest

    // ⚡ MODO 1: Processar próximo item da fila (chamado pelo frontend)
    if ('process_next' in body && body.process_next) {
      console.log('🔄 [MAIN] Modo: process_next')
      
      const result = await processNextInQueue(supabase)
      
      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // 🚀 MODO 2: Iniciar nova campanha (criar fila e dispatch)
    const { campanha_id, arquiteto_ids } = body as ExecuteCampaignRequest

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

    console.log(`📋 [MAIN] Nova campanha ${campanha_id} com ${arquiteto_ids.length} arquitetos`)

    // Validar instância WhatsApp
    const { data: campanha, error: campanhaError } = await supabase
      .from('tendenci_prospec_arq_campaigns')
      .select(`
        whatsapp_connection_id,
        tendenci_whatsapp_connections(instance_name, status)
      `)
      .eq('id', campanha_id)
      .single()

    if (campanhaError || !campanha) {
      console.error('❌ [MAIN] Campanha não encontrada:', campanhaError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Campanha não encontrada'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    const whatsappConn = Array.isArray(campanha.tendenci_whatsapp_connections)
      ? campanha.tendenci_whatsapp_connections[0]
      : campanha.tendenci_whatsapp_connections

    if (!whatsappConn || whatsappConn.status !== 'open') {
      console.error('❌ [MAIN] Instância WhatsApp não conectada')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Instância WhatsApp não está conectada. Conecte antes de disparar.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Criar dispatch
    const { data: dispatch, error: dispatchError } = await supabase
      .from('tendenci_campaign_dispatches')
      .insert({
        campanha_id,
        user_id: user.id,
        total_arquitetos: arquiteto_ids.length,
        status: 'em_andamento',
        progresso_percentual: 0,
        enviados_sucesso: 0,
        enviados_erro: 0,
        iniciado_em: new Date().toISOString()
      })
      .select()
      .single()

    if (dispatchError || !dispatch) {
      console.error('❌ [MAIN] Erro ao criar dispatch:', dispatchError)
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

    console.log(`✅ [MAIN] Dispatch criado: ${dispatch.id}`)

    // Enfileirar arquitetos com intervalo de 3 minutos entre cada
    const queueItems = arquiteto_ids.map((arquiteto_id, index) => ({
      dispatch_id: dispatch.id,
      campanha_id,
      arquiteto_id,
      position: index + 1,
      status: 'pendente',
      // Primeiro item: agora. Demais: 3 minutos a partir do anterior
      agendado_para: new Date(Date.now() + (index * 3 * 60 * 1000)).toISOString(),
      tentativas: 0
    }))

    const { error: queueError } = await supabase
      .from('tendenci_campaign_queue')
      .insert(queueItems)

    if (queueError) {
      console.error('❌ [MAIN] Erro ao enfileirar:', queueError)
      
      // Marcar dispatch como erro
      await supabase
        .from('tendenci_campaign_dispatches')
        .update({ 
          status: 'erro',
          erro_mensagem: 'Erro ao enfileirar arquitetos'
        })
        .eq('id', dispatch.id)

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erro ao enfileirar arquitetos'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    console.log(`✅ [MAIN] ${arquiteto_ids.length} arquitetos enfileirados`)

    // Processar primeiro item imediatamente
    const firstResult = await processNextInQueue(supabase)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Campanha iniciada com sucesso',
        dispatch_id: dispatch.id,
        total_arquitetos: arquiteto_ids.length,
        first_processed: firstResult.processed,
        has_more: firstResult.has_more
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 [MAIN] Erro geral:', error)
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
