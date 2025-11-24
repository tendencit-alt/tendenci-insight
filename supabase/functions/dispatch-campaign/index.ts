import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DispatchRequest {
  campanha_id: string
  arquiteto_id: string
  nome: string
  telefone: string
  tipo_envio: string
  conteudo_texto?: string
  conteudo_imagem_url?: string
  conteudo_audio_url?: string
  instance_name: string
  instance_id: string
  whatsapp_connection_id: string
  webhook_n8n?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Dispatch campaign request')

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
      throw new Error('Evolution API não está configurada')
    }

    const body: DispatchRequest = await req.json()
    console.log('📋 Dispatch data:', JSON.stringify({
      ...body,
      telefone: body.telefone?.substring(0, 4) + '****' // Mascarar telefone nos logs
    }, null, 2))

    const { 
      campanha_id,
      arquiteto_id, 
      nome, 
      telefone, 
      tipo_envio,
      conteudo_texto,
      conteudo_imagem_url,
      conteudo_audio_url,
      instance_name, 
      instance_id,
      whatsapp_connection_id,
      webhook_n8n
    } = body

    // Validações
    if (!instance_name || !telefone || !tipo_envio) {
      throw new Error('Dados obrigatórios faltando')
    }

    // Verificar se instância está conectada
    const { data: connection } = await supabase
      .from('tendenci_whatsapp_connections')
      .select('status')
      .eq('instance_name', instance_name)
      .single()

    if (!connection) {
      throw new Error(`Instância "${instance_name}" não encontrada`)
    }

    if (connection.status !== 'connected') {
      throw new Error(`Instância "${instance_name}" não está conectada`)
    }

    // Formatar número (limpar e adicionar código do país se necessário)
    let cleanNumber = telefone.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    
    // Remover TODOS os "55" do início primeiro
    while (cleanNumber.startsWith('55')) {
      cleanNumber = cleanNumber.substring(2)
    }
    
    // Agora adicionar apenas UM "55" no início
    cleanNumber = `55${cleanNumber}`
    
    const formattedNumber = `${cleanNumber}@s.whatsapp.net`

    console.log(`📱 Enviando para ${nome} (${formattedNumber}) via ${instance_name}`)

    let evolutionResponse

    // Enviar mensagem baseado no tipo
    if (tipo_envio === 'texto' && conteudo_texto) {
      evolutionResponse = await fetch(`${evolutionUrl}/message/sendText/${instance_name}`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: formattedNumber,
          text: conteudo_texto,
          delay: 1000
        })
      })
    } else if (tipo_envio === 'imagem' && conteudo_imagem_url) {
      evolutionResponse = await fetch(`${evolutionUrl}/message/sendMedia/${instance_name}`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: formattedNumber,
          mediatype: 'image',
          media: conteudo_imagem_url,
          caption: conteudo_texto || '',
          delay: 1000
        })
      })
    } else if (tipo_envio === 'audio' && conteudo_audio_url) {
      evolutionResponse = await fetch(`${evolutionUrl}/message/sendMedia/${instance_name}`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: formattedNumber,
          mediatype: 'audio',
          media: conteudo_audio_url,
          delay: 1000
        })
      })
    } else {
      throw new Error('Tipo de envio inválido ou conteúdo faltando')
    }

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text()
      console.error('❌ Erro Evolution API:', errorText)
      
      // Registrar erro mas não falhar completamente
      await supabase
        .from('tendenci_prospec_arq_logs')
        .insert({
          architect_id: arquiteto_id,
          campanha_id: campanha_id,
          tipo: 'erro_envio',
          canal: 'whatsapp',
          mensagem: `Erro ao enviar: ${errorText}`,
          metadata: {
            instance_name,
            phone_number: formattedNumber,
            tipo_envio,
            error_response: errorText
          }
        })
      
      throw new Error(`Evolution API error: ${evolutionResponse.status} - ${errorText}`)
    }

    const evolutionData = await evolutionResponse.json()
    console.log('✅ Mensagem enviada pela Evolution API')

    // Se houver webhook N8N configurado, enviar notificação
    if (webhook_n8n) {
      try {
        console.log('📡 Notificando N8N:', webhook_n8n)
        const n8nResponse = await fetch(webhook_n8n, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'message_sent',
            campanha_id,
            arquiteto_id,
            nome,
            telefone: formattedNumber,
            tipo_envio,
            instance_name,
            instance_id,
            whatsapp_connection_id,
            timestamp: new Date().toISOString(),
            evolution_response: evolutionData
          })
        })
        
        if (n8nResponse.ok) {
          console.log('✅ N8N notificado com sucesso')
        } else {
          console.warn('⚠️ N8N retornou:', n8nResponse.status)
        }
      } catch (n8nError) {
        console.warn('⚠️ Erro ao notificar N8N (continuando):', n8nError)
      }
    }

    // Registrar log
    await supabase
      .from('tendenci_prospec_arq_logs')
      .insert({
        architect_id: arquiteto_id,
        campanha_id: campanha_id,
        tipo: 'mensagem_enviada',
        canal: 'whatsapp',
        mensagem: conteudo_texto || 'Mídia enviada',
        metadata: {
          instance_name,
          phone_number: formattedNumber,
          tipo_envio,
          evolution_response: evolutionData
        }
      })

    // Registrar no relacionamento campanha-arquiteto
    await supabase
      .from('tendenci_prospec_arq_campaign_architects')
      .upsert({
        campanha_id,
        architect_id: arquiteto_id,
        status: 'enviado',
        data_envio: new Date().toISOString(),
      })

    // Obter informações do usuário que disparou
    const authHeader = req.headers.get('Authorization')
    let userId = null
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        userId = user?.id
      } catch (e) {
        console.warn('⚠️ Não foi possível obter usuário:', e)
      }
    }

    // Atualizar dados do arquiteto após envio bem-sucedido
    const updateData: any = {
      status_funil: 'contato_feito_ia',
      tag_prospeccao: 'contactado',
      data_ultimo_contato: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Se conseguimos identificar o usuário, atualizar vendedor_responsavel
    if (userId) {
      updateData.vendedor_responsavel = userId
    }

    await supabase
      .from('architects')
      .update(updateData)
      .eq('id', arquiteto_id)

    console.log('✅ Arquiteto atualizado:', {
      arquiteto_id,
      status_funil: 'contato_feito_ia',
      tag_prospeccao: 'contactado',
      vendedor: userId || 'não identificado'
    })

    return new Response(
      JSON.stringify({ 
        status: 'success',
        messageId: evolutionData.key?.id || null,
        data: evolutionData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Erro ao disparar campanha:', error)
    
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
