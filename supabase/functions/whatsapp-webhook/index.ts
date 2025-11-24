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

    // 🔥 PROCESSAR EVENTOS DE CONEXÃO (RECONEXÃO AUTOMÁTICA)
    const connectionEvents = [
      'connection.update', 
      'qrcode.updated', 
      'open',
      'messages.upsert',
      'connection.open'
    ]
    
    if (connectionEvents.includes(event)) {
      const state = data?.state || event
      let status = 'connecting'
      let phoneNumber = null

      console.log(`🔍 Processando evento: ${event}, state: ${state}`)

      // 🎯 Mapear TODOS os estados possíveis da Evolution API
      if (
        state === 'open' || 
        state === 'connected' || 
        event === 'connection.open' ||
        event === 'messages.upsert' // Se recebeu mensagem, está conectado!
      ) {
        status = 'connected'
        phoneNumber = data?.remoteJid?.split('@')[0] || 
                     data?.key?.remoteJid?.split('@')[0] ||
                     data?.phoneNumber || null
        console.log('✅ Connection established! Phone:', phoneNumber)
      } else if (state === 'close' || state === 'disconnected' || state === 'logout') {
        status = 'disconnected'
        console.log('❌ Connection closed')
      } else if (state === 'connecting' || event === 'qrcode.updated') {
        status = 'connecting'
        console.log('⏳ Still connecting...')
      }

      console.log(`📱 Instance ${instance} - ${event}/${state} -> ${status}`)

      // 📝 Atualizar no banco
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

      // 🔄 Atualizar QR Code se disponível
      if (event === 'qrcode.updated' && data?.qrcode) {
        updateData.qr_code_base64 = data.qrcode
        updateData.qr_code = data.qrcode
        console.log('📱 QR Code incluído no update')
      }

      const { error: updateError } = await supabase
        .from('tendenci_whatsapp_connections')
        .update(updateData)
        .eq('instance_name', instance)

      if (updateError) {
        console.error('❌ Erro ao atualizar status:', updateError)
        throw updateError
      } else {
        console.log(`✅ Status atualizado: ${status} (phone: ${phoneNumber || 'N/A'})`)
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
