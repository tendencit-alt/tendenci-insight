import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'
import { corsHeaders } from '../_shared/cors.ts'

interface LeadData {
  // Dados do cliente
  name: string
  phone: string
  email?: string
  city?: string
  state?: string
  
  // Dados do lead
  source?: string // "Instagram" | "WhatsApp" | "Meta Ads" | "Indicação" | "Outros"
  temperature?: string // "frio" | "morno" | "quente"
  
  // Dados do negócio (opcional - se quiser criar deal direto)
  deal_title?: string
  deal_value?: number
  product_type?: string // "Planejado" | "Móvel"
  pipeline_id?: string // UUID do funil
  stage_id?: string // UUID da etapa inicial
  conversation_history?: string | Array<{sender: string, message: string}> // String formatada OU array estruturado
  ai_status?: string
}

// Função para limpar e validar números de telefone
function cleanPhone(raw: string): string {
  console.log('📞 Limpando telefone. Input:', raw)
  
  // Remove @s.whatsapp.net e caracteres não numéricos
  let phone = raw.replace('@s.whatsapp.net', '').replace(/\D/g, '')
  console.log('📞 Após remover não-numéricos:', phone)
  
  // Se tem mais de 13 dígitos, é provavelmente um JID do WhatsApp
  if (phone.length > 13) {
    console.log('⚠️ Número muito longo (JID detectado), tentando extrair número brasileiro válido...')
    
    // Tenta extrair número brasileiro válido (55 + DDD + 8 ou 9 dígitos)
    const match = phone.match(/55\d{10,11}$/)
    if (match) {
      phone = match[0]
      console.log('✅ Número brasileiro extraído:', phone)
    } else {
      // Fallback: pega os últimos 11-13 dígitos
      phone = phone.slice(-13)
      console.log('⚠️ Usando fallback (últimos 13 dígitos):', phone)
    }
  }
  
  // Remove prefixo 55 duplicado
  if (phone.startsWith('5555')) {
    phone = phone.slice(2)
    console.log('📞 Removido 55 duplicado:', phone)
  }
  
  // Adiciona 55 se não tiver
  if (!phone.startsWith('55') && phone.length >= 10) {
    phone = '55' + phone
    console.log('📞 Adicionado prefixo 55:', phone)
  }
  
  console.log('✅ Telefone final:', phone)
  return phone
}

// Função para detectar tipo de produto baseado na conversa
function detectProductType(conversation: string): string {
  const lowerConv = conversation.toLowerCase()
  
  // Mapeamento de palavras-chave para tipos de produto
  const productKeywords: { [key: string]: string[] } = {
    'Sofá': ['sofá', 'sofa', 'sofas', 'sofás'],
    'Poltrona': ['poltrona', 'poltronas'],
    'Mesa': ['mesa', 'mesas'],
    'Cadeira': ['cadeira', 'cadeiras'],
    'Aparador': ['aparador', 'aparadores'],
    'Banqueta': ['banqueta', 'banquetas', 'banco'],
    'Rack': ['rack', 'racks', 'estante tv'],
    'Cristaleira': ['cristaleira', 'cristaleiras'],
    'Estante': ['estante', 'estantes', 'estanteria'],
    'Vaso': ['vaso', 'vasos'],
    'Quadro': ['quadro', 'quadros'],
    'Chaise': ['chaise'],
  }
  
  // Procura por cada palavra-chave
  for (const [product, keywords] of Object.entries(productKeywords)) {
    for (const keyword of keywords) {
      if (lowerConv.includes(keyword)) {
        console.log(`🔍 Tipo de produto detectado: "${product}" (keyword: "${keyword}")`)
        return product
      }
    }
  }
  
  console.log('⚠️ Tipo de produto não detectado, usando "Personalizado" como padrão')
  return 'Personalizado'
}

// Função para formatar conversa com alternância forçada
function formatConversation(rawConversation: string | any): string {
  console.log('💬 Formatando conversa. Tipo:', typeof rawConversation)
  console.log('💬 Input (primeiros 200 chars):', String(rawConversation).slice(0, 200))
  
  if (!rawConversation) return ''
  
  // Se é um array de mensagens estruturadas do n8n
  if (Array.isArray(rawConversation)) {
    console.log('✅ Array estruturado detectado')
    return rawConversation.map(msg => {
      const isClient = msg.sender === 'client' || msg.sender === 'cliente' || msg.role === 'user'
      const sender = isClient ? '👤 Cliente' : '🤖 IA'
      const content = msg.message || msg.content || ''
      return `${sender}: ${content}`
    }).join('\n\n')
  }
  
  // Converter para string
  const conversationStr = String(rawConversation)
  
  // Se já está formatado com emojis, retorna como está
  if (conversationStr.includes('👤 Cliente:') && conversationStr.includes('🤖 IA:')) {
    console.log('✅ Já formatado com emojis')
    return conversationStr
  }
  
  // Se está formatado com CLIENT: e AI:
  if (conversationStr.includes('CLIENT:') || conversationStr.includes('AI:')) {
    console.log('✅ Formatado com CLIENT:/AI:, convertendo...')
    return conversationStr
      .replace(/CLIENT:/g, '👤 Cliente:')
      .replace(/AI:/g, '🤖 IA:')
      .replace(/CLIENTE:/g, '👤 Cliente:')
      .replace(/IA:/g, '🤖 IA:')
  }
  
  // Estratégia avançada: detectar padrões de separação natural
  console.log('🔍 Aplicando estratégia de alternância forçada...')
  
  // Tenta separar por perguntas seguidas de respostas
  const segments = conversationStr.split(/(?<=\?)\s+(?=[A-ZÁÉÍÓÚ])/g)
  
  if (segments.length > 1) {
    console.log(`✅ Detectados ${segments.length} segmentos por separação de perguntas`)
    return segments.map((seg, i) => {
      const isClient = i % 2 === 0 // Alternância: cliente pergunta, IA responde
      return `${isClient ? '👤 Cliente' : '🤖 IA'}: ${seg.trim()}`
    }).join('\n\n')
  }
  
  // Fallback: quebrar por linhas e usar heurística
  console.log('⚠️ Usando fallback de heurística por linhas')
  const lines = conversationStr.split('\n').filter(line => line.trim())
  const formattedMessages: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const message = lines[i].trim()
    if (!message) continue
    
    // Heurística melhorada para detectar cliente vs IA
    const isClientMessage = 
      message.match(/^(olá|oi|ola|bom dia|boa tarde|boa noite|gostaria|preciso|quanto|quero|valor|preço|tem|possui)/i) ||
      message.includes('?') ||
      (message.length < 150 && !message.match(/^(claro|com certeza|perfeito|entendo|vou|posso|aqui|segue)/i))
    
    // Alternância forçada se detectar múltiplas mensagens curtas
    const forceAlternation = lines.length > 3 && message.length < 100
    
    if (forceAlternation) {
      // Força alternância: ímpar = cliente, par = IA
      const sender = i % 2 === 0 ? '👤 Cliente' : '🤖 IA'
      formattedMessages.push(`${sender}: ${message}`)
    } else if (isClientMessage) {
      formattedMessages.push(`👤 Cliente: ${message}`)
    } else {
      formattedMessages.push(`🤖 IA: ${message}`)
    }
  }
  
  const result = formattedMessages.join('\n\n')
  console.log('✅ Conversa formatada (primeiros 200 chars):', result.slice(0, 200))
  return result
}

Deno.serve(async (req) => {
  console.log('🚀 Edge Function create-lead-from-ai iniciada')
  console.log('📥 Método HTTP:', req.method)
  console.log('📍 URL:', req.url)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo a OPTIONS (CORS preflight)')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    console.log('✅ Usando SERVICE_ROLE_KEY para bypass RLS')
    console.log('🔗 Supabase URL:', supabaseUrl)
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Log do body raw
    const bodyText = await req.text()
    console.log('📦 Body recebido (raw):', bodyText)
    
    let rawData: any
    try {
      rawData = JSON.parse(bodyText)
      console.log('✅ JSON parseado com sucesso')
      console.log('📋 Dados parseados:', JSON.stringify(rawData, null, 2))
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'JSON inválido',
          details: parseError instanceof Error ? parseError.message : 'Erro desconhecido',
          received: bodyText
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalizar campos para aceitar português e inglês
    const rawConversation = rawData.conversation_history || rawData.conversa_whatsapp || rawData.historico_conversa || ''
    console.log('📝 Conversa raw recebida (primeiros 300 chars):', String(rawConversation).slice(0, 300))
    
    const formattedConversation = formatConversation(rawConversation)
    const detectedProductType = detectProductType(String(rawConversation))
    
    // Limpar e validar telefone
    const rawPhone = rawData.phone || rawData.contato_whatsapp || rawData.telefone || ''
    console.log('📞 Telefone raw recebido:', rawPhone)
    const cleanedPhone = cleanPhone(rawPhone)
    
    // Limpar nome (remover caracteres especiais excessivos)
    const rawName = rawData.name || rawData.nome || ''
    const cleanedName = rawName.trim().replace(/[^\w\sÀ-ÿ]/g, ' ').replace(/\s+/g, ' ')
    console.log('👤 Nome raw:', rawName, '→ Nome limpo:', cleanedName)
    
    const data: LeadData = {
      name: cleanedName,
      phone: cleanedPhone,
      email: rawData.email,
      city: rawData.city || rawData.cidade,
      state: rawData.state || rawData.estado,
      source: rawData.source || rawData.origem,
      temperature: (rawData.temperature || rawData.temperatura || 'frio')
        .replace(/^=/, '') // Remove "=" do início (sintaxe do n8n)
        .toLowerCase()
        .trim(),
      deal_title: rawData.deal_title || rawData.titulo_negocio,
      deal_value: rawData.deal_value || rawData.valor_negocio,
      product_type: rawData.product_type || rawData.tipo_produto || detectedProductType,
      pipeline_id: rawData.pipeline_id || rawData.funil_id,
      stage_id: rawData.stage_id || rawData.etapa_id,
      conversation_history: formattedConversation,
      ai_status: rawData.ai_status || rawData.status_ia
    }

    // Validações básicas
    console.log('🔍 Validando dados finais:', { name: data.name, phone: data.phone, phoneLength: data.phone.length })
    
    if (!data.name || !data.phone) {
      console.error('❌ Validação falhou - Nome ou telefone ausente')
      return new Response(
        JSON.stringify({ 
          error: 'Nome e telefone são obrigatórios',
          received: { name: data.name, phone: data.phone },
          rawData: rawData,
          tip: 'Envie os campos como "name" ou "nome" e "phone" ou "contato_whatsapp"'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validar formato de telefone brasileiro (11-13 dígitos com 55)
    if (data.phone.length < 11 || data.phone.length > 13) {
      console.error('❌ Telefone com comprimento inválido:', data.phone.length)
      return new Response(
        JSON.stringify({ 
          error: 'Telefone brasileiro inválido',
          received: data.phone,
          expectedLength: '11-13 dígitos',
          tip: 'Formato esperado: 5511999999999 (55 + DDD + número)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('✅ Validação passou')

    // 1. Verificar se cliente já existe pelo telefone
    console.log('🔎 Buscando cliente com telefone:', data.phone)
    const { data: existingClient, error: clientSearchError } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', data.phone)
      .maybeSingle()

    if (clientSearchError) {
      console.error('Erro ao buscar cliente:', clientSearchError)
    }

    let clientId: string

    if (existingClient) {
      console.log('Cliente existente encontrado:', existingClient.id)
      clientId = existingClient.id
    } else {
      // 2. Criar novo cliente se não existir
      console.log('Cliente não existe, criando novo...')
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: data.name,
          phone: data.phone,
          email: data.email,
          city: data.city,
          state: data.state
        })
        .select()
        .single()

      if (clientError) {
        console.error('Erro ao criar cliente:', clientError)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar cliente', details: clientError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Cliente criado:', newClient.id)
      clientId = newClient.id
    }

    // 3. Verificar se lead já existe para esse cliente
    console.log('🔎 Buscando lead existente para cliente:', clientId)
    const { data: existingLead, error: leadSearchError } = await supabase
      .from('leads')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle()

    if (leadSearchError) {
      console.error('Erro ao buscar lead:', leadSearchError)
    }

    let leadId: string
    let isNewLead = false

    if (existingLead) {
      console.log('Lead existente encontrado:', existingLead.id)
      leadId = existingLead.id
      
      // Atualizar temperatura do lead se mudou
      if (data.temperature) {
        await supabase
          .from('leads')
          .update({ temperature: data.temperature })
          .eq('id', leadId)
      }
    } else {
      // 4. Criar novo lead
      console.log('Lead não existe, criando novo...')
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          client_id: clientId,
          source_id: null,
          temperature: data.temperature || 'frio',
          status: 'novo'
        })
        .select()
        .single()

      if (leadError) {
        console.error('Erro ao criar lead:', leadError)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar lead', details: leadError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Lead criado:', newLead.id)
      leadId = newLead.id
      isNewLead = true
    }

    // 5. Atualizar conversation_history nos deals existentes OU criar novos deals
    const dealIds: string[] = []
    
    if (data.conversation_history) {
      // Garantir que conversation_history seja string
      const newMessages = typeof data.conversation_history === 'string' 
        ? data.conversation_history.trim() 
        : data.conversation_history
      
      if (isNewLead) {
        // Lead novo: criar deal APENAS no primeiro pipeline encontrado
        const { data: firstPipeline } = await supabase
          .from('crm_pipelines')
          .select('id, name')
          .order('created_at', { ascending: true })
          .limit(1)
          .single()
        
        if (firstPipeline) {
          const { data: firstStage } = await supabase
            .from('crm_stages')
            .select('id, name')
            .eq('pipeline_id', firstPipeline.id)
            .order('position', { ascending: true })
            .limit(1)
            .single()
          
          if (firstStage) {
            console.log(`✅ Criando deal no funil "${firstPipeline.name}" na etapa "${firstStage.name}"`)
            
            const { data: newDeal, error: dealError } = await supabase
              .from('crm_deals')
              .insert({
                pipeline_id: firstPipeline.id,
                stage_id: firstStage.id,
                lead_id: leadId,
                title: data.deal_title || `Lead ${data.name}`,
                value: data.deal_value || 0,
                categoria: 'Móveis Soltos',
                centro_custo: 'Industrial',
                tipo_produto: data.product_type || detectedProductType,
                product_type: data.product_type || detectedProductType,
                conversation_history: newMessages,
                ai_status: data.ai_status,
                status: 'aberto',
                from_ai: true
              })
              .select()
              .single()

            if (dealError) {
              console.error(`❌ Erro ao criar deal no funil "${firstPipeline.name}":`, dealError)
            } else {
              console.log(`✅ Deal criado no funil "${firstPipeline.name}":`, newDeal.id)
              dealIds.push(newDeal.id)
            }
          }
        }
      } else {
        // Lead existente: atualizar conversation_history em todos os deals
        const { data: existingDeals } = await supabase
          .from('crm_deals')
          .select('id, conversation_history')
          .eq('lead_id', leadId)
          .eq('status', 'aberto')
        
        if (existingDeals && existingDeals.length > 0) {
          console.log(`🔄 Atualizando ${existingDeals.length} deal(s) existente(s)`)
          
          for (const deal of existingDeals) {
            const currentHistory = deal.conversation_history || ''
            
            // Verificar se a mensagem já existe para evitar duplicatas
            if (!currentHistory.includes(newMessages)) {
              const updatedHistory = currentHistory 
                ? `${currentHistory}\n\n${newMessages}`
                : newMessages
              
              const { error: updateError } = await supabase
                .from('crm_deals')
                .update({ 
                  conversation_history: updatedHistory,
                  last_interaction: new Date().toISOString()
                })
                .eq('id', deal.id)
              
              if (updateError) {
                console.error(`❌ Erro ao atualizar deal ${deal.id}:`, updateError)
              } else {
                console.log(`✅ Deal ${deal.id} atualizado com sucesso`)
                dealIds.push(deal.id)
              }
            } else {
              console.log(`ℹ️ Deal ${deal.id} já possui esta mensagem, pulando...`)
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: isNewLead ? 'Lead e negócio(s) criado(s) com sucesso' : 'Lead existente atualizado',
        data: {
          clientId,
          leadId,
          dealIds,
          isNew: isNewLead,
          detectedProductType: detectedProductType
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
