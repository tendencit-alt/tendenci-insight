import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { formatBrasilDateTime } from '../_shared/timezone.ts'

/**
 * send-followup-whatsapp
 * 
 * Edge function para envio DIRETO de follow-up via Evolution API
 * Elimina dependência do n8n para envio de mensagens
 * 
 * Fluxo:
 * 1. Recebe dados do lead/deal
 * 2. Gera mensagem de follow-up baseada no histórico
 * 3. Envia via Evolution API (instância dinâmica do banco)
 * 4. Atualiza histórico do deal
 * 5. Registra logs
 */

interface SendFollowupRequest {
  deal_id: string
  session_id?: string
  client_name: string
  client_phone: string
  conversation_history: string | null
  followup_count: number
  max_followups: number
  followup_number: number
  owner_id?: string | null
  owner_name?: string | null
  product_type?: string | null
  categoria?: string | null
}

interface FollowupResult {
  success: boolean
  deal_id: string
  message_sent?: string
  error?: string
  messageId?: string
}

// Templates de follow-up por número
const FOLLOWUP_TEMPLATES = {
  1: {
    tone: 'amigável e curioso',
    template: `Oi {nome}! 👋

Tudo bem? Notei que conversamos há alguns dias sobre {produto}.

Ficou alguma dúvida que eu possa esclarecer? Estou aqui pra te ajudar! 😊`
  },
  2: {
    tone: 'prestativo e informativo',
    template: `Olá {nome}! 

Passando pra ver se posso te ajudar com alguma informação sobre {produto}.

Temos algumas novidades e condições especiais que podem te interessar. Quer saber mais? 🤔`
  },
  3: {
    tone: 'objetivo e respeitoso',
    template: `Oi {nome}, tudo bem?

Só passando uma última vez pra ver se ainda tem interesse em {produto}.

Se não for o momento, sem problemas! Fico à disposição quando precisar. 👍`
  }
}

// Gera mensagem de follow-up personalizada
function generateFollowupMessage(
  followupNumber: number,
  clientName: string,
  productType: string | null,
  categoria: string | null,
  conversationHistory: string | null
): string {
  const templateData = FOLLOWUP_TEMPLATES[followupNumber as keyof typeof FOLLOWUP_TEMPLATES] 
    || FOLLOWUP_TEMPLATES[3] // Default para follow-ups além do 3
  
  const produto = productType || categoria || 'nossos produtos'
  const nome = clientName.split(' ')[0] // Primeiro nome apenas
  
  let message = templateData.template
    .replace('{nome}', nome)
    .replace('{produto}', produto)
  
  // Se há histórico, podemos personalizar mais (futuro: usar IA)
  if (conversationHistory && conversationHistory.length > 100) {
    // Futuro: usar Lovable AI para gerar mensagem contextualizada
  }
  
  return message
}

// Formata número brasileiro para WhatsApp
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

// Verifica saúde da Evolution API
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

// Envia mensagem via Evolution API
async function sendWhatsAppMessage(
  evolutionUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log(`📤 Enviando para ${phoneNumber} via ${instanceName}...`)
    
    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: message,
        delay: 1500 // 1.5s delay para parecer mais humano
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Evolution API erro ${response.status}:`, errorText)
      return { success: false, error: `API ${response.status}: ${errorText}` }
    }
    
    const data = await response.json()
    console.log(`✅ Mensagem enviada:`, data?.key?.id || 'sem ID')
    
    return { success: true, messageId: data?.key?.id }
  } catch (error: any) {
    console.error(`❌ Erro ao enviar:`, error.message)
    return { success: false, error: error.message }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📤 [SEND-FOLLOWUP-WHATSAPP] Iniciando envio direto...')
    console.log('═══════════════════════════════════════════════════════════')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')
    
    if (!evolutionUrl || !evolutionApiKey) {
      throw new Error('Evolution API não configurada (EVOLUTION_API_URL ou EVOLUTION_API_KEY)')
    }
    
    // ═══════════════════════════════════════════════════════════
    // BUSCAR INSTÂNCIA WHATSAPP DINAMICAMENTE DO BANCO
    // ═══════════════════════════════════════════════════════════
    console.log('🔍 Buscando instância WhatsApp conectada...')
    
    // Primeiro: tentar instância marcada como IA
    let { data: iaConnection, error: iaError } = await supabase
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
      // Fallback: qualquer instância conectada
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
          module: 'followup',
          description: 'Não há instâncias WhatsApp conectadas para enviar follow-up',
          severity: 'critical',
          source: 'send-followup-whatsapp'
        })
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Nenhuma instância WhatsApp conectada. Reconecte pelo menos uma instância.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
        )
      }
      
      instanceName = anyConnection.instance_name
      console.log(`⚠️ Usando instância alternativa: ${instanceName} (${anyConnection.phone_number})`)
    }
    
    // Parsear request
    const body: SendFollowupRequest = await req.json()
    console.log(`📋 Deal: ${body.deal_id}, Cliente: ${body.client_name}, Follow-up #${body.followup_number}`)
    
    // Validações
    if (!body.deal_id || !body.client_phone || !body.client_name) {
      throw new Error('deal_id, client_phone e client_name são obrigatórios')
    }
    
    // 1️⃣ Verificar saúde da Evolution API
    console.log('🔍 Verificando Evolution API...')
    const healthCheck = await checkEvolutionHealth(evolutionUrl, evolutionApiKey, instanceName)
    
    if (!healthCheck.online) {
      console.error('❌ Evolution API offline:', healthCheck.error)
      
      // Registrar falha
      await supabase.from('followup_logs').insert({
        deal_id: body.deal_id,
        followup_number: body.followup_number,
        status: 'failed',
        error_message: `Evolution API offline: ${healthCheck.error}`
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          deal_id: body.deal_id,
          error: 'Evolution API offline'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }
    
    if (!healthCheck.connected) {
      console.error(`❌ Instância ${instanceName} desconectada`)
      
      // ═══════════════════════════════════════════════════════════
      // SINCRONIZAR STATUS NO BANCO DE DADOS
      // ═══════════════════════════════════════════════════════════
      console.log(`🔄 Atualizando status da instância ${instanceName} para 'disconnected'...`)
      await supabase
        .from('tendenci_whatsapp_connections')
        .update({ 
          status: 'disconnected', 
          updated_at: new Date().toISOString() 
        })
        .eq('instance_name', instanceName)
      
      await supabase.from('followup_logs').insert({
        deal_id: body.deal_id,
        followup_number: body.followup_number,
        status: 'failed',
        error_message: `Instância ${instanceName} desconectada`
      })
      
      // Logar erro no sistema
      await supabase.from('system_errors').insert({
        title: `WhatsApp ${instanceName} desconectado`,
        module: 'followup',
        description: 'Instância de WhatsApp desconectada. Reconecte via QR Code.',
        severity: 'high',
        source: 'send-followup-whatsapp'
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          deal_id: body.deal_id,
          error: `Instância ${instanceName} desconectada. Reconecte o WhatsApp.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }
    
    // 2️⃣ Formatar número
    const phoneResult = formatBrazilianPhone(body.client_phone)
    
    if (!phoneResult.formatted) {
      console.error(`❌ Número inválido: ${phoneResult.error}`)
      
      await supabase.from('followup_logs').insert({
        deal_id: body.deal_id,
        followup_number: body.followup_number,
        status: 'failed',
        error_message: `Número inválido: ${phoneResult.error}`
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          deal_id: body.deal_id,
          error: `Número inválido: ${phoneResult.error}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // 3️⃣ Gerar mensagem de follow-up
    const message = generateFollowupMessage(
      body.followup_number,
      body.client_name,
      body.product_type || null,
      body.categoria || null,
      body.conversation_history || null
    )
    
    console.log(`📝 Mensagem gerada (${message.length} chars): "${message.substring(0, 100)}..."`)
    
    // 4️⃣ Enviar via Evolution API
    const sendResult = await sendWhatsAppMessage(
      evolutionUrl,
      evolutionApiKey,
      instanceName,
      phoneResult.formatted,
      message
    )
    
    if (!sendResult.success) {
      console.error(`❌ Falha no envio: ${sendResult.error}`)
      
      await supabase.from('followup_logs').insert({
        deal_id: body.deal_id,
        followup_number: body.followup_number,
        status: 'failed',
        error_message: sendResult.error
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          deal_id: body.deal_id,
          error: sendResult.error
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // 5️⃣ SUCESSO - Atualizar deal e logs
    console.log('✅ Mensagem enviada com sucesso! Atualizando histórico...')
    
    // Buscar deal atual
    const { data: deal } = await supabase
      .from('crm_deals')
      .select('conversation_history, followup_count')
      .eq('id', body.deal_id)
      .single()
    
    // Atualizar conversation_history
    const timestamp = formatBrasilDateTime(new Date())
    const newEntry = `🤖 IA (Follow-up ${body.followup_number}) [${timestamp}]: ${message}`
    const updatedHistory = deal?.conversation_history 
      ? `${deal.conversation_history}\n\n${newEntry}`
      : newEntry
    
    await supabase
      .from('crm_deals')
      .update({
        conversation_history: updatedHistory,
        followup_count: body.followup_number,
        last_followup_at: new Date().toISOString()
      })
      .eq('id', body.deal_id)
    
    // Registrar log de sucesso
    await supabase.from('followup_logs').upsert({
      deal_id: body.deal_id,
      followup_number: body.followup_number,
      status: 'sent',
      message_sent: message,
      sent_at: new Date().toISOString()
    }, { 
      onConflict: 'deal_id,followup_number',
      ignoreDuplicates: false 
    })
    
    // Registrar na timeline
    await supabase.from('crm_timeline').insert({
      deal_id: body.deal_id,
      message: `Follow-up automático #${body.followup_number} enviado via WhatsApp`,
      update_type: 'Sistema - Follow-up'
    })
    
    const elapsed = Date.now() - startTime
    console.log(`🏁 Concluído em ${elapsed}ms`)
    console.log('═══════════════════════════════════════════════════════════')
    
    return new Response(
      JSON.stringify({
        success: true,
        deal_id: body.deal_id,
        message_sent: message,
        messageId: sendResult.messageId,
        elapsed_ms: elapsed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error: any) {
    console.error('💥 Erro:', error)
    console.log('═══════════════════════════════════════════════════════════')
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
