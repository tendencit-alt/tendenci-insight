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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const rawData: any = await req.json()

    console.log('Recebendo dados da IA:', rawData)

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
      temperature: (rawData.temperature || rawData.temperatura || 'frio').toLowerCase(),
      deal_title: rawData.deal_title || rawData.titulo_negocio,
      deal_value: rawData.deal_value || rawData.valor_negocio,
      product_type: rawData.product_type || rawData.tipo_produto,
      pipeline_id: rawData.pipeline_id || rawData.funil_id,
      stage_id: rawData.stage_id || rawData.etapa_id,
      conversation_history: rawData.conversation_history || rawData.conversa_whatsapp || rawData.historico_conversa,
      ai_status: rawData.ai_status || rawData.status_ia
    }

    // Validações básicas
    if (!data.name || !data.phone) {
      return new Response(
        JSON.stringify({ 
          error: 'Nome e telefone são obrigatórios',
          received: { name: data.name, phone: data.phone },
          tip: 'Envie os campos como "name" ou "nome" e "phone" ou "contato_whatsapp"'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // 5. Criar deal (se informações fornecidas)
    let dealData = null
    if (data.deal_title && data.pipeline_id) {
      // Se stage_id não fornecido, busca primeira etapa do pipeline
      let stageId = data.stage_id
      if (!stageId) {
        const { data: firstStage } = await supabase
          .from('crm_stages')
          .select('id')
          .eq('pipeline_id', data.pipeline_id)
          .order('position', { ascending: true })
          .limit(1)
          .single()
        
        stageId = firstStage?.id
      }

      if (stageId) {
        const { data: newDeal, error: dealError } = await supabase
          .from('crm_deals')
          .insert({
            pipeline_id: data.pipeline_id,
            stage_id: stageId,
            lead_id: newLead.id,
            title: data.deal_title,
            value: data.deal_value || 0,
            product_type: data.product_type,
            conversation_history: data.conversation_history,
            ai_status: data.ai_status,
            status: 'aberto'
          })
          .select()
          .single()

        if (dealError) {
          console.error('Erro ao criar deal:', dealError)
        } else {
          console.log('Deal criado:', newDeal.id)
          dealData = newDeal
        }
      }
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
    console.error('Erro geral:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
