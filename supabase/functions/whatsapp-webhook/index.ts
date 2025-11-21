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
    console.log('🔔 🔔 🔔 WEBHOOK EVOLUTION API RECEBIDO! 🔔 🔔 🔔')
    console.log('⏰ Timestamp:', new Date().toISOString())
    console.log('📍 Request method:', req.method)
    console.log('📍 Request headers:', JSON.stringify(Object.fromEntries(req.headers)))

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
    console.log('📦 Webhook BODY completo:', JSON.stringify(body, null, 2))

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
        console.log('✅ Connection established! Phone:', phoneNumber)
      } else if (state === 'close' || state === 'disconnected') {
        status = 'disconnected'
        console.log('❌ Connection closed')
      } else if (state === 'connecting') {
        status = 'connecting'
        console.log('⏳ Still connecting...')
      }

      console.log(`📱 Instance ${instance} - state: ${state} -> status: ${status}`)

      // Atualizar no banco
      const updateData: any = {
        status,
        last_sync: new Date().toISOString()
      }

      if (phoneNumber) {
        updateData.phone_number = phoneNumber
        updateData.connected_at = new Date().toISOString()
        console.log('📞 Phone number saved:', phoneNumber)
      }

      if (status === 'disconnected') {
        updateData.phone_number = null
        updateData.qr_code = null
        updateData.qr_code_base64 = null
        console.log('🧹 Cleared connection data')
      }

      const { error: updateError } = await supabase
        .from('tendenci_whatsapp_connections')
        .update(updateData)
        .eq('instance_name', instance)

      if (updateError) {
        console.error('❌ Erro ao atualizar status:', updateError)
        throw updateError
      } else {
        console.log('✅ Status atualizado com sucesso no banco')
      }
    }

    // Processar QR Code
    if (event === 'qrcode.updated' && data?.qrcode) {
      console.log('📱 Atualizando QR Code no banco via webhook')
      
      const { error: qrError } = await supabase
        .from('tendenci_whatsapp_connections')
        .update({
          qr_code_base64: data.qrcode,
          qr_code: data.qrcode,
          status: 'connecting',
          last_sync: new Date().toISOString()
        })
        .eq('instance_name', instance)

      if (qrError) {
        console.error('❌ Erro ao atualizar QR Code:', qrError)
      } else {
        console.log('✅ QR Code atualizado com sucesso')
      }
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
