import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Edge Function: process-pending-crm-tasks
 * 
 * Processa automaticamente todas as tarefas automatizadas do CRM
 * que estão pendentes e com due_at <= NOW()
 * 
 * Esta função é chamada por um cron job a cada minuto para garantir
 * processamento independente do n8n.
 */

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('🚀 [process-pending-crm-tasks] Iniciando processamento...')

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar tarefas automatizadas pendentes do CRM
    const now = new Date().toISOString()
    
    const { data: pendingTasks, error: tasksError } = await supabase
      .from('crm_tasks')
      .select('id, title, tipo_tarefa, due_at, status, retry_count')
      .eq('tipo_tarefa', 'automatizada')
      .in('status', ['open', 'pendente'])
      .lte('due_at', now)
      .order('due_at', { ascending: true })
      .limit(20) // Processar no máximo 20 por vez para não sobrecarregar

    if (tasksError) {
      console.error('❌ Erro ao buscar tarefas pendentes:', tasksError)
      throw new Error(`Erro ao buscar tarefas: ${tasksError.message}`)
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log('✅ Nenhuma tarefa automatizada pendente encontrada')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma tarefa pendente',
          tasksProcessed: 0,
          duration: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Encontradas ${pendingTasks.length} tarefas pendentes`)

    // Processar cada tarefa chamando a função process-automated-task
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const task of pendingTasks) {
      console.log(`\n🔄 Processando tarefa: ${task.id} - "${task.title}"`)
      
      try {
        // ============ LOCK ATÔMICO ============
        // Tentar marcar como 'processing' APENAS se ainda estiver pendente
        const { data: lockedTask, error: lockError } = await supabase
          .from('crm_tasks')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id)
          .in('status', ['open', 'pendente'])
          .select('id')
          .maybeSingle()

        if (lockError) {
          console.error(`❌ Erro ao adquirir lock para tarefa ${task.id}:`, lockError.message)
          results.failed++
          results.errors.push(`${task.id}: Erro ao adquirir lock - ${lockError.message}`)
          continue
        }

        if (!lockedTask) {
          console.log(`⚠️ Tarefa ${task.id} já está sendo processada por outra instância - pulando`)
          results.skipped++
          continue
        }

        console.log(`🔒 Lock adquirido para tarefa ${task.id}`)

        // Chamar a função process-automated-task existente
        const processResponse = await fetch(
          `${supabaseUrl}/functions/v1/process-automated-task`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              taskId: task.id,
              origem_modulo: 'crm'
            })
          }
        )

        const responseText = await processResponse.text()
        let responseData: any = {}
        
        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = { message: responseText }
        }

        if (processResponse.ok && responseData.success !== false) {
          console.log(`✅ Tarefa ${task.id} processada com sucesso`)
          results.success++
        } else {
          console.warn(`⚠️ Tarefa ${task.id} falhou: ${responseData.message || responseData.error || 'Erro desconhecido'}`)
          results.failed++
          results.errors.push(`${task.id}: ${responseData.message || responseData.error || 'Erro'}`)
        }

      } catch (taskError) {
        const errorMsg = taskError instanceof Error ? taskError.message : 'Erro desconhecido'
        console.error(`❌ Erro ao processar tarefa ${task.id}:`, errorMsg)
        results.failed++
        results.errors.push(`${task.id}: ${errorMsg}`)
      }

      // Pequeno delay entre tarefas para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    const duration = Date.now() - startTime
    console.log(`\n🏁 Processamento concluído em ${duration}ms`)
    console.log(`   ✅ Sucesso: ${results.success}`)
    console.log(`   ❌ Falhas: ${results.failed}`)
    console.log(`   ⏭️ Ignoradas: ${results.skipped}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processadas ${results.success} tarefas com sucesso`,
        tasksFound: pendingTasks.length,
        tasksProcessed: results.success,
        tasksFailed: results.failed,
        tasksSkipped: results.skipped,
        errors: results.errors.length > 0 ? results.errors : undefined,
        duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ [process-pending-crm-tasks] Erro geral:', errorMsg)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMsg,
        duration: Date.now() - startTime
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
