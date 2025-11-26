import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExecuteCampaignRequest {
  campanha_id: string
  arquiteto_ids: string[]
}

// Função auxiliar para delay com cancelamento
async function delayWithCancel(seconds: number, dispatchId: string, supabase: any): Promise<boolean> {
  const startTime = Date.now()
  const endTime = startTime + (seconds * 1000)
  
  while (Date.now() < endTime) {
    // Verificar cancelamento a cada 5 segundos
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    const { data } = await supabase
      .from('tendenci_campaign_dispatches')
      .select('status')
      .eq('id', dispatchId)
      .single()
    
    if (data?.status === 'cancelado') {
      console.log(`🛑 Dispatch ${dispatchId} foi cancelado`)
      return true // Foi cancelado
    }
  }
  
  return false // Não foi cancelado
}

// Função principal de processamento em background
async function processarCampanha(
  dispatchId: string,
  campanhaId: string,
  arquitetoIds: string[],
  supabase: any,
  evolutionUrl: string,
  evolutionApiKey: string,
  authToken: string,
  startIndex: number = 0 // Índice inicial para processamento em lotes
) {
  const BATCH_SIZE = 4 // Processar 4 arquitetos por vez (4 × 3min = 12min, dentro do limite)
  const endIndex = Math.min(startIndex + BATCH_SIZE, arquitetoIds.length)
  const isLastBatch = endIndex >= arquitetoIds.length
  
  console.log(`🚀 [Background] Processando lote [${startIndex + 1}-${endIndex}] de ${arquitetoIds.length} arquitetos`)
  
  try {
    // Marcar como em andamento (apenas no primeiro lote)
    if (startIndex === 0) {
      await supabase
        .from('tendenci_campaign_dispatches')
        .update({ 
          status: 'em_andamento',
          iniciado_em: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', dispatchId)
    }

    // Buscar dados da campanha
    const { data: campanha } = await supabase
      .from('tendenci_prospec_arq_campaigns')
      .select('*, tendenci_whatsapp_connections(instance_name, instance_id)')
      .eq('id', campanhaId)
      .single()

    if (!campanha) {
      throw new Error('Campanha não encontrada')
    }

    const instanceName = campanha.tendenci_whatsapp_connections?.instance_name
    const instanceId = campanha.tendenci_whatsapp_connections?.instance_id

    if (!instanceName) {
      throw new Error('Instância WhatsApp não encontrada')
    }

    // Buscar arquitetos do lote atual
    const batchArquitetoIds = arquitetoIds.slice(startIndex, endIndex)
    const { data: arquitetos } = await supabase
      .from('architects')
      .select('id, name, phone')
      .in('id', batchArquitetoIds)

    if (!arquitetos || arquitetos.length === 0) {
      throw new Error('Nenhum arquiteto encontrado no lote')
    }

    // Buscar contadores atuais do dispatch
    const { data: currentDispatch } = await supabase
      .from('tendenci_campaign_dispatches')
      .select('enviados_sucesso, enviados_erro')
      .eq('id', dispatchId)
      .single()

    let sucessoCount = currentDispatch?.enviados_sucesso || 0
    let erroCount = currentDispatch?.enviados_erro || 0

    // Loop por cada arquiteto com delay de 3 minutos
    for (let i = 0; i < arquitetos.length; i++) {
      const arquiteto = arquitetos[i]
      const globalIndex = startIndex + i // Índice global na lista completa
      
      // Verificar cancelamento antes de cada envio
      const { data: currentDispatch } = await supabase
        .from('tendenci_campaign_dispatches')
        .select('status')
        .eq('id', dispatchId)
        .single()
      
      if (currentDispatch?.status === 'cancelado') {
        console.log(`🛑 Dispatch cancelado no arquiteto ${globalIndex + 1}/${arquitetoIds.length}`)
        break
      }

      console.log(`📤 [${globalIndex + 1}/${arquitetoIds.length}] Enviando para ${arquiteto.name}...`)
      const startTime = Date.now()

      // Atualizar progresso ANTES do envio
      const progresso = Math.round(((globalIndex + 1) / arquitetoIds.length) * 100)
      await supabase
        .from('tendenci_campaign_dispatches')
        .update({
          arquiteto_atual: arquiteto.name,
          progresso_percentual: progresso,
          updated_at: new Date().toISOString()
        })
        .eq('id', dispatchId)

      // Chamar função de dispatch individual
      try {
        const dispatchResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/dispatch-campaign`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
              'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
            },
            body: JSON.stringify({
              campanha_id: campanhaId,
              arquiteto_id: arquiteto.id,
              nome: arquiteto.name,
              telefone: arquiteto.phone,
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
        const tempoEnvioSegundos = Math.round((endTime - startTime) / 1000)
        
        if (result.status === 'success') {
          sucessoCount++
          console.log(`✅ Enviado com sucesso para ${arquiteto.name} (${tempoEnvioSegundos}s)`)
          
          // Atualizar contadores em tempo real no banco
          await supabase
            .from('tendenci_campaign_dispatches')
            .update({
              enviados_sucesso: sucessoCount,
              enviados_erro: erroCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', dispatchId)
        } else {
          erroCount++
          console.error(`❌ Erro ao enviar para ${arquiteto.name}:`, result.error)
          
          // Atualizar contadores em tempo real no banco
          await supabase
            .from('tendenci_campaign_dispatches')
            .update({
              enviados_sucesso: sucessoCount,
              enviados_erro: erroCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', dispatchId)
        }
      } catch (err) {
        erroCount++
        const endTime = Date.now()
        const tempoEnvioSegundos = Math.round((endTime - startTime) / 1000)
        console.error(`💥 Exceção ao enviar para ${arquiteto.name} após ${tempoEnvioSegundos}s:`, err)
        
        // Atualizar contadores em tempo real no banco
        await supabase
          .from('tendenci_campaign_dispatches')
          .update({
            enviados_sucesso: sucessoCount,
            enviados_erro: erroCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', dispatchId)
      }

      // Delay de 3 minutos antes do próximo (exceto no último do lote)
      if (i < arquitetos.length - 1) {
        console.log(`⏳ Aguardando 3 minutos antes do próximo envio...`)
        const foiCancelado = await delayWithCancel(180, dispatchId, supabase)
        if (foiCancelado) {
          console.log(`🛑 Dispatch cancelado durante delay`)
          await supabase
            .from('tendenci_campaign_dispatches')
            .update({
              status: 'cancelado',
              enviados_sucesso: sucessoCount,
              enviados_erro: erroCount,
              progresso_percentual: progresso,
              concluido_em: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', dispatchId)
          return
        }
      }
    }

    // Se ainda há mais arquitetos para processar, reinvocar para próximo lote
    if (!isLastBatch) {
      console.log(`🔄 Lote concluído. Iniciando próximo lote...`)
      
      // Aguardar 3 minutos antes de iniciar próximo lote
      const foiCancelado = await delayWithCancel(180, dispatchId, supabase)
      if (foiCancelado) {
        console.log(`🛑 Dispatch cancelado antes do próximo lote`)
        await supabase
          .from('tendenci_campaign_dispatches')
          .update({
            status: 'cancelado',
            enviados_sucesso: sucessoCount,
            enviados_erro: erroCount,
            progresso_percentual: Math.round((endIndex / arquitetoIds.length) * 100),
            concluido_em: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', dispatchId)
        return
      }
      
      // Reinvocar função recursivamente para próximo lote
      await processarCampanha(
        dispatchId,
        campanhaId,
        arquitetoIds,
        supabase,
        evolutionUrl,
        evolutionApiKey,
        authToken,
        endIndex // Próximo índice inicial
      )
      return
    }

    // Marcar como concluído (apenas no último lote)
    await supabase
      .from('tendenci_campaign_dispatches')
      .update({
        status: 'concluido',
        enviados_sucesso: sucessoCount,
        enviados_erro: erroCount,
        progresso_percentual: 100,
        concluido_em: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', dispatchId)

    // Atualizar status da campanha
    await supabase
      .from('tendenci_prospec_arq_campaigns')
      .update({ status: 'enviado' })
      .eq('id', campanhaId)

    console.log(`✅ [Background] Campanha concluída: ${sucessoCount} sucesso, ${erroCount} erros`)
    
  } catch (error) {
    console.error('💥 [Background] Erro ao processar campanha:', error)
    
    await supabase
      .from('tendenci_campaign_dispatches')
      .update({
        status: 'erro',
        erro_mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
        concluido_em: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', dispatchId)
  }
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

    const body: ExecuteCampaignRequest = await req.json()
    const { campanha_id, arquiteto_ids } = body

    console.log(`📋 Campanha ${campanha_id} com ${arquiteto_ids.length} arquitetos`)

    // Criar registro de dispatch
    const { data: dispatch, error: dispatchError } = await supabase
      .from('tendenci_campaign_dispatches')
      .insert({
        campanha_id,
        user_id: user.id,
        status: 'pendente',
        total_arquitetos: arquiteto_ids.length,
        enviados_sucesso: 0,
        enviados_erro: 0,
        progresso_percentual: 0
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

    // Executar processamento em background usando waitUntil
    // @ts-ignore - EdgeRuntime é global no Deno Deploy
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(
        processarCampanha(
          dispatch.id,
          campanha_id,
          arquiteto_ids,
          supabase,
          evolutionUrl,
          evolutionApiKey,
          token
        )
      )
    } else {
      // Fallback: executar sem waitUntil (desenvolvimento local)
      processarCampanha(
        dispatch.id,
        campanha_id,
        arquiteto_ids,
        supabase,
        evolutionUrl,
        evolutionApiKey,
        token
      ).catch(err => console.error('Erro no processamento:', err))
    }

    // Retornar imediatamente com ID do dispatch
    return new Response(
      JSON.stringify({ 
        success: true,
        dispatch_id: dispatch.id,
        message: `Campanha iniciada! Processando ${arquiteto_ids.length} arquitetos em background.`
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
