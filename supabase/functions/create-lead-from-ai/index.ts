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
  
  // Remove @lid, @s.whatsapp.net e caracteres especiais
  let cleaned = raw
    .replace(/@lid/gi, '')
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/\n/g, '')
    .trim()
  
  // Extrai apenas números
  let phone = cleaned.replace(/\D/g, '')
  console.log('📞 Após remover não-numéricos:', phone)
  
  // Se é muito longo, tenta várias abordagens para extrair número válido
  if (phone.length > 13) {
    console.log('⚠️ Número muito longo, tentando extrair número brasileiro válido...')
    
    // Abordagem 1: Procura padrão brasileiro 55 + DDD(2) + 9 + 8dígitos
    let match = phone.match(/55[1-9]\d9\d{8}/)
    if (match) {
      phone = match[0]
      console.log('✅ Padrão 55+DDD+9+8 encontrado:', phone)
    } else {
      // Abordagem 2: Procura padrão 55 + 10-11 dígitos
      match = phone.match(/55\d{10,11}/)
      if (match) {
        phone = match[0]
        console.log('✅ Padrão 55+10-11 encontrado:', phone)
      } else {
        // Abordagem 3: Procura DDD válido + 8-9 dígitos (DDDs válidos: 11-99)
        match = phone.match(/([1-9][1-9])(9?\d{8})/)
        if (match) {
          phone = '55' + match[1] + match[2]
          console.log('✅ Padrão DDD+número encontrado, adicionado 55:', phone)
        } else {
          // Fallback: últimos 11 dígitos (DDD + número)
          const last11 = phone.slice(-11)
          if (last11.length === 11 && /^[1-9][1-9]/.test(last11)) {
            phone = '55' + last11
            console.log('⚠️ Usando últimos 11 dígitos + 55:', phone)
          } else {
            // Último recurso: últimos 10-11 dígitos
            phone = phone.slice(-11)
            if (!phone.startsWith('55')) {
              phone = '55' + phone.slice(-10)
            }
            console.log('⚠️ Fallback final:', phone)
          }
        }
      }
    }
  }
  
  // Remove prefixo 55 duplicado
  while (phone.startsWith('5555')) {
    phone = phone.slice(2)
    console.log('📞 Removido 55 duplicado:', phone)
  }
  
  // Adiciona 55 se não tiver e tem tamanho válido
  if (!phone.startsWith('55') && phone.length >= 10 && phone.length <= 11) {
    phone = '55' + phone
    console.log('📞 Adicionado prefixo 55:', phone)
  }
  
  // Validação final: deve ter 12-13 dígitos (55 + DDD + 8-9)
  if (phone.length < 12 || phone.length > 13) {
    console.log(`⚠️ Telefone com comprimento inválido (${phone.length}), tentando ajustar...`)
    
    // Se tem 10 dígitos, adiciona 55
    if (phone.length === 10 && !phone.startsWith('55')) {
      phone = '55' + phone
    }
    // Se tem 11 dígitos e não começa com 55, adiciona 55
    else if (phone.length === 11 && !phone.startsWith('55')) {
      phone = '55' + phone
    }
  }
  
  console.log('✅ Telefone final:', phone, '| Comprimento:', phone.length)
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

// ============= FUNÇÕES AUXILIARES DE DETECÇÃO =============

// Detecta padrões onde mensagem do cliente colou com resposta da IA
function findAllJunctionPoints(text: string): number[] {
  const points: number[] = []
  
  // Padrões de resposta da IA que geralmente seguem mensagem do cliente
  const aiResponsePatterns = [
    /(?<=[a-záéíóúãõç]{2,}\d*m?)(?=Tudo bem|Olá|Oi,?\s|Certo|Claro|Ok,?\s|Entendi|Perfeito|Com certeza|Ótimo|Maravilha|Aqui na|Vou|Posso|Deixa eu|Vamos|Temos|Nossa|Excelente|Legal|Que bom)/gi,
    /(?<=\?|!|\.)(?=\s*[A-ZÁÉÍÓÚÃÕÇ][a-záéíóúãõç]+)/g,
    /(?<=[0-9]+(?:\.\d+)?m?\s*)(?=[A-ZÁÉÍÓÚÃÕÇ][a-z]{3,})/g,
    /(?<=bemmm?|simm?|nãoo?|okk?)(?=[A-ZÁÉÍÓÚÃÕÇ])/gi
  ]
  
  for (const pattern of aiResponsePatterns) {
    let match
    const regex = new RegExp(pattern.source, pattern.flags)
    while ((match = regex.exec(text)) !== null) {
      if (match.index > 2 && !points.includes(match.index)) {
        points.push(match.index)
      }
    }
  }
  
  // Padrões de resposta do cliente após IA
  const clientResponsePatterns = [
    /(?<=\?)\s*(?=[a-záéíóúãõç]{2,})/gi,
    /(?<=ambiente\?|planta\?|referência\?|projeto\?|medida\?)\s*(?=[A-Za-záéíóúãõç])/gi
  ]
  
  for (const pattern of clientResponsePatterns) {
    let match
    const regex = new RegExp(pattern.source, pattern.flags)
    while ((match = regex.exec(text)) !== null) {
      if (match.index > 2 && !points.includes(match.index)) {
        points.push(match.index)
      }
    }
  }
  
  return points.sort((a, b) => a - b)
}

// Detecta se texto parece ser início de mensagem de cliente
function seemsClientStart(text: string): boolean {
  const clientIndicators = [
    /^(olá|oi|bom dia|boa tarde|boa noite)/i,
    /^(quero|preciso|gostaria|quanto|qual|tem|vocês|posso)/i,
    /^(me\s+|como\s+|quando\s+|onde\s+)/i,
    /^(sim|não|ok|pode|metalon|madeira|branco|preto)/i,
    /^[a-z]/,  // Começa com minúscula (cliente responde informalmente)
    /^\d+(\.\d+)?m?\s*$/  // Apenas medida (ex: "2.20m")
  ]
  
  return clientIndicators.some(pattern => pattern.test(text.trim()))
}

// Detecta se texto parece ser início de mensagem da IA
function seemsAIStart(text: string): boolean {
  const aiIndicators = [
    /^(Certo|Claro|Ok,?\s|Entendi|Perfeito|Com certeza|Ótimo|Maravilha|Excelente)/i,
    /^(Olá!?\s+[A-Z]|Oi!?\s+[A-Z]|Bom dia!?\s+[A-Z])/i,
    /^(Temos|Possuímos|Oferecemos|Trabalhamos|Aqui na|Vou|Para)/i,
    /^(Posso|Deixa eu|Deixe-me|Vamos|Pra gente|Você tem)/i,
    /^(Tudo bem)/i,
    /(tendenci|nossa loja|nossos produtos|nosso catálogo)/i,
    /^[A-ZÁÉÍÓÚÃÕÇ][a-z]{4,}/  // Começa com maiúscula seguida de minúsculas
  ]
  
  return aiIndicators.some(pattern => pattern.test(text.trim()))
}

// Algoritmo de separação inteligente melhorado
function smartSplitConversation(text: string): {sender: string, message: string}[] {
  console.log('🧠 Iniciando separação inteligente v2...')
  console.log('📝 Texto original (primeiros 500):', text.slice(0, 500))
  
  const messages: {sender: string, message: string}[] = []
  
  // Encontrar todos os pontos de junção
  const junctionPoints = findAllJunctionPoints(text)
  console.log('🎯 Pontos de junção encontrados:', junctionPoints)
  
  if (junctionPoints.length === 0) {
    // Sem pontos de junção, verificar se tem quebras de linha
    if (text.includes('\n')) {
      const lines = text.split('\n').filter(l => l.trim())
      let lastSender = 'client'
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        
        // Detectar quem está falando
        const isAI = seemsAIStart(trimmed)
        const sender = isAI ? 'ai' : lastSender
        
        messages.push({ sender, message: trimmed })
        lastSender = sender === 'ai' ? 'client' : 'ai'
      }
      
      return messages
    }
    
    // Texto contínuo sem separações - assume que é tudo misturado
    return [{ sender: 'ai', message: text }]
  }
  
  // Separar pelos pontos encontrados
  let lastEnd = 0
  let currentSender = 'client' // Cliente geralmente inicia
  
  for (let i = 0; i < junctionPoints.length; i++) {
    const point = junctionPoints[i]
    const segment = text.slice(lastEnd, point).trim()
    
    if (segment) {
      // Verificar se o conteúdo parece ser de IA ou cliente
      const segmentIsAI = seemsAIStart(segment)
      const segmentIsClient = seemsClientStart(segment) && !segmentIsAI
      
      // Usar detecção ou alternância
      if (segmentIsAI) {
        currentSender = 'ai'
      } else if (segmentIsClient) {
        currentSender = 'client'
      }
      
      messages.push({ sender: currentSender, message: segment })
      
      // Alternar para próximo
      currentSender = currentSender === 'ai' ? 'client' : 'ai'
    }
    
    lastEnd = point
  }
  
  // Adicionar segmento final
  const lastSegment = text.slice(lastEnd).trim()
  if (lastSegment) {
    const lastIsAI = seemsAIStart(lastSegment)
    messages.push({ 
      sender: lastIsAI ? 'ai' : currentSender, 
      message: lastSegment 
    })
  }
  
  console.log(`✅ Separação v2 concluída: ${messages.length} mensagens detectadas`)
  messages.forEach((m, i) => console.log(`  ${i+1}. [${m.sender}]: ${m.message.slice(0, 60)}...`))
  
  return messages
}

// ============= FUNÇÃO PRINCIPAL DE FORMATAÇÃO =============

function formatConversation(rawConversation: string | any): string {
  console.log('💬 Formatando conversa. Tipo:', typeof rawConversation)
  console.log('💬 Input (primeiros 300 chars):', String(rawConversation).slice(0, 300))
  
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
  
  // ============= NOVA ESTRATÉGIA: SEPARAÇÃO INTELIGENTE =============
  
  console.log('🧠 Aplicando algoritmo de separação inteligente...')
  
  // Aplicar separação inteligente
  const separatedMessages = smartSplitConversation(conversationStr)
  
  if (separatedMessages.length > 0) {
    console.log('✅ Mensagens separadas com sucesso')
    const formatted = separatedMessages.map(msg => {
      const sender = msg.sender === 'client' ? '👤 Cliente' : '🤖 IA'
      return `${sender}: ${msg.message}`
    }).join('\n\n')
    
    console.log('✅ Conversa formatada (primeiros 300 chars):', formatted.slice(0, 300))
    return formatted
  }
  
  // ============= FALLBACK: ESTRATÉGIA ORIGINAL MELHORADA =============
  
  console.log('⚠️ Usando fallback de heurística por linhas')
  const lines = conversationStr.split('\n').filter(line => line.trim())
  const formattedMessages: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const message = lines[i].trim()
    if (!message) continue
    
    // Usar detecção semântica melhorada
    const isClientMessage = seemsClientStart(message)
    const isAIMessage = seemsAIStart(message)
    
    // Decidir sender
    let sender: string
    if (isClientMessage && !isAIMessage) {
      sender = '👤 Cliente'
    } else if (isAIMessage && !isClientMessage) {
      sender = '🤖 IA'
    } else {
      // Ambíguo - usar alternância
      sender = i % 2 === 0 ? '👤 Cliente' : '🤖 IA'
    }
    
    formattedMessages.push(`${sender}: ${message}`)
  }
  
  const result = formattedMessages.join('\n\n')
  console.log('✅ Conversa formatada via fallback (primeiros 300 chars):', result.slice(0, 300))
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
    
    // Validar formato de telefone brasileiro (10-13 dígitos)
    // 10 = DDD + 8 dígitos (fixo antigo)
    // 11 = DDD + 9 dígitos (celular)
    // 12 = 55 + DDD + 8 dígitos
    // 13 = 55 + DDD + 9 dígitos
    const phoneDigits = data.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      console.error('❌ Telefone com comprimento inválido:', phoneDigits.length)
      console.log('⚠️ AVISO: Telefone rejeitado, mas continuando para log do problema')
      return new Response(
        JSON.stringify({ 
          error: 'Telefone brasileiro inválido',
          received: data.phone,
          originalReceived: rawPhone,
          expectedLength: '10-13 dígitos',
          tip: 'Formato esperado: 5511999999999 (55 + DDD + número). Verifique se está enviando o número real e não o LID do WhatsApp.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Garantir que telefone tenha prefixo 55
    if (phoneDigits.length === 10 || phoneDigits.length === 11) {
      data.phone = '55' + phoneDigits
      console.log('📞 Adicionado 55 ao telefone final:', data.phone)
    } else {
      data.phone = phoneDigits
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
        // Lead novo: criar deal em TODOS os pipelines que têm etapa "Lead"
        const { data: allPipelines } = await supabase
          .from('crm_pipelines')
          .select('id, name')
          .order('created_at', { ascending: true })
        
        if (allPipelines && allPipelines.length > 0) {
          console.log(`📋 Encontrados ${allPipelines.length} pipeline(s) no sistema`)
          
          for (const pipeline of allPipelines) {
            // Buscar a etapa "Lead" neste pipeline
            const { data: leadStage } = await supabase
              .from('crm_stages')
              .select('id, name')
              .eq('pipeline_id', pipeline.id)
              .ilike('name', '%lead%')
              .order('position', { ascending: true })
              .limit(1)
              .maybeSingle()
            
            // Se não tiver etapa "Lead", pegar a primeira etapa
            let stageToUse = leadStage
            if (!stageToUse) {
              const { data: firstStage } = await supabase
                .from('crm_stages')
                .select('id, name')
                .eq('pipeline_id', pipeline.id)
                .order('position', { ascending: true })
                .limit(1)
                .maybeSingle()
              stageToUse = firstStage
            }
            
            if (stageToUse) {
              console.log(`✅ Criando deal no funil "${pipeline.name}" na etapa "${stageToUse.name}"`)
              
              const { data: newDeal, error: dealError } = await supabase
                .from('crm_deals')
                .insert({
                  pipeline_id: pipeline.id,
                  stage_id: stageToUse.id,
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
                console.error(`❌ Erro ao criar deal no funil "${pipeline.name}":`, dealError)
              } else {
                console.log(`✅ Deal criado no funil "${pipeline.name}":`, newDeal.id)
                dealIds.push(newDeal.id)
              }
            } else {
              console.log(`⚠️ Pipeline "${pipeline.name}" não possui etapas, pulando...`)
            }
          }
        }
      } else {
        // Lead existente: atualizar deals existentes E criar em pipelines faltantes
        const { data: existingDeals } = await supabase
          .from('crm_deals')
          .select('id, conversation_history, pipeline_id')
          .eq('lead_id', leadId)
          .eq('status', 'aberto')
        
        // Identificar pipelines que já possuem deal
        const pipelinesWithDeal = new Set(existingDeals?.map(d => d.pipeline_id) || [])
        console.log(`📊 Lead existente possui deals em ${pipelinesWithDeal.size} pipeline(s)`)
        
        // Atualizar deals existentes
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
        
        // Buscar todos os pipelines e criar deals nos que estão faltando
        const { data: allPipelines } = await supabase
          .from('crm_pipelines')
          .select('id, name')
        
        if (allPipelines && allPipelines.length > 0) {
          const missingPipelines = allPipelines.filter(p => !pipelinesWithDeal.has(p.id))
          console.log(`📊 Pipelines faltando deal: ${missingPipelines.length}`)
          
          for (const pipeline of missingPipelines) {
            // Buscar etapas do pipeline
            const { data: stages } = await supabase
              .from('crm_stages')
              .select('id, name, position')
              .eq('pipeline_id', pipeline.id)
              .order('position', { ascending: true })
            
            if (stages && stages.length > 0) {
              // Priorizar etapa "Lead", senão usar a primeira
              const leadStage = stages.find(s => s.name.toLowerCase() === 'lead')
              const stageToUse = leadStage || stages[0]
              
              console.log(`✅ Criando deal no funil "${pipeline.name}" para lead existente`)
              
              const { data: newDeal, error: dealError } = await supabase
                .from('crm_deals')
                .insert({
                  pipeline_id: pipeline.id,
                  stage_id: stageToUse.id,
                  lead_id: leadId,
                  title: `Lead ${cleanedName}`,
                  value: 0,
                  categoria: 'Móveis Soltos',
                  centro_custo: 'Industrial',
                  tipo_produto: detectedProductType,
                  product_type: detectedProductType,
                  conversation_history: newMessages,
                  status: 'aberto',
                  from_ai: true
                })
                .select()
                .single()
              
              if (dealError) {
                console.error(`❌ Erro ao criar deal no funil "${pipeline.name}":`, dealError)
              } else {
                console.log(`✅ Deal criado no funil "${pipeline.name}":`, newDeal.id)
                dealIds.push(newDeal.id)
              }
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
