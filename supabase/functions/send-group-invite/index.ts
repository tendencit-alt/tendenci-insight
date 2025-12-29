import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * send-group-invite
 * 
 * Envia convite para grupo de ofertas do WhatsApp
 * Usa mesma lógica de instância do send-followup-whatsapp
 */

const GROUP_LINK = 'https://chat.whatsapp.com/BOd6s8iYWHn6G1EdF3x7lx'

interface SendGroupInviteRequest {
  deal_id: string
  client_name: string
  client_phone: string
  owner_id: string | null
}

/**
 * Formata número brasileiro para WhatsApp
 * Mesma lógica do send-followup-whatsapp
 */
function formatBrazilianPhone(phone: string): { formatted: string | null; error?: string } {
  if (!phone) {
    return { formatted: null, error: 'Telefone não fornecido' }
  }
  
  let clean = phone.replace(/\D/g, '')
  
  console.log(`📱 Formatando: "${phone}" → limpo: "${clean}"`)
  
  // Remove 55 duplicados
  while (clean.startsWith('55') && clean.length > 11) {
    clean = clean.substring(2)
  }
  
  // Validação: muito curto
  if (clean.length < 10) {
    return { formatted: null, error: `Número muito curto (${clean.length} dígitos)` }
  }
  
  // Adiciona 9° dígito se necessário
  if (clean.length === 10) {
    clean = clean.slice(0, 2) + '9' + clean.slice(2)
  }
  
  if (clean.length === 12 && clean.startsWith('55')) {
    clean = clean.slice(0, 4) + '9' + clean.slice(4)
  }
  
  // Adiciona código do país
  if (!clean.startsWith('55')) {
    clean = '55' + clean
  }
  
  // Validação final
  if (clean.length !== 13) {
    return { formatted: null, error: `Tamanho inválido: ${clean.length} dígitos` }
  }
  
  return { formatted: `${clean}@s.whatsapp.net` }
}

/**
 * Verifica saúde da Evolution API
 */
async function checkEvolutionHealth(
  evolutionUrl: string,
  evolutionApiKey: string,
  instanceName: string
): Promise<{ online: boolean; connected: boolean; error?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    
    const response = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': evolutionApiKey },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return { online: true, connected: false, error: `Status ${response.status}` }
    }
    
    const data = await response.json()
    const state = data?.instance?.state || data?.state || ''
    const isConnected = state === 'open' || state === 'connected'
    
    console.log(`🔌 Evolution API: online=true, state="${state}", connected=${isConnected}`)
    
    return { online: true, connected: isConnected }
  } catch (error: any) {
    const isNetworkError = error.message?.includes('abort') || 
                           error.message?.includes('ECONNREFUSED') ||
                           error.message?.includes('No route')
    
    return { 
      online: !isNetworkError, 
      connected: false, 
      error: error.message 
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('═══════════════════════════════════════════════════════════')
  console.log('📨 [SEND-GROUP-INVITE] Iniciando envio de convite...')
  console.log('═══════════════════════════════════════════════════════════')

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obter Evolution API das variáveis de ambiente
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')
    
    if (!evolutionUrl || !evolutionApiKey) {
      throw new Error('Evolution API não configurada (EVOLUTION_API_URL ou EVOLUTION_API_KEY)')
    }

    const body: SendGroupInviteRequest = await req.json()
    const { deal_id, client_name, client_phone, owner_id } = body

    if (!deal_id || !client_phone) {
      throw new Error('deal_id e client_phone são obrigatórios')
    }

    console.log(`📋 Deal: ${deal_id}, Cliente: ${client_name}, Telefone: ${client_phone}`)

    // ═══════════════════════════════════════════════════════════
    // BUSCAR INSTÂNCIA WHATSAPP DINAMICAMENTE DO BANCO
    // Mesma lógica do send-followup-whatsapp
    // ═══════════════════════════════════════════════════════════
    console.log('🔍 Buscando instância WhatsApp conectada...')
    
    // Primeiro: tentar instância marcada como IA
    const { data: iaConnection } = await supabase
      .from('tendenci_whatsapp_connections')
      .select('instance_name, status, phone_number')
      .eq('is_ia_instance', true)
      .eq('status', 'connected')
      .limit(1)
      .maybeSingle()
    
    let instanceName: string
    
    if (iaConnection) {
      instanceName = iaConnection.instance_name
      console.log(`✅ Usando instância IA: ${instanceName} (${iaConnection.phone_number})`)
    } else {
      // Tentar instância do owner se fornecido
      if (owner_id) {
        const { data: ownerConnection } = await supabase
          .from('tendenci_whatsapp_connections')
          .select('instance_name, status, phone_number')
          .eq('user_id', owner_id)
          .eq('status', 'connected')
          .limit(1)
          .maybeSingle()
        
        if (ownerConnection) {
          instanceName = ownerConnection.instance_name
          console.log(`✅ Usando instância do vendedor: ${instanceName} (${ownerConnection.phone_number})`)
        }
      }
      
      // Fallback: qualquer instância conectada
      if (!instanceName!) {
        const { data: anyConnection } = await supabase
          .from('tendenci_whatsapp_connections')
          .select('instance_name, status, phone_number')
          .eq('status', 'connected')
          .limit(1)
          .maybeSingle()
        
        if (!anyConnection) {
          console.error('❌ Nenhuma instância WhatsApp conectada!')
          
          await supabase.from('system_errors').insert({
            title: 'Nenhum WhatsApp conectado',
            module: 'group-invite',
            description: 'Não há instâncias WhatsApp conectadas para enviar convite de grupo',
            severity: 'critical',
            source: 'send-group-invite'
          })
          
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Nenhuma instância WhatsApp conectada'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
          )
        }
        
        instanceName = anyConnection.instance_name
        console.log(`⚠️ Usando instância alternativa: ${instanceName} (${anyConnection.phone_number})`)
      }
    }

    // Verificar saúde da Evolution API
    console.log('🔍 Verificando Evolution API...')
    const healthCheck = await checkEvolutionHealth(evolutionUrl, evolutionApiKey, instanceName)
    
    if (!healthCheck.online) {
      console.error('❌ Evolution API offline:', healthCheck.error)
      
      await supabase.from('system_errors').insert({
        title: 'Evolution API Offline',
        module: 'group-invite',
        description: `Evolution API offline: ${healthCheck.error}`,
        severity: 'critical',
        source: 'send-group-invite'
      })
      
      return new Response(
        JSON.stringify({ success: false, error: 'Evolution API offline' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }
    
    if (!healthCheck.connected) {
      console.error(`❌ Instância ${instanceName} desconectada`)
      
      // Sincronizar status no banco
      await supabase
        .from('tendenci_whatsapp_connections')
        .update({ status: 'disconnected', updated_at: new Date().toISOString() })
        .eq('instance_name', instanceName)
      
      await supabase.from('system_errors').insert({
        title: `WhatsApp ${instanceName} desconectado`,
        module: 'group-invite',
        description: 'Instância de WhatsApp desconectada. Reconecte via QR Code.',
        severity: 'high',
        source: 'send-group-invite'
      })
      
      return new Response(
        JSON.stringify({ success: false, error: `Instância ${instanceName} desconectada` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    // Formatar número usando função robusta
    const phoneResult = formatBrazilianPhone(client_phone)
    
    if (!phoneResult.formatted) {
      console.error(`❌ Número inválido: ${phoneResult.error}`)
      return new Response(
        JSON.stringify({ success: false, error: `Número inválido: ${phoneResult.error}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Montar mensagem
    const firstName = client_name?.split(' ')[0] || 'Cliente'
    const message = `Olá, ${firstName}! 👋

Temos um grupo exclusivo no WhatsApp com ofertas especiais e novidades. Participe:

${GROUP_LINK}

Até lá! 🎉`

    // Enviar mensagem via Evolution API
    console.log(`📤 Enviando convite para ${phoneResult.formatted} via ${instanceName}...`)
    
    const sendResponse = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify({
        number: phoneResult.formatted,
        text: message,
        delay: 1500
      })
    })

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text()
      console.error('❌ Erro Evolution API:', errorText)
      
      await supabase.from('system_errors').insert({
        title: 'Falha no envio de convite',
        module: 'group-invite',
        description: `Erro ao enviar convite de grupo: ${sendResponse.status} - ${errorText}`,
        severity: 'medium',
        source: 'send-group-invite',
        metadata: { deal_id, client_phone }
      })
      
      return new Response(
        JSON.stringify({ success: false, error: `Falha ao enviar: ${sendResponse.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const sendResult = await sendResponse.json()
    console.log('✅ Convite enviado:', sendResult?.key?.id || 'sem ID')

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
        update_type: 'Observação'
      })

    if (timelineError) {
      console.error('⚠️ Erro ao registrar timeline:', timelineError)
    } else {
      console.log('✅ Timeline registrada')
    }

    const elapsed = Date.now() - startTime
    console.log(`🏁 [SEND-GROUP-INVITE] Concluído em ${elapsed}ms`)
    console.log('═══════════════════════════════════════════════════════════')

    return new Response(
      JSON.stringify({
        success: true,
        deal_id,
        message_sent: true,
        messageId: sendResult?.key?.id,
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
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
