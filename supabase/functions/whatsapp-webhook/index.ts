import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface EvolutionWebhook {
  event: string
  instance: string
  data: {
    state?: string
    remoteJid?: string
    key?: {
      remoteJid?: string
      fromMe?: boolean
    }
    phoneNumber?: string
    qrcode?: {
      code?: string
      base64?: string
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: EvolutionWebhook = await req.json()
    
    console.log('🔔 WEBHOOK RECEIVED:', {
      event: payload.event,
      instance: payload.instance,
      state: payload.data?.state,
      timestamp: new Date().toISOString()
    })

    const { instance, event, data } = payload
    const connectionEvents = ['connection.update', 'qrcode.updated', 'open', 'messages.upsert', 'connection.open']

    // ========== DETECTAR RESPOSTA DE CLIENTE PARA FOLLOW-UP ==========
    if (event === 'messages.upsert' && data?.key?.remoteJid && data?.key?.fromMe === false) {
      console.log('💬 Message received from client, checking for follow-up deals...')
      
      // Extrair número do cliente
      const clientPhone = data.key.remoteJid.replace('@s.whatsapp.net', '')
      console.log('📱 Client phone:', clientPhone)
      
      // Buscar deals na etapa "Follow Up (I.A)" com esse telefone
      const { data: deals, error: dealsError } = await supabase
        .from('crm_deals')
        .select(`
          id,
          title,
          followup_count,
          owner_id,
          stage_id,
          crm_stages!inner(name),
          leads!inner(
            client_id,
            clients!inner(phone)
          )
        `)
        .eq('status', 'aberto')
        .eq('crm_stages.name', 'Follow Up (I.A)')
        .like('leads.clients.phone', `%${clientPhone}%`)

      if (!dealsError && deals && deals.length > 0) {
        console.log(`✅ Found ${deals.length} follow-up deal(s) for this client`)
        
        for (const deal of deals) {
          console.log(`🔄 Resetting follow-up counter for deal: ${deal.title}`)
          
          // Resetar contador de follow-up
          const { error: updateError } = await supabase
            .from('crm_deals')
            .update({
              followup_count: 0,
              last_interaction: new Date().toISOString()
            })
            .eq('id', deal.id)
          
          if (updateError) {
            console.error('❌ Error updating deal:', updateError)
          } else {
            console.log('✅ Follow-up counter reset successfully')
            
            // Registrar na timeline
            await supabase
              .from('crm_timeline')
              .insert({
                deal_id: deal.id,
                message: '🎉 Cliente respondeu! Contador de follow-up resetado.',
                update_type: 'Sistema - Follow-up'
              })
            
            // Notificar vendedor responsável
            if (deal.owner_id) {
              await supabase
                .from('notifications')
                .insert({
                  user_id: deal.owner_id,
                  type: 'followup_response',
                  title: 'Cliente respondeu!',
                  message: `O cliente respondeu no negócio "${deal.title}". Verifique a conversa.`,
                  link: `/crm?deal=${deal.id}`,
                  metadata: {
                    deal_id: deal.id,
                    client_phone: clientPhone
                  }
                })
            }
          }
        }
      }
    }

    if (connectionEvents.includes(event)) {
      console.log('📡 Processing connection event:', event)

      // Determinar status baseado no evento e state
      let status = 'connecting'
      if (event === 'open' || event === 'connection.open' || data?.state === 'open') {
        status = 'connected'
        console.log('✅ Connection is OPEN')
      } else if (data?.state === 'close') {
        status = 'disconnected'
        console.log('❌ Connection is CLOSED')
      }

      // Extrair número de telefone
      const phoneNumber = 
        data?.remoteJid?.replace('@s.whatsapp.net', '') ||
        data?.key?.remoteJid?.replace('@s.whatsapp.net', '') ||
        data?.phoneNumber ||
        null

      console.log('📱 Phone number:', phoneNumber)

      // Preparar dados para atualização
      const updateData: any = {
        status,
        last_sync: new Date().toISOString(),
        metadata: {
          last_event: event,
          last_state: data?.state,
          updated_at: new Date().toISOString()
        }
      }

      // Se conectado, adicionar phone e data de conexão
      if (status === 'connected' && phoneNumber) {
        updateData.phone_number = phoneNumber
        updateData.connected_at = new Date().toISOString()
        updateData.qr_code = null
        updateData.qr_code_base64 = null
        console.log('✅ Setting connected state with phone:', phoneNumber)
      }

      // Se desconectado, limpar dados
      if (status === 'disconnected') {
        updateData.phone_number = null
        updateData.qr_code = null
        updateData.qr_code_base64 = null
        console.log('🔌 Clearing disconnected state')
      }

      // Atualizar QR code se disponível
      if (data?.qrcode?.base64) {
        updateData.qr_code_base64 = data.qrcode.base64
        updateData.qr_code = data.qrcode.base64
        console.log('📱 Updating QR code')
      }

      console.log('💾 Updating database with:', JSON.stringify(updateData, null, 2))

      // Atualizar banco de dados
      const { error: updateError } = await supabase
        .from('tendenci_whatsapp_connections')
        .update(updateData)
        .eq('instance_name', instance)

      if (updateError) {
        console.error('❌ Error updating database:', updateError)
        throw updateError
      }

      console.log('✅ Database updated successfully')
    } else {
      console.log('ℹ️ Ignoring event:', event)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
