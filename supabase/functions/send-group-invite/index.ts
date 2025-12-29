import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GROUP_LINK = 'https://chat.whatsapp.com/BOd6s8iYWHn6G1EdF3x7lx'

interface SendGroupInviteRequest {
  deal_id: string
  client_name: string
  client_phone: string
  owner_id: string | null
}

/**
 * Busca instância WhatsApp ativa do vendedor ou fallback global
 */
async function getWhatsAppInstance(supabase: any, ownerId: string | null): Promise<{ instanceName: string; apiUrl: string; apiKey: string } | null> {
  // Tentar buscar instância do vendedor
  if (ownerId) {
    const { data: vendorConnection } = await supabase
      .from('tendenci_whatsapp_connections')
      .select('instance_name, api_url, api_key')
      .eq('vendedor_id', ownerId)
      .eq('status', 'connected')
      .limit(1)
      .single()
    
    if (vendorConnection) {
      return {
        instanceName: vendorConnection.instance_name,
        apiUrl: vendorConnection.api_url,
        apiKey: vendorConnection.api_key
      }
    }
  }

  // Fallback: buscar qualquer instância ativa
  const { data: anyConnection } = await supabase
    .from('tendenci_whatsapp_connections')
    .select('instance_name, api_url, api_key')
    .eq('status', 'connected')
    .limit(1)
    .single()

  if (anyConnection) {
    return {
      instanceName: anyConnection.instance_name,
      apiUrl: anyConnection.api_url,
      apiKey: anyConnection.api_key
    }
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('📨 [send-group-invite] Iniciando envio...')

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body: SendGroupInviteRequest = await req.json()
    const { deal_id, client_name, client_phone, owner_id } = body

    if (!deal_id || !client_phone) {
      throw new Error('deal_id e client_phone são obrigatórios')
    }

    console.log(`📱 Deal: ${deal_id}, Cliente: ${client_name}, Telefone: ${client_phone}`)

    // Buscar instância WhatsApp
    const whatsappInstance = await getWhatsAppInstance(supabase, owner_id)
    
    if (!whatsappInstance) {
      throw new Error('Nenhuma instância WhatsApp disponível')
    }

    console.log(`📡 Usando instância: ${whatsappInstance.instanceName}`)

    // Montar mensagem
    const firstName = client_name.split(' ')[0]
    const message = `Olá, ${firstName}! 👋

Temos um grupo exclusivo no WhatsApp com ofertas especiais e novidades. Participe:

${GROUP_LINK}

Até lá! 🎉`

    // Formatar número para Evolution API
    const formattedNumber = `55${client_phone}@s.whatsapp.net`

    // Enviar mensagem via Evolution API
    const sendUrl = `${whatsappInstance.apiUrl}/message/sendText/${whatsappInstance.instanceName}`
    
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': whatsappInstance.apiKey
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: message
      })
    })

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text()
      console.error('❌ Erro Evolution API:', errorText)
      throw new Error(`Falha ao enviar mensagem: ${sendResponse.status}`)
    }

    const sendResult = await sendResponse.json()
    console.log('✅ Mensagem enviada:', sendResult)

    // Atualizar deal: marcar convite como enviado
    const { error: updateError } = await supabase
      .from('crm_deals')
      .update({
        group_invite_sent: true,
        group_invite_sent_at: new Date().toISOString()
      })
      .eq('id', deal_id)

    if (updateError) {
      console.error('⚠️ Erro ao atualizar deal:', updateError)
    } else {
      console.log('✅ Deal atualizado: group_invite_sent = true')
    }

    // Registrar na timeline do deal
    const { error: timelineError } = await supabase
      .from('crm_timeline')
      .insert({
        deal_id,
        message: `📣 Convite automático enviado para grupo de ofertas: ${GROUP_LINK}`,
        update_type: 'Sistema - Convite Grupo'
      })

    if (timelineError) {
      console.error('⚠️ Erro ao registrar timeline:', timelineError)
    } else {
      console.log('✅ Timeline registrada')
    }

    const elapsed = Date.now() - startTime
    console.log(`🏁 [send-group-invite] Concluído em ${elapsed}ms`)

    return new Response(
      JSON.stringify({
        success: true,
        deal_id,
        message_sent: true,
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
