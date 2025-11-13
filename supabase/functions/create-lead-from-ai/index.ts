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

    // 4. Verificar se já existe lead para este cliente
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, temperature')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let leadId: string
    let isNewLead = false

    if (existingLead) {
      console.log('Lead existente encontrado:', existingLead.id)
      leadId = existingLead.id
      
      // Atualizar temperatura se mudou
      if (data.temperature && data.temperature !== existingLead.temperature) {
        await supabase
          .from('leads')
          .update({ temperature: data.temperature })
          .eq('id', leadId)
        console.log('Temperatura atualizada para:', data.temperature)
      }
    } else {
      // Criar novo lead
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
      leadId = newLead.id
      isNewLead = true
    }

    // 5. Atualizar conversation_history nos deals existentes OU criar novos deals
    const dealIds: string[] = []
    
    if (data.conversation_history) {
      // Formatar nova mensagem
      const newMessages = data.conversation_history.trim()
      
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
                  tipo_produto: data.product_type || 'Sofá',
                  product_type: data.product_type || 'Sofá',
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
                console.log(`✅ Deal ${deal.id} atualizado com novas mensagens`)
                dealIds.push(deal.id)
              }
            } else {
              console.log(`⏭️ Deal ${deal.id} já contém estas mensagens - ignorando`)
              dealIds.push(deal.id)
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isNewLead 
          ? `Lead criado com sucesso em ${dealIds.length} funil(is)` 
          : `Lead existente atualizado em ${dealIds.length} deal(s)`,
        data: {
          client_id: clientId,
          lead_id: leadId,
          deal_ids: dealIds,
          is_new_lead: isNewLead,
          deals_affected: dealIds.length
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
