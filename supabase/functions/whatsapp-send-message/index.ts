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
  
  const formatted = `${clean}@s.whatsapp.net`
  console.log(`✅ Número formatado com sucesso: "${formatted}"`)
  
  return { formatted, original }
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

    // Formatar e validar número
    const phoneResult = formatBrazilianPhone(phoneNumber)
    
    if (!phoneResult.formatted) {
      console.error(`❌ Número inválido:`, phoneResult.error)
      throw new Error(`Número inválido: ${phoneResult.error}`)
    }
    
    const formattedNumber = phoneResult.formatted
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
