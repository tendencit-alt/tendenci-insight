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

const MAX_RETRIES = 3

// Função para formatar número de telefone brasileiro com fallback (com/sem 9º dígito)
function formatBrazilianPhoneWithFallback(phone: string): { 
  primary: string | null;      // Formato 13 dígitos (COM 9º dígito)
  fallback: string | null;     // Formato 12 dígitos (SEM 9º dígito)
  error?: string;
  original: string;
} {
  const original = phone
  let clean = phone.replace(/\D/g, '')
  
  console.log(`📱 Formatando número - Original: "${original}" → Limpo: "${clean}"`)
  
  // Remover zeros no início (ex: 016997085338 → 16997085338)
  while (clean.startsWith('0') && clean.length > 10) {
    clean = clean.substring(1)
    console.log(`🔄 Removendo zero inicial: "${clean}"`)
  }
  
  // Remover 55 duplicados no início
  while (clean.startsWith('55') && clean.length > 11) {
    clean = clean.substring(2)
    console.log(`🔄 Removendo 55 duplicado: "${clean}"`)
  }
  
  if (clean.length < 10) {
    return { 
      primary: null, 
      fallback: null,
      error: `Número muito curto - falta DDD (${clean.length} dígitos)`,
      original 
    }
  }
  
  // Padronizar para 11 dígitos (DDD + 9 + 8 dígitos)
  let digits11 = clean
  
  if (clean.length === 10) {
    // 10 dígitos: DDD + 8 dígitos → adicionar 9
    digits11 = clean.slice(0, 2) + '9' + clean.slice(2)
    console.log(`✨ Adicionado 9° dígito (10→11): "${digits11}"`)
  } else if (clean.length === 11) {
    // Já tem 11 dígitos: DDD + 9 + 8
    digits11 = clean
  } else if (clean.length === 12 && clean.startsWith('55')) {
    // 55 + DDD + 8 dígitos → adicionar 9
    digits11 = clean.slice(2, 4) + '9' + clean.slice(4)
    console.log(`✨ Adicionado 9° dígito (12→11): "${digits11}"`)
  } else if (clean.length === 13 && clean.startsWith('55')) {
    // Já tem 55 + DDD + 9 + 8
    digits11 = clean.slice(2)
  } else {
    return { 
      primary: null, 
      fallback: null,
      error: `Número com tamanho inválido: ${clean.length} dígitos`,
      original 
    }
  }
  
  // Formato COM 9º dígito (13 dígitos total: 55 + DDD + 9 + 8)
  const primary = `55${digits11}@s.whatsapp.net`
  
  // Formato SEM 9º dígito (12 dígitos total: 55 + DDD + 8)
  // Remover o 9 que está na posição 2 (após o DDD)
  const ddd = digits11.slice(0, 2)
  const restWithout9 = digits11.slice(3) // Pular o 9 (posição 2)
  const fallback = `55${ddd}${restWithout9}@s.whatsapp.net`
  
  console.log(`✅ Número formatado - Primary: "${primary}" | Fallback: "${fallback}"`)
  
  return { primary, fallback, original }
}

// Função para enviar WhatsApp com fallback de formato de número
async function sendWhatsAppWithFallback(
  evolutionUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; response?: any; error?: string; usedNumber?: string; isNumberNotExists?: boolean }> {
  
  const phoneFormats = formatBrazilianPhoneWithFallback(phoneNumber)
  
  if (!phoneFormats.primary) {
    return { success: false, error: phoneFormats.error, isNumberNotExists: false }
  }
  
  // Array de formatos para tentar
  const numbersToTry = [phoneFormats.primary]
  
  // Só adicionar fallback se for diferente do primary
  if (phoneFormats.fallback && phoneFormats.fallback !== phoneFormats.primary) {
    numbersToTry.push(phoneFormats.fallback)
  }
  
  let lastError = ''
  let isNumberNotExistsError = false
  
  for (let i = 0; i < numbersToTry.length; i++) {
    const formattedNumber = numbersToTry[i]
    const attemptLabel = i === 0 ? 'COM 9º dígito' : 'SEM 9º dígito'
    
    console.log(`📤 Tentativa ${i + 1}/${numbersToTry.length} (${attemptLabel}): ${formattedNumber}`)
    
    try {
      const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: formattedNumber,
          text: message,
          delay: 1000
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Mensagem enviada com sucesso usando formato ${attemptLabel}: ${formattedNumber}`)
        return { success: true, response: data, usedNumber: formattedNumber, isNumberNotExists: false }
      }
      
      // Verificar se é erro de número inexistente
      const responseText = await response.text()
      let errorData: any = {}
      
      try {
        errorData = JSON.parse(responseText)
      } catch {
        lastError = responseText
      }
      
      // Detectar erro de número inexistente
      const isNumberNotFound = 
        errorData.response?.message?.[0]?.exists === false ||
        errorData.message?.toLowerCase().includes('not exist') ||
        errorData.message?.toLowerCase().includes('não existe') ||
        errorData.error?.toLowerCase().includes('not found')
      
      if (isNumberNotFound) {
        console.log(`⚠️ Número ${formattedNumber} não existe no WhatsApp, tentando próximo formato...`)
        isNumberNotExistsError = true
        lastError = `Número não encontrado no WhatsApp: ${formattedNumber}`
        continue // Tentar próximo formato
      }
      
      // Se não é erro de número inexistente, é outro tipo de erro - retornar imediatamente
      lastError = errorData.message || responseText
      console.error(`❌ Erro não relacionado ao número: ${lastError}`)
      return { success: false, error: lastError, isNumberNotExists: false }
      
    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError.message : 'Erro de conexão'
      console.error(`❌ Erro na requisição: ${lastError}`)
      return { success: false, error: lastError, isNumberNotExists: false }
    }
  }
  
  // Se chegou aqui, nenhum formato funcionou
  const finalError = `Número não encontrado no WhatsApp em nenhum formato (tentamos com e sem 9º dígito). Verifique se o número está correto e se a pessoa usa WhatsApp.`
  console.error(`❌ ${finalError}`)
  
  return { 
    success: false, 
    error: finalError,
    isNumberNotExists: isNumberNotExistsError
  }
}

// Função para verificar se já existe notificação recente para a mesma tarefa
async function hasRecentNotification(
  supabase: any,
  userId: string,
  taskId: string,
  errorType: string,
  minutesThreshold: number = 30
): Promise<boolean> {
  const thresholdTime = new Date(Date.now() - minutesThreshold * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'automation_failure')
    .gte('created_at', thresholdTime)
    .limit(1)
  
  if (error) {
    console.error('❌ Erro ao verificar notificações existentes:', error)
    return false
  }
  
  // Verificar se alguma notificação tem o mesmo task_id no metadata
  if (data && data.length > 0) {
    const { data: exactMatch } = await supabase
      .from('notifications')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('type', 'automation_failure')
      .gte('created_at', thresholdTime)
    
    if (exactMatch) {
      for (const notif of exactMatch) {
        if (notif.metadata?.task_id === taskId && notif.metadata?.error_type === errorType) {
          console.log(`⏭️ Notificação recente já existe para tarefa ${taskId} com erro ${errorType}`)
          return true
        }
      }
    }
  }
  
  return false
}

// Função para criar notificação de falha (com verificação de duplicata)
async function createFailureNotification(
  supabase: any,
  userId: string,
  errorType: string,
  errorMessage: string,
  taskId: string,
  entityId: string,
  entityTitle: string,
  instanceName?: string,
  module: string = 'crm',
  retryCount: number = 0
) {
  // Só criar notificação na primeira tentativa ou se for erro diferente
  if (retryCount > 0) {
    console.log(`⏭️ Retry ${retryCount} - pulando criação de notificação duplicada`)
    return
  }

  // Verificar se já existe notificação recente para esta tarefa
  const hasRecent = await hasRecentNotification(supabase, userId, taskId, errorType)
  if (hasRecent) {
    console.log(`⏭️ Notificação recente já existe - não criando duplicata`)
    return
  }

  const notificationMessages: Record<string, string> = {
    'whatsapp_offline': `Sua instância WhatsApp "${instanceName || 'desconhecida'}" não está conectada. Reconecte em Configurações.`,
    'invalid_phone': `O número do ${module === 'crm' ? 'cliente' : 'arquiteto'} está em formato inválido: ${errorMessage}`,
    'api_error': `Erro ao enviar mensagem via WhatsApp. Verifique a conexão.`,
    'missing_phone': `O ${module === 'crm' ? 'cliente deste negócio' : 'arquiteto'} não possui telefone cadastrado.`,
    'no_instance': `Você não possui uma instância WhatsApp conectada. Configure em Configurações.`,
    'max_retries': `Tarefa falhou após ${MAX_RETRIES} tentativas. Verifique a configuração.`,
    'number_not_exists': `O número do ${module === 'crm' ? 'cliente' : 'arquiteto'} não está registrado no WhatsApp. Verifique se o número está correto e se a pessoa usa WhatsApp.`,
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
        module: module,
        retry_count: retryCount
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

  // Verificar se já foi processada ou falhou permanentemente
  if (task.status === 'done') {
    console.log(`⏭️ Tarefa já processada (status: done)`)
    return { success: false, message: 'Tarefa já foi processada' }
  }

  if (task.status === 'failed') {
    console.log(`⏭️ Tarefa marcada como falha permanente`)
    return { success: false, message: 'Tarefa marcada como falha permanente após máximo de tentativas' }
  }

  const currentRetryCount = task.retry_count || 0
  console.log(`✅ Tarefa encontrada - tipo: ${task.tipo_tarefa}, status: ${task.status}, retry: ${currentRetryCount}/${MAX_RETRIES}`)

  // Verificar se atingiu máximo de retentativas
  if (currentRetryCount >= MAX_RETRIES) {
    console.log(`❌ Tarefa atingiu máximo de ${MAX_RETRIES} tentativas - marcando como failed`)
    await supabase
      .from('crm_tasks')
      .update({ status: 'failed' })
      .eq('id', taskId)
    
    await createFailureNotification(
      supabase,
      task.created_by,
      'max_retries',
      `Tarefa falhou após ${MAX_RETRIES} tentativas`,
      taskId,
      task.deal_id,
      task.title || 'Tarefa',
      undefined,
      'crm',
      currentRetryCount
    )
    
    return { success: false, message: `Tarefa falhou após ${MAX_RETRIES} tentativas` }
  }

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
    await handleCRMTaskFailure(supabase, taskId, currentRetryCount, 'Deal não encontrado no sistema')
    throw new Error('Deal não encontrado')
  }

  const clientName = deal.lead?.client?.name || 'Cliente'
  const dealTitle = deal.title || 'Negócio'
  
  // SINCRONIZAÇÃO: Prioridade para número ATUALIZADO do cliente
  // Se o número da tarefa for diferente do cadastro atual, usar o do cadastro
  const clientPhoneFromDb = deal.lead?.client?.phone
  let clientPhone = task.whatsapp_number
  
  if (clientPhoneFromDb) {
    // Limpar ambos para comparação (remover não-numéricos)
    const cleanTaskPhone = (task.whatsapp_number || '').replace(/\D/g, '')
    const cleanDbPhone = clientPhoneFromDb.replace(/\D/g, '')
    
    // Se não tinha número na tarefa OU se o número do cliente foi atualizado
    if (!cleanTaskPhone || (cleanTaskPhone !== cleanDbPhone && cleanDbPhone.length >= 10)) {
      console.log(`🔄 Sincronizando número: tarefa="${cleanTaskPhone}" → cliente="${cleanDbPhone}"`)
      clientPhone = clientPhoneFromDb
      
      // Atualizar a tarefa com o número correto do cliente
      await supabase
        .from('crm_tasks')
        .update({ whatsapp_number: clientPhoneFromDb })
        .eq('id', taskId)
      
      console.log(`✅ Número da tarefa atualizado para: ${clientPhoneFromDb}`)
    }
  }

  if (!clientPhone) {
    console.error('❌ Telefone do cliente não encontrado')
    await handleCRMTaskFailure(supabase, taskId, currentRetryCount, 'Cliente sem telefone cadastrado')
    
    await createFailureNotification(
      supabase,
      task.created_by,
      'missing_phone',
      'Cliente sem telefone cadastrado',
      taskId,
      task.deal_id,
      dealTitle,
      undefined,
      'crm',
      currentRetryCount
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
    await handleCRMTaskFailure(supabase, taskId, currentRetryCount, 'Instância WhatsApp não conectada')
    
    await createFailureNotification(
      supabase,
      task.created_by,
      'no_instance',
      'Vendedor não possui instância WhatsApp conectada',
      taskId,
      task.deal_id,
      dealTitle,
      undefined,
      'crm',
      currentRetryCount
    )
    
    throw new Error('Vendedor não possui instância WhatsApp conectada')
  }

  console.log(`📱 Instância WhatsApp: ${connection.instance_name}`)

  // Enviar mensagem via Evolution API COM FALLBACK de formato
  const message = task.note || task.title
  console.log(`📤 Enviando mensagem para telefone: ${clientPhone}`)

  const sendResult = await sendWhatsAppWithFallback(
    evolutionUrl,
    evolutionApiKey,
    connection.instance_name,
    clientPhone,
    message
  )

  if (!sendResult.success) {
    console.error('❌ Falha ao enviar:', sendResult.error)
    
    // Se é erro de número inexistente, marcar como falha permanente (não adianta retry)
    if (sendResult.isNumberNotExists) {
      const errorMsg = 'Número não encontrado no WhatsApp. Verifique se o número está correto.'
      await supabase
        .from('crm_tasks')
        .update({ status: 'failed', retry_count: MAX_RETRIES, last_error: errorMsg })
        .eq('id', taskId)
      
      await createFailureNotification(
        supabase,
        task.created_by,
        'number_not_exists',
        sendResult.error || 'Número não encontrado no WhatsApp',
        taskId,
        task.deal_id,
        dealTitle,
        connection.instance_name,
        'crm',
        0 // Sempre notificar sobre número inexistente
      )
    } else {
      // Erro temporário - tentar novamente
      const errorMsg = sendResult.error?.substring(0, 200) || 'Erro desconhecido ao enviar mensagem'
      await handleCRMTaskFailure(supabase, taskId, currentRetryCount, errorMsg)
      
      await createFailureNotification(
        supabase,
        task.created_by,
        'api_error',
        sendResult.error?.substring(0, 100) || 'Erro desconhecido',
        taskId,
        task.deal_id,
        dealTitle,
        connection.instance_name,
        'crm',
        currentRetryCount
      )
    }
    
    throw new Error(sendResult.error || 'Erro ao enviar mensagem')
  }

  const responseData = sendResult.response
  console.log('✅ Mensagem enviada com sucesso usando:', sendResult.usedNumber)

  // Marcar tarefa como 'done' e resetar retry_count
  await supabase
    .from('crm_tasks')
    .update({ 
      status: 'done',
      processed_at: new Date().toISOString(),
      retry_count: 0
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

// Helper para tratar falha de tarefa CRM com retry
async function handleCRMTaskFailure(supabase: any, taskId: string, currentRetryCount: number, errorMessage?: string) {
  const newRetryCount = currentRetryCount + 1
  const newStatus = newRetryCount >= MAX_RETRIES ? 'failed' : 'open'
  
  console.log(`🔄 Incrementando retry_count: ${currentRetryCount} → ${newRetryCount} (status: ${newStatus})`)
  
  await supabase
    .from('crm_tasks')
    .update({ 
      status: newStatus,
      retry_count: newRetryCount,
      last_error: errorMessage || null
    })
    .eq('id', taskId)
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

  // Verificar se já foi processada ou falhou permanentemente
  if (task.status === 'concluida') {
    console.log(`⏭️ Tarefa já processada (status: concluida)`)
    return { success: false, message: 'Tarefa já foi processada' }
  }

  if (task.status === 'falha') {
    console.log(`⏭️ Tarefa marcada como falha permanente`)
    return { success: false, message: 'Tarefa marcada como falha permanente após máximo de tentativas' }
  }

  const currentRetryCount = task.retry_count || 0
  console.log(`✅ Tarefa encontrada - tipo: ${task.tipo_tarefa}, status: ${task.status}, retry: ${currentRetryCount}/${MAX_RETRIES}`)

  // Verificar se atingiu máximo de retentativas
  if (currentRetryCount >= MAX_RETRIES) {
    console.log(`❌ Tarefa atingiu máximo de ${MAX_RETRIES} tentativas - marcando como falha`)
    await supabase
      .from('tendenci_prospec_arq_agendamentos')
      .update({ status: 'falha' })
      .eq('id', taskId)
    
    await createFailureNotification(
      supabase,
      task.vendedor_id,
      'max_retries',
      `Tarefa falhou após ${MAX_RETRIES} tentativas`,
      taskId,
      task.architect_id,
      task.titulo || 'Tarefa',
      undefined,
      'prospeccao',
      currentRetryCount
    )
    
    return { success: false, message: `Tarefa falhou após ${MAX_RETRIES} tentativas` }
  }

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
    await handleProspeccaoTaskFailure(supabase, taskId, currentRetryCount)
    throw new Error('Arquiteto não encontrado')
  }

  const architectPhone = task.whatsapp_number || architect.phone
  const architectName = architect.name || 'Arquiteto'

  if (!architectPhone) {
    console.error('❌ Telefone do arquiteto não encontrado')
    await handleProspeccaoTaskFailure(supabase, taskId, currentRetryCount)
    
    await createFailureNotification(
      supabase,
      task.vendedor_id,
      'missing_phone',
      'Arquiteto sem telefone cadastrado',
      taskId,
      task.architect_id,
      architectName,
      undefined,
      'prospeccao',
      currentRetryCount
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
    await handleProspeccaoTaskFailure(supabase, taskId, currentRetryCount)
    
    await createFailureNotification(
      supabase,
      task.vendedor_id,
      'no_instance',
      'Vendedor não possui instância WhatsApp conectada',
      taskId,
      task.architect_id,
      architectName,
      undefined,
      'prospeccao',
      currentRetryCount
    )
    
    throw new Error('Vendedor não possui instância WhatsApp conectada')
  }

  console.log(`📱 Instância WhatsApp: ${connection.instance_name}`)

  // Extrair mensagem do campo observacoes (pode ser JSON ou texto)
  let message = 'Olá! Temos novidades para você.'
  
  if (task.observacoes) {
    try {
      // Tentar parsear como JSON (formato: {"titulo":"...", "nota":"..."})
      const obsData = JSON.parse(task.observacoes)
      message = obsData.nota || obsData.titulo || message
      console.log(`📝 Mensagem extraída do JSON: "${message}"`)
    } catch {
      // Se não for JSON válido, usar como string direta
      message = task.observacoes
      console.log(`📝 Usando observacoes como texto direto: "${message}"`)
    }
  } else if (task.titulo) {
    message = task.titulo
  }
  
  console.log(`📤 Enviando mensagem para telefone: ${architectPhone}`)

  // Enviar mensagem via Evolution API COM FALLBACK de formato
  const sendResult = await sendWhatsAppWithFallback(
    evolutionUrl,
    evolutionApiKey,
    connection.instance_name,
    architectPhone,
    message
  )

  if (!sendResult.success) {
    console.error('❌ Falha ao enviar:', sendResult.error)
    
    // Se é erro de número inexistente, marcar como falha permanente (não adianta retry)
    if (sendResult.isNumberNotExists) {
      await supabase
        .from('tendenci_prospec_arq_agendamentos')
        .update({ status: 'falha', retry_count: MAX_RETRIES })
        .eq('id', taskId)
      
      await createFailureNotification(
        supabase,
        task.vendedor_id,
        'number_not_exists',
        sendResult.error || 'Número não encontrado no WhatsApp',
        taskId,
        task.architect_id,
        architectName,
        connection.instance_name,
        'prospeccao',
        0 // Sempre notificar sobre número inexistente
      )
    } else {
      // Erro temporário - tentar novamente
      await handleProspeccaoTaskFailure(supabase, taskId, currentRetryCount)
      
      await createFailureNotification(
        supabase,
        task.vendedor_id,
        'api_error',
        sendResult.error?.substring(0, 100) || 'Erro desconhecido',
        taskId,
        task.architect_id,
        architectName,
        connection.instance_name,
        'prospeccao',
        currentRetryCount
      )
    }
    
    throw new Error(sendResult.error || 'Erro ao enviar mensagem')
  }

  const responseData = sendResult.response
  console.log('✅ Mensagem enviada com sucesso usando:', sendResult.usedNumber)

  // Marcar tarefa como 'concluida' e resetar retry_count
  await supabase
    .from('tendenci_prospec_arq_agendamentos')
    .update({ 
      status: 'concluida',
      retry_count: 0
    })
    .eq('id', taskId)

  console.log('✅ Tarefa de prospecção marcada como "concluida"')

  // Registrar no histórico do arquiteto
  const { error: historyError } = await supabase
    .from('architect_history')
    .insert({
      architect_id: task.architect_id,
      event_type: 'automated_message',
      description: `📤 Mensagem automatizada enviada: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
      created_by: task.vendedor_id
    })

  if (historyError) {
    console.error('⚠️ Erro ao inserir no histórico (não crítico):', historyError)
  } else {
    console.log('✅ Log registrado no histórico do arquiteto')
  }

  // CRÍTICO: Registrar na timeline do arquiteto (necessário para validação de 36h)
  const { error: timelineError } = await supabase
    .from('architect_timeline')
    .insert({
      architect_id: task.architect_id,
      author_id: task.vendedor_id,
      message: `📤 Mensagem automatizada enviada: "${message}"`,
      update_type: 'Comentário Interno'
    })

  if (timelineError) {
    console.error('❌ ERRO CRÍTICO ao inserir na timeline:', timelineError)
    // Tentar novamente com campos mínimos
    const { error: retryError } = await supabase
      .from('architect_timeline')
      .insert({
        architect_id: task.architect_id,
        message: `📤 Mensagem automatizada enviada`,
        update_type: 'Comentário Interno'
      })
    
    if (retryError) {
      console.error('❌ Retry também falhou:', retryError)
    } else {
      console.log('✅ Timeline registrada no retry (sem author_id)')
    }
  } else {
    console.log('✅ Timeline do arquiteto atualizada com sucesso')
  }

  return { 
    success: true,
    message: 'Tarefa de prospecção processada e mensagem enviada com sucesso',
    taskId,
    messageId: responseData.key?.id || null
  }
}

// Helper para tratar falha de tarefa de prospecção com retry
async function handleProspeccaoTaskFailure(supabase: any, taskId: string, currentRetryCount: number) {
  const newRetryCount = currentRetryCount + 1
  const newStatus = newRetryCount >= MAX_RETRIES ? 'falha' : 'pendente'
  
  console.log(`🔄 Incrementando retry_count: ${currentRetryCount} → ${newRetryCount} (status: ${newStatus})`)
  
  await supabase
    .from('tendenci_prospec_arq_agendamentos')
    .update({ 
      status: newStatus,
      retry_count: newRetryCount
    })
    .eq('id', taskId)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionUrl || !evolutionApiKey) {
      throw new Error('Evolution API não configurada')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const body: ProcessTaskRequest = await req.json()
    const taskId = body.taskId || body.tarefa_id
    let origemModulo = body.origem_modulo

    if (!taskId) {
      throw new Error('taskId é obrigatório')
    }

    console.log(`\n========================================`)
    console.log(`🚀 Iniciando processamento de tarefa: ${taskId}`)
    console.log(`📍 Módulo informado: ${origemModulo || 'não especificado'}`)
    console.log(`========================================\n`)

    // Se não tiver origem_modulo, tentar detectar automaticamente
    if (!origemModulo) {
      console.log('🔍 Detectando módulo automaticamente...')
      
      const { data: crmTask } = await supabase
        .from('crm_tasks')
        .select('id')
        .eq('id', taskId)
        .single()
      
      if (crmTask) {
        origemModulo = 'crm'
        console.log('✅ Detectado como tarefa CRM')
      } else {
        const { data: prospTask } = await supabase
          .from('tendenci_prospec_arq_agendamentos')
          .select('id')
          .eq('id', taskId)
          .single()
        
        if (prospTask) {
          origemModulo = 'prospeccao'
          console.log('✅ Detectado como tarefa de Prospecção')
        }
      }
    }

    let result

    if (origemModulo === 'crm') {
      result = await processCRMTask(supabase, evolutionUrl, evolutionApiKey, taskId)
    } else if (origemModulo === 'prospeccao') {
      result = await processProspeccaoTask(supabase, evolutionUrl, evolutionApiKey, taskId)
    } else {
      throw new Error(`Módulo não reconhecido ou tarefa não encontrada: ${origemModulo}`)
    }

    console.log(`\n========================================`)
    console.log(`✅ Processamento concluído com sucesso`)
    console.log(`========================================\n`)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error: unknown) {
    console.error('❌ Erro no processamento:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro interno'
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
