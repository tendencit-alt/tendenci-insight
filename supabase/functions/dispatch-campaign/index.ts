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

// Função para formatar número de telefone brasileiro com validação robusta
function formatBrazilianPhone(phone: string): { formatted: string | null; error?: string; original: string } {
  const original = phone
  
  // Remove tudo que não é número
  let clean = phone.replace(/\D/g, '')
  
  console.log(`📱 Formatando número - Original: "${original}" → Limpo: "${clean}"`)
  
  // Remove prefixo 55 duplicado do início
  while (clean.startsWith('55') && clean.length > 11) {
    clean = clean.substring(2)
    console.log(`🔄 Removendo 55 duplicado: "${clean}"`)
  }
  
  // Validação: número muito curto (falta DDD)
  if (clean.length < 10) {
    return { 
      formatted: null, 
      error: `Número muito curto - falta DDD (${clean.length} dígitos)`,
      original 
    }
  }
  
  // Se tem 10 dígitos (DDD + 8 dígitos formato antigo), adiciona o 9
  if (clean.length === 10) {
    clean = clean.slice(0, 2) + '9' + clean.slice(2)
    console.log(`✨ Adicionado 9° dígito (10→11): "${clean}"`)
  }
  
  // Se tem 12 dígitos (55 + DDD + 8), adiciona o 9
  if (clean.length === 12 && clean.startsWith('55')) {
    clean = clean.slice(0, 4) + '9' + clean.slice(4)
    console.log(`✨ Adicionado 9° dígito (12→13): "${clean}"`)
  }
  
  // Garante que começa com 55
  if (!clean.startsWith('55')) {
    clean = '55' + clean
    console.log(`🌍 Adicionado código do país: "${clean}"`)
  }
  
  // Validação final: deve ter 13 dígitos (55 + DDD + 9 + 8)
  if (clean.length !== 13) {
    return { 
      formatted: null, 
      error: `Número com tamanho inválido: ${clean.length} dígitos (esperado 13)`,
      original 
    }
  }
  
  // Retorna apenas o número limpo (Evolution API adiciona o sufixo automaticamente)
  const formatted = clean
  console.log(`✅ Número formatado com sucesso: "${formatted}" (sem sufixo JID)`)
  
  return { formatted, original }
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
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          error: 'Evolution API não está configurada'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
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
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          error: 'Dados obrigatórios faltando',
          details: { instance_name, telefone: !!telefone, tipo_envio }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Verificar se instância está conectada
    const { data: connection } = await supabase
      .from('tendenci_whatsapp_connections')
      .select('status')
      .eq('instance_name', instance_name)
      .single()

    if (!connection) {
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          error: `Instância "${instance_name}" não encontrada`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    if (connection.status !== 'connected') {
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          error: `Instância "${instance_name}" não está conectada`,
          details: { status: connection.status }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Formatar e validar número
    const phoneResult = formatBrazilianPhone(telefone)
    
    if (!phoneResult.formatted) {
      console.error(`❌ Número inválido para ${nome}:`, phoneResult.error)
      
      // Adicionar tag de erro ao arquiteto
      await supabase
        .from('architects')
        .update({ tag_prospeccao: 'erro_disparo' })
        .eq('id', arquiteto_id)
      
      // Registrar erro de formatação
      await supabase
        .from('tendenci_prospec_arq_logs')
        .insert({
          architect_id: arquiteto_id,
          campanha_id: campanha_id,
          tipo: 'erro_formatacao',
          canal: 'whatsapp',
          mensagem: `Número inválido: ${phoneResult.error}`,
          metadata: {
            original_phone: phoneResult.original,
            error: phoneResult.error
          }
        })
      
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          error: `Número inválido: ${phoneResult.error}`,
          details: { original: phoneResult.original }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    const formattedNumber = phoneResult.formatted
    console.log(`📱 Verificando número de ${nome} (${formattedNumber}) via ${instance_name}`)

    // FASE 1: Verificar se número existe no WhatsApp ANTES de enviar
    try {
      const checkResponse = await fetch(`${evolutionUrl}/chat/whatsappNumbers/${instance_name}`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numbers: [formattedNumber]
        })
      })

      if (checkResponse.ok) {
        const checkResult = await checkResponse.json()
        console.log(`🔍 Verificação WhatsApp:`, JSON.stringify(checkResult))
        
        // Se retornou array e o primeiro elemento tem exists: false
        if (Array.isArray(checkResult) && checkResult.length > 0 && checkResult[0]?.exists === false) {
          console.error(`❌ Número ${formattedNumber} não está registrado no WhatsApp`)
          
          // Marcar arquiteto com whatsapp_valido = false e tag de erro
          await supabase
            .from('architects')
            .update({ 
              whatsapp_valido: false,
              tag_prospeccao: 'erro_disparo'
            })
            .eq('id', arquiteto_id)
          
          // Registrar erro específico
          await supabase
            .from('tendenci_prospec_arq_logs')
            .insert({
              architect_id: arquiteto_id,
              campanha_id: campanha_id,
              tipo: 'numero_inexistente',
              canal: 'whatsapp',
              mensagem: `Número não registrado no WhatsApp`,
              metadata: {
                original_phone: phoneResult.original,
                formatted_phone: formattedNumber,
                evolution_check: checkResult[0]
              }
            })
          
          // Registrar na campaign_architects
          await supabase
            .from('tendenci_prospec_arq_campaign_architects')
            .upsert({
              campanha_id,
              architect_id: arquiteto_id,
              status: 'erro',
              data_envio: new Date().toISOString(),
              metadata: { 
                error: 'Número não registrado no WhatsApp',
                tipo_erro: 'numero_inexistente'
              }
            })
          
          return new Response(
            JSON.stringify({ 
              status: 'failed',
              error: 'Número não registrado no WhatsApp',
              error_type: 'numero_inexistente',
              details: { phone: formattedNumber, exists: false }
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )
        }
        
        console.log(`✅ Número ${formattedNumber} verificado - existe no WhatsApp`)
      } else {
        console.warn(`⚠️ Não foi possível verificar número (${checkResponse.status}) - continuando com envio`)
      }
    } catch (checkError) {
      console.warn(`⚠️ Erro ao verificar número:`, checkError, `- continuando com envio`)
    }

    console.log(`📱 Enviando mensagem para ${nome} (${formattedNumber}) via ${instance_name}`)

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
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          error: 'Tipo de envio inválido ou conteúdo faltando',
          details: { tipo_envio, has_texto: !!conteudo_texto, has_imagem: !!conteudo_imagem_url, has_audio: !!conteudo_audio_url }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text()
      console.error('❌ Erro Evolution API:', errorText)
      
      // Detectar se é erro de número inexistente no body do erro
      let tipoErro = 'erro_envio'
      let errorParsed: any = null
      let isNumeroInexistente = false
      
      try {
        errorParsed = JSON.parse(errorText)
        
        // CORREÇÃO: Verificar estrutura REAL da Evolution API
        // Formato: {"status":400,"error":"Bad Request","response":{"message":[{"jid":"...","exists":false,"number":"..."}]}}
        const messageArray = errorParsed?.response?.message
        if (Array.isArray(messageArray) && messageArray.length > 0) {
          if (messageArray[0]?.exists === false) {
            isNumeroInexistente = true
            console.log(`📵 Número ${formattedNumber} identificado como inexistente via response.message[0].exists === false`)
          }
        }
        
        // Fallback: verificar outras estruturas possíveis
        if (!isNumeroInexistente && errorParsed?.exists === false) {
          isNumeroInexistente = true
          console.log(`📵 Número ${formattedNumber} identificado como inexistente via exists === false`)
        }
        
        // Fallback: verificar texto bruto
        if (!isNumeroInexistente && (
          errorText.includes('"exists":false') || 
          errorText.includes('"exists": false') ||
          errorText.includes('not registered') ||
          errorText.includes('não registrado')
        )) {
          isNumeroInexistente = true
          console.log(`📵 Número ${formattedNumber} identificado como inexistente via texto`)
        }
        
      } catch (e) {
        // errorText não é JSON válido, verificar texto bruto
        if (errorText.includes('"exists":false') || 
            errorText.includes('not registered') ||
            errorText.includes('não registrado')) {
          isNumeroInexistente = true
        }
      }
      
      if (isNumeroInexistente) {
        tipoErro = 'numero_inexistente'
        
        // Marcar arquiteto IMEDIATAMENTE como whatsapp_valido = false e adicionar tag de erro
        const { error: updateError } = await supabase
          .from('architects')
          .update({ 
            whatsapp_valido: false,
            tag_prospeccao: 'erro_disparo'
          })
          .eq('id', arquiteto_id)
          
        if (updateError) {
          console.error('❌ Erro ao marcar whatsapp_valido = false:', updateError)
        } else {
          console.log(`✅ Arquiteto ${arquiteto_id} marcado como whatsapp_valido = false e tag_prospeccao = erro_disparo`)
        }
      } else {
        // Outros tipos de erro também recebem tag
        const { error: tagError } = await supabase
          .from('architects')
          .update({ tag_prospeccao: 'erro_disparo' })
          .eq('id', arquiteto_id)
          
        if (tagError) {
          console.error('❌ Erro ao adicionar tag_prospeccao:', tagError)
        } else {
          console.log(`✅ Arquiteto ${arquiteto_id} marcado com tag_prospeccao = erro_disparo`)
        }
      }
      
      // Registrar erro com tipo correto
      await supabase
        .from('tendenci_prospec_arq_logs')
        .insert({
          architect_id: arquiteto_id,
          campanha_id: campanha_id,
          tipo: tipoErro,
          canal: 'whatsapp',
          mensagem: tipoErro === 'numero_inexistente' 
            ? 'Número não registrado no WhatsApp' 
            : `Erro ao enviar: ${errorText}`,
          metadata: {
            instance_name,
            phone_number: formattedNumber,
            tipo_envio,
            error_response: errorText,
            error_parsed: errorParsed
          }
        })
      
      // Registrar falha na campanha com tipo correto
      await supabase
        .from('tendenci_prospec_arq_campaign_architects')
        .upsert({
          campanha_id,
          architect_id: arquiteto_id,
          status: 'erro',
          data_envio: new Date().toISOString(),
          metadata: { 
            error: errorText,
            tipo_erro: tipoErro
          }
        })
      
      // Retornar SUCESSO com status de erro (não bloqueia campanha)
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          error: tipoErro === 'numero_inexistente' 
            ? 'Número não registrado no WhatsApp'
            : `Evolution API error: ${evolutionResponse.status}`,
          error_type: tipoErro,
          details: errorText
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Status 200 para não bloquear a campanha
        }
      )
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

    // Registrar log
    await supabase
      .from('tendenci_prospec_arq_logs')
      .insert({
        architect_id: arquiteto_id,
        campanha_id: campanha_id,
        tipo: 'mensagem_enviada',
        canal: 'whatsapp',
        mensagem: conteudo_texto || 'Mídia enviada',
        enviado_por: userId,
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

    // Atualizar dados do arquiteto após envio bem-sucedido
    // IMPORTANTE: Mover para 'adicionar_epata' (Contato Feito por I.A), NÃO 'contato_iniciado'
    // O vendedor move manualmente para 'contato_iniciado' quando o arquiteto responde
    const updateData: any = {
      status_funil: 'adicionar_epata',
      tag_prospeccao: 'contactado',
      whatsapp_valido: true,
      data_ultimo_contato: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Se não há data_primeiro_contato, adicionar agora
    const { data: currentArchitect } = await supabase
      .from('architects')
      .select('data_primeiro_contato')
      .eq('id', arquiteto_id)
      .single()

    if (!currentArchitect?.data_primeiro_contato) {
      updateData.data_primeiro_contato = new Date().toISOString()
      console.log('📝 Definindo data_primeiro_contato para arquiteto:', arquiteto_id)
    }

    // Se conseguimos identificar o usuário, atualizar vendedor_responsavel
    if (userId) {
      updateData.vendedor_responsavel = userId
    }

    console.log('📝 Atualizando arquiteto com dados:', {
      arquiteto_id,
      updateData: {
        ...updateData,
        data_primeiro_contato: updateData.data_primeiro_contato ? 'SET' : 'NOT SET',
        data_ultimo_contato: 'SET',
      }
    })

    const { error: updateError } = await supabase
      .from('architects')
      .update(updateData)
      .eq('id', arquiteto_id)

    if (updateError) {
      console.error('❌ ERRO CRÍTICO ao atualizar arquiteto:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        arquiteto_id
      })
    } else {
      console.log('✅ Arquiteto atualizado com sucesso:', {
        arquiteto_id,
        status_funil: 'contato_feito_ia',
        tag_prospeccao: 'contactado',
        vendedor: userId || 'não identificado',
        data_primeiro_contato_set: !!updateData.data_primeiro_contato
      })
    }

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
    console.error('💥 Erro inesperado ao disparar campanha:', error)
    
    // SEMPRE retornar status 200 mesmo em erro crítico
    return new Response(
      JSON.stringify({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: 'Erro crítico não tratado'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Status 200 para não bloquear a campanha
      }
    )
  }
})
