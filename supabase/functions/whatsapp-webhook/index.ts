import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EvolutionWebhook {
  event: string
  instance: string
  data?: {
    state?: string
    remoteJid?: string
    [key: string]: any
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔔 Evolution API webhook received')

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

    const body: EvolutionWebhook = await req.json()
    console.log('📋 Webhook data:', JSON.stringify(body, null, 2))

    const { event, instance, data } = body

    // Processar evento de conexão
    if (event === 'connection.update' || event === 'qrcode.updated') {
      const state = data?.state || 'unknown'
      
      let status = 'connecting'
      let phoneNumber = null

      // Mapear estados da Evolution API para nosso status
      if (state === 'open' || state === 'connected') {
        status = 'connected'
        phoneNumber = data?.remoteJid?.split('@')[0] || null
      } else if (state === 'close' || state === 'disconnected') {
        status = 'disconnected'
      } else if (state === 'connecting') {
        status = 'connecting'
      }

      console.log(`📱 Instance ${instance} status: ${status}`)

      // Atualizar no banco
      const updateData: any = {
        status,
        last_sync: new Date().toISOString()
      }

      if (phoneNumber) {
        updateData.phone_number = phoneNumber
        updateData.connected_at = new Date().toISOString()
      }

      if (status === 'disconnected') {
        updateData.phone_number = null
        updateData.qr_code = null
        updateData.qr_code_base64 = null
      }

      const { error } = await supabase
        .from('tendenci_whatsapp_connections')
        .update(updateData)
        .eq('instance_name', instance)

      if (error) {
        console.error('❌ Erro ao atualizar status:', error)
      } else {
        console.log('✅ Status atualizado com sucesso')
      }
    }

    // Processar QR Code
    if (event === 'qrcode.updated' && data?.qrcode) {
      console.log('📱 Atualizando QR Code')
      
      await supabase
        .from('tendenci_whatsapp_connections')
        .update({
          qr_code_base64: data.qrcode,
          qr_code: data.qrcode
        })
        .eq('instance_name', instance)
    }

    // Log do evento
    console.log('✅ Webhook processado:', event)

    return new Response(
      JSON.stringify({ success: true, event, instance }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Erro ao processar webhook:', error)
    
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
