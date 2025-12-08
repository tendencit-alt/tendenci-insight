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

// Função para extrair últimos 8 dígitos
function getPhoneDigits(phone: string | null | undefined): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 8 ? cleaned.slice(-8) : ''
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
      
      const clientPhone = data.key.remoteJid.replace('@s.whatsapp.net', '')
      console.log('📱 Client phone:', clientPhone)

      const messageText = (payload as any).data?.message?.conversation || 
                         (payload as any).data?.message?.extendedTextMessage?.text || ''
      
      // Palavras de opt-out
      const optOutKeywords = ['pare', 'parar', 'não quero', 'sair', 'cancelar', 'desinscrever', 'stop', 'para']
      const hasOptOut = optOutKeywords.some(keyword => 
        messageText.toLowerCase().includes(keyword.toLowerCase())
      )
      
      if (hasOptOut) {
        console.log('🛑 OPT-OUT DETECTADO na mensagem do cliente:', messageText)
      }
      
      const clientLast8 = getPhoneDigits(clientPhone)
      
      if (clientLast8.length < 8) {
        console.log('⚠️ Número do cliente muito curto para comparação:', clientPhone)
      } else {
        console.log('🔍 Buscando deals com últimos 8 dígitos:', clientLast8)
        
        // Buscar etapas Follow Up e Lead
        const { data: stages } = await supabase
          .from('crm_stages')
          .select('id, name, pipeline_id')
          .or('name.ilike.%Follow Up%,name.ilike.%Lead%')
        
        const followupStage = stages?.find(s => s.name.toLowerCase().includes('follow up'))
        const leadStage = stages?.find(s => s.name.toLowerCase() === 'lead')
        
        console.log('📂 Etapa Follow Up:', followupStage?.id)
        console.log('📂 Etapa Lead:', leadStage?.id)
        
        // Buscar deals na etapa Follow Up
        let dealsQuery = supabase
          .from('crm_deals')
          .select(`
            id,
            title,
            followup_count,
            followup_enabled,
            owner_id,
            stage_id,
            pipeline_id,
            leads(
              client_id,
              clients(phone)
            )
          `)
          .eq('status', 'aberto')
          .eq('followup_enabled', true)
          .limit(200)
        
        if (followupStage?.id) {
          dealsQuery = dealsQuery.eq('stage_id', followupStage.id)
          console.log('📂 Filtrando por stage Follow Up:', followupStage.id)
        }
        
        const { data: deals, error: dealsError } = await dealsQuery
        
        if (dealsError) {
          console.error('❌ Erro ao buscar deals:', dealsError)
        } else {
          // Comparação de telefone
          const matchingDeals = (deals || []).filter(deal => {
            const leadsData = deal.leads
            const clientData = Array.isArray(leadsData) 
              ? leadsData[0]?.clients 
              : (leadsData as any)?.clients
            
            const dealLast8 = getPhoneDigits(clientData?.phone)
            
            if (dealLast8.length < 8) return false
            
            return dealLast8 === clientLast8
          })

          if (matchingDeals.length > 0) {
            console.log(`✅ Found ${matchingDeals.length} follow-up deal(s) for this client`)
            
            for (const deal of matchingDeals) {
              console.log(`🔄 Processing deal: ${deal.title}`)
              
              // ========== MOVER PARA ETAPA "LEAD" SE CLIENTE RESPONDEU ==========
              const updateData: any = {
                last_interaction: new Date().toISOString()
              }
              
              // Se cliente respondeu (não opt-out), mover para Lead
              if (!hasOptOut && leadStage?.id) {
                updateData.stage_id = leadStage.id
                updateData.stage_entered_at = new Date().toISOString()
                console.log('🔄 Movendo deal para etapa Lead:', leadStage.id)
              }
              
              // Se opt-out detectado, desabilitar follow-ups
              if (hasOptOut) {
                updateData.followup_enabled = false
                console.log('🛑 Desabilitando follow-ups para deal:', deal.id)
              }
              
              // Atualizar deal
              const { data: updateResult, error: updateError } = await supabase
                .from('crm_deals')
                .update(updateData)
                .eq('id', deal.id)
                .select('id')
                .single()
              
              if (updateError) {
                console.error('❌ Error updating deal:', updateError)
              } else {
                console.log('✅ Deal updated successfully, id:', updateResult?.id)
                
                // Criar log de resposta do cliente
                const { error: responseLogError } = await supabase
                  .from('followup_logs')
                  .insert({
                    deal_id: deal.id,
                    followup_number: deal.followup_count || 0,
                    status: 'client_responded',
                    message_sent: `Cliente respondeu: "${messageText.substring(0, 200)}${messageText.length > 200 ? '...' : ''}"`,
                    sent_at: new Date().toISOString()
                  })
                
                if (responseLogError) {
                  console.warn('⚠️ Erro ao criar log de resposta:', responseLogError)
                } else {
                  console.log('✅ Log de resposta do cliente criado')
                }
                
                // Timeline message
                let timelineMessage: string
                if (hasOptOut) {
                  timelineMessage = '🛑 Cliente solicitou PARAR follow-ups. Sistema desativado.'
                } else if (leadStage?.id) {
                  timelineMessage = '🎉 Cliente respondeu! Movido automaticamente para etapa "Lead" para atendimento humano.'
                } else {
                  timelineMessage = '🎉 Cliente respondeu! Ciclo de follow-up pausado.'
                }
                
                await supabase
                  .from('crm_timeline')
                  .insert({
                    deal_id: deal.id,
                    message: timelineMessage,
                    update_type: 'Sistema - Follow-up'
                  })
                
                // Registrar mudança de etapa no histórico se moveu para Lead
                if (!hasOptOut && leadStage?.id && followupStage?.id) {
                  await supabase
                    .from('crm_deal_history')
                    .insert({
                      deal_id: deal.id,
                      action_type: 'stage_change',
                      from_stage_id: followupStage.id,
                      to_stage_id: leadStage.id,
                      description: 'Movido automaticamente: Cliente respondeu ao follow-up'
                    })
                }
                
                // Notificar vendedor responsável
                if (deal.owner_id) {
                  const notificationTitle = hasOptOut 
                    ? '🛑 Cliente pediu para parar!'
                    : '🎉 Cliente respondeu ao follow-up!'
                  
                  const notificationMessage = hasOptOut
                    ? `O cliente no negócio "${deal.title}" pediu para PARAR os follow-ups. Sistema desativado.`
                    : `O cliente respondeu no negócio "${deal.title}" e foi movido para a etapa Lead. Atenda agora!`
                  
                  await supabase
                    .from('notifications')
                    .insert({
                      user_id: deal.owner_id,
                      type: hasOptOut ? 'followup_optout' : 'followup_response',
                      title: notificationTitle,
                      message: notificationMessage,
                      link: `/crm?deal=${deal.id}`,
                      metadata: {
                        deal_id: deal.id,
                        client_phone: clientPhone,
                        opt_out: hasOptOut,
                        moved_to_lead: !hasOptOut && !!leadStage?.id,
                        followup_count: deal.followup_count
                      }
                    })
                }
              }
            }
          } else {
            console.log('ℹ️ Nenhum deal com follow-up ativo encontrado para este telefone')
          }
        }
      }
    }

    if (connectionEvents.includes(event)) {
      console.log('📡 Processing connection event:', event)

      let status = 'connecting'
      if (event === 'open' || event === 'connection.open' || data?.state === 'open') {
        status = 'connected'
        console.log('✅ Connection is OPEN')
      } else if (data?.state === 'close') {
        status = 'disconnected'
        console.log('❌ Connection is CLOSED')
      }

      const phoneNumber = 
        data?.remoteJid?.replace('@s.whatsapp.net', '') ||
        data?.key?.remoteJid?.replace('@s.whatsapp.net', '') ||
        data?.phoneNumber ||
        null

      console.log('📱 Phone number:', phoneNumber)

      const updateData: any = {
        status,
        last_sync: new Date().toISOString(),
        metadata: {
          last_event: event,
          last_state: data?.state,
          updated_at: new Date().toISOString()
        }
      }

      if (status === 'connected' && phoneNumber) {
        updateData.phone_number = phoneNumber
        updateData.connected_at = new Date().toISOString()
        updateData.qr_code = null
        updateData.qr_code_base64 = null
        console.log('✅ Setting connected state with phone:', phoneNumber)
      }

      if (status === 'disconnected') {
        updateData.phone_number = null
        updateData.qr_code = null
        updateData.qr_code_base64 = null
        console.log('🔌 Clearing disconnected state')
      }

      if (data?.qrcode?.base64) {
        updateData.qr_code_base64 = data.qrcode.base64
        updateData.qr_code = data.qrcode.base64
        console.log('📱 Updating QR code')
      }

      console.log('💾 Updating database...')

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
