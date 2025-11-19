import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
  instanceName: string
  phoneNumber: string
  message: string
  campaignId?: string
  architectId?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📤 WhatsApp send message request')

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

    const body: SendMessageRequest = await req.json()
    console.log('📋 Send message data:', JSON.stringify(body, null, 2))

    const { instanceName, phoneNumber, message, campaignId, architectId } = body

    if (!instanceName || !phoneNumber || !message) {
      throw new Error('instanceName, phoneNumber e message são obrigatórios')
    }

    // Verificar se instância está conectada
    const { data: connection } = await supabase
      .from('tendenci_whatsapp_connections')
      .select('status')
      .eq('instance_name', instanceName)
      .single()

    if (!connection) {
      throw new Error('Instância não encontrada')
    }

    if (connection.status !== 'connected') {
      throw new Error('Instância não está conectada')
    }

    // Formatar número (adicionar código do país se necessário)
    let formattedNumber = phoneNumber
    
    // Remover @s.whatsapp.net temporariamente se presente
    let cleanNumber = phoneNumber.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    
    // Se o número não começa com código do país (menos de 12 dígitos), adicionar 55 (Brasil)
    if (cleanNumber.length < 12) {
      cleanNumber = `55${cleanNumber}`
      console.log(`📞 Código do país adicionado: ${cleanNumber}`)
    }
    
    // Adicionar sufixo WhatsApp
    formattedNumber = `${cleanNumber}@s.whatsapp.net`

    console.log(`📱 Enviando mensagem para ${formattedNumber} via ${instanceName}`)

    // Enviar mensagem via Evolution API
    const sendResponse = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: message,
        delay: 1000
      })
    })

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text()
      console.error('❌ Erro ao enviar mensagem:', errorText)
      throw new Error('Erro ao enviar mensagem via Evolution API')
    }

    const responseData = await sendResponse.json()
    console.log('✅ Mensagem enviada:', responseData)

    // Registrar log
    if (architectId) {
      await supabase
        .from('tendenci_prospec_arq_logs')
        .insert({
          architect_id: architectId,
          campanha_id: campaignId || null,
          tipo: 'mensagem_enviada',
          canal: 'whatsapp',
          mensagem: message,
          metadata: {
            instance_name: instanceName,
            phone_number: phoneNumber,
            response: responseData
          }
        })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        messageId: responseData.key?.id || null,
        data: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Erro ao enviar mensagem:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
