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

// Função para formatar conversa no formato esperado
function formatConversation(rawConversation: string | any): string {
  if (!rawConversation) return ''
  
  // Se é um array de mensagens estruturadas
  if (Array.isArray(rawConversation)) {
    return rawConversation.map(msg => {
      const sender = msg.sender === 'client' || msg.sender === 'cliente' ? '👤 Cliente' : '🤖 IA'
      return `${sender}: ${msg.message}`
    }).join('\n')
  }
  
  // Se é string
  const conversationStr = String(rawConversation)
  
  // Se já está formatado com emojis, retorna como está
  if (conversationStr.includes('👤 Cliente:') || conversationStr.includes('🤖 IA:')) {
    return conversationStr
  }
  
  // Se está formatado com CLIENT: e AI:
  if (conversationStr.includes('CLIENT:') || conversationStr.includes('AI:')) {
    return conversationStr
      .replace(/CLIENT:/g, '👤 Cliente:')
      .replace(/AI:/g, '🤖 IA:')
      .replace(/CLIENTE:/g, '👤 Cliente:')
      .replace(/IA:/g, '🤖 IA:')
  }
  
  // Tenta parsear a conversa identificando padrões comuns
  const lines = conversationStr.split('\n').filter(line => line.trim())
  const formattedMessages: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const message = lines[i].trim()
    if (!message) continue
    
    // Detecta padrões que indicam cliente vs IA
    const isClientMessage = 
      message.match(/^(olá|oi|bom dia|boa tarde|boa noite|gostaria|preciso|quanto|valor|preço)/i) ||
      message.includes('?') ||
      (message.length < 100 && !message.match(/^(claro|com certeza|perfeito|entendo|vou|posso)/i))
    
    if (isClientMessage) {
      formattedMessages.push(`👤 Cliente: ${message}`)
    } else {
      formattedMessages.push(`🤖 IA: ${message}`)
    }
  }
  
  return formattedMessages.join('\n')
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
    const formattedConversation = formatConversation(rawConversation)
    const detectedProductType = detectProductType(rawConversation)
    
    const data: LeadData = {
      name: rawData.name || rawData.nome,
      phone: (rawData.phone || rawData.contato_whatsapp || rawData.telefone || '')
        .replace('@s.whatsapp.net', '')
        .replace(/\D/g, ''), // Remove tudo que não é número
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
    console.log('🔍 Validando dados:', { name: data.name, phone: data.phone })
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
        // Lead novo: criar deals em todos os funis com "Lead"
        const { data: allPipelines } = await supabase
          .from('crm_pipelines')
          .select('id, name')
        
        if (allPipelines && allPipelines.length > 0) {
          console.log(`📋 Encontrados ${allPipelines.length} funis no sistema`)
          
          for (const pipeline of allPipelines) {
            const { data: firstStage } = await supabase
              .from('crm_stages')
              .select('id, name')
              .eq('pipeline_id', pipeline.id)
              .order('position', { ascending: true })
              .limit(1)
              .single()
            
            if (firstStage && firstStage.name.toLowerCase() === 'lead') {
              console.log(`✅ Funil "${pipeline.name}" tem primeira etapa "Lead" - criando deal...`)
              
              const { data: newDeal, error: dealError } = await supabase
                .from('crm_deals')
                .insert({
                  pipeline_id: pipeline.id,
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
                console.error(`❌ Erro ao criar deal no funil "${pipeline.name}":`, dealError)
              } else {
                console.log(`✅ Deal criado no funil "${pipeline.name}":`, newDeal.id)
                dealIds.push(newDeal.id)
              }
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
