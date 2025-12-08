import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessTaskRequest {
  taskId?: string
  tarefa_id?: string  // Compatibilidade com n8n
  origem_modulo?: string  // 'crm' ou 'prospeccao'
}

// Função para formatar número de telefone brasileiro
function formatBrazilianPhone(phone: string): { formatted: string | null; error?: string; original: string } {
  const original = phone
  let clean = phone.replace(/\D/g, '')
  
  console.log(`📱 Formatando número - Original: "${original}" → Limpo: "${clean}"`)
  
  while (clean.startsWith('55') && clean.length > 11) {
    clean = clean.substring(2)
    console.log(`🔄 Removendo 55 duplicado: "${clean}"`)
  }
  
  if (clean.length < 10) {
    return { 
      formatted: null, 
      error: `Número muito curto - falta DDD (${clean.length} dígitos)`,
      original 
    }
  }
  
  if (clean.length === 10) {
    clean = clean.slice(0, 2) + '9' + clean.slice(2)
    console.log(`✨ Adicionado 9° dígito (10→11): "${clean}"`)
  }
  
  if (clean.length === 12 && clean.startsWith('55')) {
    clean = clean.slice(0, 4) + '9' + clean.slice(4)
    console.log(`✨ Adicionado 9° dígito (12→13): "${clean}"`)
  }
  
  if (!clean.startsWith('55')) {
    clean = '55' + clean
    console.log(`🌍 Adicionado código do país: "${clean}"`)
  }
  
  if (clean.length !== 13) {
    return { 
      formatted: null, 
      error: `Número com tamanho inválido: ${clean.length} dígitos (esperado 13)`,
      original 
    }
  }
  
  const formatted = `${clean}@s.whatsapp.net`
  console.log(`✅ Número formatado: "${formatted}"`)
  
  return { formatted, original }
}

// Função para criar notificação de falha
async function createFailureNotification(
  supabase: any,
  userId: string,
  errorType: string,
  errorMessage: string,
  taskId: string,
  entityId: string,
  entityTitle: string,
  instanceName?: string,
  module: string = 'crm'
) {
  const notificationMessages: Record<string, string> = {
    'whatsapp_offline': `Sua instância WhatsApp "${instanceName || 'desconhecida'}" não está conectada. Reconecte em Configurações.`,
    'invalid_phone': `O número do ${module === 'crm' ? 'cliente' : 'arquiteto'} está em formato inválido: ${errorMessage}`,
    'api_error': `Erro ao enviar mensagem via WhatsApp. Verifique a conexão.`,
    'missing_phone': `O ${module === 'crm' ? 'cliente deste negócio' : 'arquiteto'} não possui telefone cadastrado.`,
    'no_instance': `Você não possui uma instância WhatsApp conectada. Configure em Configurações.`,
    'unknown': errorMessage
  }

  const message = notificationMessages[errorType] || notificationMessages['unknown']
  const link = module === 'crm' ? `/crm?deal=${entityId}` : `/prospeccao`

  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'automation_failure',
      title: '⚠️ Falha na Automação',
      message: message,
      link: link,
      read: false,
      metadata: {
        task_id: taskId,
        error_type: errorType,
        instance_name: instanceName || null,
        entity_title: entityTitle,
        module: module
      }
    })
    console.log(`📢 Notificação de falha criada para usuário ${userId}`)
  } catch (err) {
    console.error('❌ Erro ao criar notificação de falha:', err)
  }
}

// Processar tarefa do CRM
async function processCRMTask(supabase: any, evolutionUrl: string, evolutionApiKey: string, taskId: string) {
  console.log(`📋 Processando tarefa CRM: ${taskId}`)

  // Cleanup: Resetar tarefas stuck em 'processing' há mais de 5 minutos
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: stuckTasks } = await supabase
    .from('crm_tasks')
    .update({ status: 'open' })
    .eq('status', 'processing')
    .lt('updated_at', fiveMinutesAgo)
    .select('id')
  
  if (stuckTasks && stuckTasks.length > 0) {
    console.log(`🔄 Resetadas ${stuckTasks.length} tarefas CRM stuck em 'processing'`)
  }

  // Buscar tarefa
  const { data: task, error: taskError } = await supabase
    .from('crm_tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (taskError || !task) {
    throw new Error('Tarefa CRM não encontrada')
  }

  // Verificar se já foi processada
  if (task.status !== 'open') {
    console.log(`⏭️ Tarefa já processada (status: ${task.status})`)
    return { success: false, message: 'Tarefa já foi processada' }
  }

  console.log(`✅ Tarefa encontrada - tipo: ${task.tipo_tarefa}, status: ${task.status}`)

  // Marcar como 'processing'
  await supabase
    .from('crm_tasks')
    .update({ status: 'processing' })
    .eq('id', taskId)

  console.log('🔄 Tarefa marcada como "processing"')

  // Buscar dados do deal
  const { data: deal, error: dealError } = await supabase
    .from('crm_deals')
    .select(`
      *,
      lead:leads(
        id,
        client:clients(
          id,
          name,
          phone
        )
      )
    `)
    .eq('id', task.deal_id)
    .single()

  if (dealError || !deal) {
    console.error('❌ Deal não encontrado:', dealError)
    await supabase.from('crm_tasks').update({ status: 'open' }).eq('id', taskId)
    throw new Error('Deal não encontrado')
  }

  const clientPhone = task.whatsapp_number || deal.lead?.client?.phone
  const clientName = deal.lead?.client?.name || 'Cliente'
  const dealTitle = deal.title || 'Negócio'

  if (!clientPhone) {
    console.error('❌ Telefone do cliente não encontrado')
    await supabase.from('crm_tasks').update({ status: 'open' }).eq('id', taskId)
    
    await createFailureNotification(
      supabase,
      task.created_by,
      'missing_phone',
      'Cliente sem telefone cadastrado',
      taskId,
      task.deal_id,
      dealTitle,
      undefined,
      'crm'
    )
    
    throw new Error('Telefone do cliente não encontrado')
  }

  console.log(`📞 Cliente: ${clientName}, Telefone: ${clientPhone}`)

  // Buscar instância WhatsApp do vendedor
  const { data: connection, error: connectionError } = await supabase
    .from('tendenci_whatsapp_connections')
    .select('instance_name, instance_id, status')
    .eq('user_id', task.created_by)
    .eq('status', 'connected')
    .single()

  if (connectionError || !connection) {
    console.error('❌ Instância WhatsApp não encontrada para o vendedor:', connectionError)
    await supabase.from('crm_tasks').update({ status: 'open' }).eq('id', taskId)
    
    await createFailureNotification(
      supabase,
      task.created_by,
      'no_instance',
      'Vendedor não possui instância WhatsApp conectada',
      taskId,
      task.deal_id,
      dealTitle,
      undefined,
      'crm'
    )
    
    throw new Error('Vendedor não possui instância WhatsApp conectada')
  }

  console.log(`📱 Instância WhatsApp: ${connection.instance_name}`)

  // Formatar número de telefone
  const phoneResult = formatBrazilianPhone(clientPhone)
  
  if (!phoneResult.formatted) {
    console.error(`❌ Número inválido:`, phoneResult.error)
    await supabase.from('crm_tasks').update({ status: 'open' }).eq('id', taskId)
    
    await createFailureNotification(
      supabase,
      task.created_by,
      'invalid_phone',
      phoneResult.error || 'Formato inválido',
      taskId,
      task.deal_id,
      dealTitle,
      connection.instance_name,
      'crm'
    )
    
    throw new Error(`Número inválido: ${phoneResult.error}`)
  }

  // Enviar mensagem via Evolution API
  const message = task.note || task.title
  console.log(`📤 Enviando mensagem para ${phoneResult.formatted}`)

  const sendResponse = await fetch(`${evolutionUrl}/message/sendText/${connection.instance_name}`, {
    method: 'POST',
    headers: {
      'apikey': evolutionApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      number: phoneResult.formatted,
      text: message,
      delay: 1000
    })
  })

  if (!sendResponse.ok) {
    const errorText = await sendResponse.text()
    console.error('❌ Erro ao enviar mensagem:', errorText)
    
    await supabase.from('crm_tasks').update({ status: 'open' }).eq('id', taskId)
    
    await createFailureNotification(
      supabase,
      task.created_by,
      'api_error',
      `Erro Evolution API: ${errorText.substring(0, 100)}`,
      taskId,
      task.deal_id,
      dealTitle,
      connection.instance_name,
      'crm'
    )
    
    throw new Error('Erro ao enviar mensagem via Evolution API')
  }

  const responseData = await sendResponse.json()
  console.log('✅ Mensagem enviada com sucesso:', responseData)

  // Marcar tarefa como 'done'
  await supabase
    .from('crm_tasks')
    .update({ 
      status: 'done',
      processed_at: new Date().toISOString()
    })
    .eq('id', taskId)

  console.log('✅ Tarefa CRM marcada como "done"')

  // Registrar log na timeline do deal
  await supabase
    .from('crm_timeline')
    .insert({
      deal_id: task.deal_id,
      author_id: task.created_by,
      message: `📤 Mensagem automatizada enviada: "${message}"`,
      update_type: 'Sistema'
    })

  console.log('✅ Log registrado na timeline CRM')

  return { 
    success: true,
    message: 'Tarefa CRM processada e mensagem enviada com sucesso',
    taskId,
    messageId: responseData.key?.id || null
  }
}

// Processar tarefa de Prospecção (Arquitetos)
async function processProspeccaoTask(supabase: any, evolutionUrl: string, evolutionApiKey: string, taskId: string) {
  console.log(`📋 Processando tarefa de Prospecção: ${taskId}`)

  // Cleanup: Resetar tarefas stuck em 'processing' há mais de 5 minutos
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: stuckTasks } = await supabase
    .from('tendenci_prospec_arq_agendamentos')
    .update({ status: 'pendente' })
    .eq('status', 'processing')
    .lt('updated_at', fiveMinutesAgo)
    .select('id')
  
  if (stuckTasks && stuckTasks.length > 0) {
    console.log(`🔄 Resetadas ${stuckTasks.length} tarefas de prospecção stuck em 'processing'`)
  }

  // Buscar tarefa de agendamento
  const { data: task, error: taskError } = await supabase
    .from('tendenci_prospec_arq_agendamentos')
    .select('*')
    .eq('id', taskId)
    .single()

  if (taskError || !task) {
    throw new Error('Tarefa de prospecção não encontrada')
  }

  // Verificar se já foi processada
  if (task.status !== 'pendente') {
    console.log(`⏭️ Tarefa já processada (status: ${task.status})`)
    return { success: false, message: 'Tarefa já foi processada' }
  }

  console.log(`✅ Tarefa encontrada - tipo: ${task.tipo_tarefa}, status: ${task.status}`)

  // Marcar como 'processing'
  await supabase
    .from('tendenci_prospec_arq_agendamentos')
    .update({ status: 'processing' })
    .eq('id', taskId)

  console.log('🔄 Tarefa marcada como "processing"')

  // Buscar dados do arquiteto
  const { data: architect, error: architectError } = await supabase
    .from('architects')
    .select('id, name, phone, company')
    .eq('id', task.architect_id)
    .single()

  if (architectError || !architect) {
    console.error('❌ Arquiteto não encontrado:', architectError)
    await supabase.from('tendenci_prospec_arq_agendamentos').update({ status: 'pendente' }).eq('id', taskId)
    throw new Error('Arquiteto não encontrado')
  }

  const architectPhone = task.whatsapp_number || architect.phone
  const architectName = architect.name || 'Arquiteto'

  if (!architectPhone) {
    console.error('❌ Telefone do arquiteto não encontrado')
    await supabase.from('tendenci_prospec_arq_agendamentos').update({ status: 'pendente' }).eq('id', taskId)
    
    await createFailureNotification(
      supabase,
      task.vendedor_id,
      'missing_phone',
      'Arquiteto sem telefone cadastrado',
      taskId,
      task.architect_id,
      architectName,
      undefined,
      'prospeccao'
    )
    
    throw new Error('Telefone do arquiteto não encontrado')
  }

  console.log(`📞 Arquiteto: ${architectName}, Telefone: ${architectPhone}`)

  // Buscar instância WhatsApp do vendedor
  const { data: connection, error: connectionError } = await supabase
    .from('tendenci_whatsapp_connections')
    .select('instance_name, instance_id, status')
    .eq('user_id', task.vendedor_id)
    .eq('status', 'connected')
    .single()

  if (connectionError || !connection) {
    console.error('❌ Instância WhatsApp não encontrada para o vendedor:', connectionError)
    await supabase.from('tendenci_prospec_arq_agendamentos').update({ status: 'pendente' }).eq('id', taskId)
    
    await createFailureNotification(
      supabase,
      task.vendedor_id,
      'no_instance',
      'Vendedor não possui instância WhatsApp conectada',
      taskId,
      task.architect_id,
      architectName,
      undefined,
      'prospeccao'
    )
    
    throw new Error('Vendedor não possui instância WhatsApp conectada')
  }

  console.log(`📱 Instância WhatsApp: ${connection.instance_name}`)

  // Formatar número de telefone
  const phoneResult = formatBrazilianPhone(architectPhone)
  
  if (!phoneResult.formatted) {
    console.error(`❌ Número inválido:`, phoneResult.error)
    await supabase.from('tendenci_prospec_arq_agendamentos').update({ status: 'pendente' }).eq('id', taskId)
    
    await createFailureNotification(
      supabase,
      task.vendedor_id,
      'invalid_phone',
      phoneResult.error || 'Formato inválido',
      taskId,
      task.architect_id,
      architectName,
      connection.instance_name,
      'prospeccao'
    )
    
    throw new Error(`Número inválido: ${phoneResult.error}`)
  }

  // Extrair mensagem do campo observacoes
  const message = task.observacoes || task.titulo || 'Olá! Temos novidades para você.'
  console.log(`📤 Enviando mensagem para ${phoneResult.formatted}`)

  const sendResponse = await fetch(`${evolutionUrl}/message/sendText/${connection.instance_name}`, {
    method: 'POST',
    headers: {
      'apikey': evolutionApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      number: phoneResult.formatted,
      text: message,
      delay: 1000
    })
  })

  if (!sendResponse.ok) {
    const errorText = await sendResponse.text()
    console.error('❌ Erro ao enviar mensagem:', errorText)
    
    await supabase.from('tendenci_prospec_arq_agendamentos').update({ status: 'pendente' }).eq('id', taskId)
    
    await createFailureNotification(
      supabase,
      task.vendedor_id,
      'api_error',
      `Erro Evolution API: ${errorText.substring(0, 100)}`,
      taskId,
      task.architect_id,
      architectName,
      connection.instance_name,
      'prospeccao'
    )
    
    throw new Error('Erro ao enviar mensagem via Evolution API')
  }

  const responseData = await sendResponse.json()
  console.log('✅ Mensagem enviada com sucesso:', responseData)

  // Marcar tarefa como 'concluida'
  await supabase
    .from('tendenci_prospec_arq_agendamentos')
    .update({ 
      status: 'concluida',
      processed_at: new Date().toISOString()
    })
    .eq('id', taskId)

  console.log('✅ Tarefa de prospecção marcada como "concluida"')

  // Registrar log no histórico do arquiteto
  await supabase
    .from('tendenci_prospec_arq_logs')
    .insert({
      architect_id: task.architect_id,
      tipo: 'mensagem_automatica',
      descricao: `📤 Mensagem automatizada enviada: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
      enviado_por: task.vendedor_id
    })

  // Também registrar na timeline do arquiteto
  await supabase
    .from('architect_timeline')
    .insert({
      architect_id: task.architect_id,
      author_id: task.vendedor_id,
      message: `📤 Mensagem automatizada enviada: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
      update_type: 'Sistema'
    })

  console.log('✅ Log registrado no histórico do arquiteto')

  return { 
    success: true,
    message: 'Tarefa de prospecção processada e mensagem enviada com sucesso',
    taskId,
    messageId: responseData.key?.id || null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🤖 Process automated task request')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionUrl || !evolutionApiKey) {
      throw new Error('Evolution API não configurada')
    }

    const body: ProcessTaskRequest = await req.json()
    // Aceita tanto taskId quanto tarefa_id (compatibilidade n8n)
    const taskId = body.taskId || body.tarefa_id
    const origemModulo = body.origem_modulo || 'crm'  // Default para CRM para compatibilidade

    if (!taskId) {
      throw new Error('taskId ou tarefa_id é obrigatório')
    }

    console.log(`📋 Processando tarefa: ${taskId} (módulo: ${origemModulo})`)

    let result
    
    if (origemModulo === 'prospeccao') {
      result = await processProspeccaoTask(supabase, evolutionUrl, evolutionApiKey, taskId)
    } else {
      result = await processCRMTask(supabase, evolutionUrl, evolutionApiKey, taskId)
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Erro ao processar tarefa:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
