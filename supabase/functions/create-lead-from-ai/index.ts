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
  conversation_history?: string
  ai_status?: string
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
      product_type: rawData.product_type || rawData.tipo_produto,
      pipeline_id: rawData.pipeline_id || rawData.funil_id,
      stage_id: rawData.stage_id || rawData.etapa_id,
      conversation_history: rawData.conversation_history || rawData.conversa_whatsapp || rawData.historico_conversa,
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
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', data.phone)
      .single()

    let clientId: string

    if (existingClient) {
      console.log('Cliente existente encontrado:', existingClient.id)
      clientId = existingClient.id
      
      // Atualizar dados do cliente se necessário
      await supabase
        .from('clients')
        .update({
          name: data.name,
          email: data.email,
          city: data.city,
          state: data.state,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
    } else {
      // 2. Criar novo cliente
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

    // 3. Buscar ou criar source_id
    let sourceId = null
    if (data.source) {
      const { data: sourceData } = await supabase
        .from('lead_sources')
        .select('id')
        .ilike('name', data.source)
        .single()
      
      sourceId = sourceData?.id || null
    }

    // 4. Criar lead
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert({
        client_id: clientId,
        source_id: sourceId,
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

    // 5. Criar deal no CRM Kanban
    let dealData = null
    
    // ID do funil padrão (Funil de Vendas Padrão)
    const defaultPipelineId = '34747cb5-063a-4369-b619-d4afa6095d0d'
    const pipelineId = data.pipeline_id || defaultPipelineId
    
    // Buscar primeira etapa do pipeline
    const { data: firstStage } = await supabase
      .from('crm_stages')
      .select('id')
      .eq('pipeline_id', pipelineId)
      .order('position', { ascending: true })
      .limit(1)
      .single()
    
    if (firstStage) {
      const { data: newDeal, error: dealError } = await supabase
        .from('crm_deals')
        .insert({
          pipeline_id: pipelineId,
          stage_id: data.stage_id || firstStage.id,
          lead_id: newLead.id,
          title: data.deal_title || `Lead ${data.name}`,
          value: data.deal_value || 0,
          product_type: data.product_type,
          conversation_history: data.conversation_history,
          ai_status: data.ai_status,
          status: 'aberto',
          from_ai: true
        })
        .select()
        .single()

      if (dealError) {
        console.error('Erro ao criar deal:', dealError)
      } else {
        console.log('✅ Deal criado no CRM Kanban:', newDeal.id)
        dealData = newDeal
      }
    } else {
      console.error('❌ Primeira etapa do funil não encontrada')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lead criado com sucesso',
        data: {
          client_id: clientId,
          lead_id: newLead.id,
          deal_id: dealData?.id || null
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ ERRO GERAL CAPTURADO:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: errorMessage,
        stack: error instanceof Error ? error.stack : 'N/A'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
