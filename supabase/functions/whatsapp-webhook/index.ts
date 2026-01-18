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
    // ========== VALIDAÇÃO DE SEGURANÇA (OBRIGATÓRIA) ==========
    // EVOLUTION_WEBHOOK_SECRET é OBRIGATÓRIO para segurança
    const webhookSecret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('❌ EVOLUTION_WEBHOOK_SECRET não configurado - webhook bloqueado por segurança')
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const requestToken = req.headers.get('x-webhook-token') || req.headers.get('authorization')?.replace('Bearer ', '')
    if (requestToken !== webhookSecret) {
      console.warn('⚠️ Webhook token inválido ou ausente')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    console.log('✅ Webhook token validado com sucesso')

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
    const connectionEvents = ['connection.update', 'qrcode.updated', 'open', 'connection.open']

    // ========== VERIFICAR SE É INSTÂNCIA IA E PROCESSAR INTERNAMENTE ==========
    const { data: connectionData } = await supabase
      .from('tendenci_whatsapp_connections')
      .select('id, is_ia_instance, webhook_url, user_id')
      .eq('instance_name', instance)
      .single()

    if (connectionData?.is_ia_instance && event === 'messages.upsert') {
      console.log('🤖 IA INSTANCE DETECTED - Processing with Lovable AI', {
        instanceName: instance,
        isIaInstance: connectionData.is_ia_instance,
        webhookUrl: connectionData.webhook_url,
        userId: connectionData.user_id,
        event: event,
        remoteJid: data?.key?.remoteJid,
        fromMe: data?.key?.fromMe,
        timestamp: new Date().toISOString()
      });
      
      try {
        // Chamar a nova edge function que processa com Lovable AI
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        
        const processResponse = await fetch(`${supabaseUrl}/functions/v1/process-ia-message`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ 
            payload, 
            instanceName: instance 
          })
        })
        
        const processStatus = processResponse.status
        const processOk = processResponse.ok
        const responseData = await processResponse.json().catch(() => ({}))
        
        console.log('📤 Process Response Status:', processStatus, processOk ? '✅' : '❌')
        
        // Logar resultado do processamento
        await supabase
          .from('tendenci_webhook_logs')
          .insert({
            event_type: 'ia_process_internal',
            instance_name: instance,
            phone_from: data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || null,
            message_content: `Processamento IA interno: ${processOk ? 'SUCESSO' : 'FALHA'} (HTTP ${processStatus})`,
            raw_payload: { 
              original_event: event,
              process_status: processStatus,
              process_ok: processOk,
              response: responseData
            },
            processing_status: processOk ? 'processed' : 'process_failed'
          })
        
        if (!processOk) {
          console.error('❌ Falha no processamento IA:', processStatus, responseData)
        } else {
          console.log('✅ Mensagem processada pela IA com sucesso!')
        }
      } catch (processError: any) {
        console.error('💥 Erro ao processar mensagem IA:', processError.message)
        
        // Logar erro
        await supabase
          .from('tendenci_webhook_logs')
          .insert({
            event_type: 'ia_process_error',
            instance_name: instance,
            phone_from: data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || null,
            message_content: `Erro no processamento IA: ${processError.message}`,
            raw_payload: { 
              original_event: event,
              error: processError.message 
            },
            processing_status: 'process_error'
          })
      }
    }

    // ========== DETECTAR INTERVENÇÃO HUMANA E PAUSAR IA ==========
    // Se mensagem foi enviada por humano (fromMe: true) em instância IA, pausar IA
    if (connectionData?.is_ia_instance && event === 'messages.upsert' && data?.key?.fromMe === true) {
      const clientPhoneForPause = data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || null;
      
      if (clientPhoneForPause && !clientPhoneForPause.includes('@g.us')) {
        console.log('👤 HUMAN INTERVENTION DETECTED - Pausing IA for client:', clientPhoneForPause);
        
        // Carregar timeout da configuração
        let timeoutMinutes = 120; // Default: 2 horas
        try {
          const { data: comConfig } = await supabase
            .from('tendenci_ia_config')
            .select('config')
            .eq('secao', 'comunicacao')
            .single();
          
          if (comConfig?.config?.human_takeover_timeout_minutes) {
            timeoutMinutes = Number(comConfig.config.human_takeover_timeout_minutes);
          }
        } catch (configErr) {
          console.warn('⚠️ Could not load timeout config, using default:', configErr);
        }
        
        const pausedUntil = new Date(Date.now() + timeoutMinutes * 60 * 1000);
        
        // Pausar IA para este cliente
        try {
          await supabase
            .from('ia_client_memory')
            .upsert({
              phone_number: clientPhoneForPause,
              instance_name: instance,
              ia_paused: true,
              ia_paused_at: new Date().toISOString(),
              ia_paused_until: pausedUntil.toISOString(),
              ia_paused_reason: 'human_intervention',
              updated_at: new Date().toISOString()
            }, { onConflict: 'phone_number,instance_name' });
          
          console.log(`⏸️ IA pausada até ${pausedUntil.toISOString()} (${timeoutMinutes} minutos)`);
          
          // Log no webhook
          await supabase
            .from('tendenci_webhook_logs')
            .insert({
              event_type: 'human_takeover',
              instance_name: instance,
              phone_from: clientPhoneForPause,
              message_content: `Intervenção humana detectada. IA pausada por ${timeoutMinutes} minutos.`,
              raw_payload: { timeout_minutes: timeoutMinutes, paused_until: pausedUntil.toISOString() },
              processing_status: 'human_takeover'
            });
        } catch (pauseErr) {
          console.error('❌ Erro ao pausar IA:', pauseErr);
        }
      }
    }

    // ========== LOGGING PERSISTENTE PARA DIAGNÓSTICO ==========
    const clientPhone = data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || null
    const messageText = (payload as any).data?.message?.conversation || 
                       (payload as any).data?.message?.extendedTextMessage?.text || null
    
    try {
      await supabase
        .from('tendenci_webhook_logs')
        .insert({
          event_type: event,
          instance_name: instance,
          phone_from: clientPhone,
          message_content: messageText?.substring(0, 500),
          raw_payload: payload,
          processing_status: 'received'
        })
      console.log('📝 Webhook logged to database')
    } catch (logError) {
      console.warn('⚠️ Failed to log webhook:', logError)
    }

    // ========== DETECTAR RESPOSTA DE CLIENTE/ARQUITETO ==========
    // Ignorar mensagens de grupos e listas
    const remoteJid = data?.key?.remoteJid || ''
    const isGroupOrList = remoteJid.includes('@g.us') || remoteJid.includes('@lid')
    
    if (event === 'messages.upsert' && data?.key?.remoteJid && data?.key?.fromMe === false && !isGroupOrList) {
      console.log('💬 Message received from individual, checking for campaign architects and follow-up deals...')
      
      const clientPhone = data.key.remoteJid.replace('@s.whatsapp.net', '')
      console.log('📱 Client phone:', clientPhone)

      const messageText = (payload as any).data?.message?.conversation || 
                         (payload as any).data?.message?.extendedTextMessage?.text || ''
      
      const clientLast8 = getPhoneDigits(clientPhone)

      // ========== VERIFICAR RESPOSTA DE ARQUITETO DE CAMPANHA ==========
      if (clientLast8.length >= 8) {
        // Buscar arquiteto pelo telefone
        const { data: arquitetoData } = await supabase
          .from('architects')
          .select('id, name, phone, status_funil')
          .or(`phone.ilike.%${clientLast8}`)
          .limit(1)
          .single()

        if (arquitetoData) {
          console.log('🎯 Arquiteto encontrado:', arquitetoData.name)

          // Verificar se tem campanha pendente de resposta
          const { data: campanhaArq, error: campanhaError } = await supabase
            .from('tendenci_prospec_arq_campaign_architects')
            .select('id, campanha_id, status, respondeu')
            .eq('architect_id', arquitetoData.id)
            .eq('status', 'enviado')
            .eq('respondeu', false)
            .order('data_envio', { ascending: false })
            .limit(1)
            .single()

          if (campanhaArq && !campanhaError) {
            console.log('📬 Campanha encontrada para arquiteto, marcando resposta...')

            // Marcar como respondeu
            const { error: updateError } = await supabase
              .from('tendenci_prospec_arq_campaign_architects')
              .update({
                respondeu: true,
                data_resposta: new Date().toISOString()
              })
              .eq('id', campanhaArq.id)

            if (!updateError) {
              console.log('✅ Resposta de campanha registrada!')

              // CORREÇÃO: Não mover automaticamente para parceiro_ativo
              // O vendedor deve mover MANUALMENTE quando verificar a resposta
              // Apenas atualizar data_ultimo_contato para visibilidade
              await supabase
                .from('architects')
                .update({
                  data_ultimo_contato: new Date().toISOString()
                })
                .eq('id', arquitetoData.id)

              console.log('📍 Data de último contato atualizada (vendedor move manualmente para parceiro_ativo)')

              // Registrar log
              await supabase
                .from('tendenci_prospec_arq_logs')
                .insert({
                  architect_id: arquitetoData.id,
                  campanha_id: campanhaArq.campanha_id,
                  tipo: 'resposta_campanha',
                  canal: 'whatsapp',
                  mensagem: `✅ Arquiteto respondeu à campanha: "${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}"`,
                  enviado_por: null
                })
            }
          }
        }
      }
      
      // Palavras de opt-out
      const optOutKeywords = ['pare', 'parar', 'não quero', 'sair', 'cancelar', 'desinscrever', 'stop', 'para']
      const hasOptOut = optOutKeywords.some(keyword => 
        messageText.toLowerCase().includes(keyword.toLowerCase())
      )
      
      if (hasOptOut) {
        console.log('🛑 OPT-OUT DETECTADO na mensagem do cliente:', messageText)
      }
      
      
      if (clientLast8.length < 8) {
        console.log('⚠️ Número do cliente muito curto para comparação:', clientPhone)
      } else {
        console.log('🔍 Buscando deals com últimos 8 dígitos:', clientLast8)
        
        // Buscar PRIMEIRO a etapa Follow Up para saber o pipeline
        const { data: followupStages } = await supabase
          .from('crm_stages')
          .select('id, name, pipeline_id')
          .ilike('name', '%Follow Up%')
        
        const followupStage = followupStages?.[0]
        
        console.log('📂 Etapa Follow Up:', followupStage?.id, 'Pipeline:', followupStage?.pipeline_id)
        
        // CORREÇÃO CRÍTICA: Buscar etapa Lead do MESMO PIPELINE do Follow Up
        let leadStage = null
        if (followupStage?.pipeline_id) {
          const { data: leadStages } = await supabase
            .from('crm_stages')
            .select('id, name, pipeline_id')
            .eq('pipeline_id', followupStage.pipeline_id)
            .ilike('name', 'Lead')
          
          leadStage = leadStages?.[0]
          console.log('📂 Etapa Lead (mesmo pipeline):', leadStage?.id, 'Pipeline:', leadStage?.pipeline_id)
        }
        
        if (!leadStage && followupStage) {
          console.error('❌ ERRO CRÍTICO: Não encontrou etapa Lead no pipeline', followupStage.pipeline_id)
        }
        
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
              console.log(`📊 Deal followup_count: ${deal.followup_count}`)
              
              // ========== VALIDAR SE HOUVE FOLLOW-UP REAL ANTES DE MOVER ==========
              const hadRealFollowup = (deal.followup_count || 0) > 0
              
              // ========== MOVER PARA ETAPA "LEAD" SE CLIENTE RESPONDEU ==========
              const updateData: any = {
                last_interaction: new Date().toISOString()
              }
              
              // Se cliente respondeu (não opt-out) E houve follow-up real, mover para Lead
              if (!hasOptOut && leadStage?.id && hadRealFollowup) {
                updateData.stage_id = leadStage.id
                updateData.stage_entered_at = new Date().toISOString()
                console.log('🔄 Movendo deal para etapa Lead (follow-up real confirmado):', leadStage.id)
              } else if (!hasOptOut && leadStage?.id && !hadRealFollowup) {
                // Se não houve follow-up, ainda move mas com descrição diferente
                updateData.stage_id = leadStage.id
                updateData.stage_entered_at = new Date().toISOString()
                console.log('🔄 Movendo deal para etapa Lead (mensagem direta, sem follow-up prévio):', leadStage.id)
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
                
                // Timeline message - DIFERENCIADA baseado se houve follow-up real
                let timelineMessage: string
                if (hasOptOut) {
                  timelineMessage = '🛑 Cliente solicitou PARAR follow-ups. Sistema desativado.'
                } else if (leadStage?.id && hadRealFollowup) {
                  timelineMessage = '🎉 Cliente respondeu ao follow-up! Movido automaticamente para etapa "Lead".'
                } else if (leadStage?.id && !hadRealFollowup) {
                  timelineMessage = '💬 Cliente enviou mensagem (sem follow-up prévio). Movido para etapa "Lead".'
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
                
                // Registrar mudança de etapa no histórico - COM DESCRIÇÃO CORRETA
                if (!hasOptOut && leadStage?.id && followupStage?.id) {
                  // Descrição diferenciada baseado se houve follow-up real
                  const historyDescription = hadRealFollowup 
                    ? 'Movido automaticamente: Cliente respondeu ao follow-up'
                    : 'Movido automaticamente: Cliente enviou mensagem (sem follow-up prévio)'
                  
                  await supabase
                    .from('crm_deal_history')
                    .insert({
                      deal_id: deal.id,
                      action_type: 'stage_change',
                      from_stage_id: followupStage.id,
                      to_stage_id: leadStage.id,
                      description: historyDescription
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

      // Tentar extrair telefone do payload
      let phoneNumber = 
        data?.remoteJid?.replace('@s.whatsapp.net', '') ||
        data?.key?.remoteJid?.replace('@s.whatsapp.net', '') ||
        data?.phoneNumber ||
        null

      // 🔧 MELHORIA: Se conectado mas sem telefone, buscar da Evolution API
      if (status === 'connected' && !phoneNumber) {
        console.log('📱 Phone not in payload, fetching from Evolution API...')
        
        try {
          const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')?.replace(/\/$/, '')
          const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')
          
          if (evolutionUrl && evolutionApiKey) {
            const statusResp = await fetch(
              `${evolutionUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`,
              { headers: { 'apikey': evolutionApiKey } }
            )
            
            if (statusResp.ok) {
              const statusData = await statusResp.json()
              const instData = Array.isArray(statusData) ? statusData[0] : statusData
              phoneNumber = instData?.ownerJid?.split('@')[0] || null
              console.log('📱 Phone from Evolution API:', phoneNumber)
            }
          }
        } catch (fetchErr) {
          console.warn('⚠️ Could not fetch phone from Evolution:', fetchErr)
        }
      }

      console.log('📱 Final phone number:', phoneNumber)

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
      } else if (status === 'connected' && !phoneNumber) {
        // Conectado mas sem telefone - apenas atualizar status e limpar QR
        updateData.connected_at = new Date().toISOString()
        updateData.qr_code = null
        updateData.qr_code_base64 = null
        console.log('✅ Setting connected state (phone pending)')
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
    
    // Log error to system_errors table
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await supabase.from('system_errors').insert({
        title: 'Erro no whatsapp-webhook',
        description: error.message || 'Erro desconhecido no webhook',
        module: 'webhooks',
        severity: 'high',
        source: 'webhook',
        stack_trace: error.stack || null,
        metadata: { function: 'whatsapp-webhook' },
        status: 'open'
      })
    } catch (logErr) {
      console.error('❌ Falha ao logar erro:', logErr)
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
