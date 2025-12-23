import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🔄 [process-pending-architect-tasks] Iniciando verificação de tarefas automatizadas de arquitetos...')

  try {
    // Get current time in Brazil timezone
    const now = new Date()
    const brasilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    console.log(`⏰ Horário atual Brasil: ${brasilTime.toISOString()}`)

    // Find pending automated tasks that are due
    const { data: pendingTasks, error: fetchError } = await supabase
      .from('tendenci_prospec_arq_agendamentos')
      .select(`
        id,
        architect_id,
        data_agendamento,
        whatsapp_number,
        observacoes,
        canal,
        metadata,
        vendedor_id,
        audio_url,
        architects:architect_id (
          id,
          name,
          phone
        )
      `)
      .eq('tipo_tarefa', 'automatizada')
      .eq('status', 'pendente')
      .lte('data_agendamento', now.toISOString())
      .order('data_agendamento', { ascending: true })

    if (fetchError) {
      console.error('❌ Erro ao buscar tarefas:', fetchError.message)
      throw fetchError
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log('✅ Nenhuma tarefa automatizada de arquiteto pendente para processar')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma tarefa pendente',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Encontradas ${pendingTasks.length} tarefas para processar`)

    const results = []

    for (const task of pendingTasks) {
      const architectData = Array.isArray(task.architects) ? task.architects[0] : task.architects
      const taskTitle = (task.metadata as any)?.titulo || task.observacoes || 'Tarefa automatizada'
      console.log(`\n🔄 Processando tarefa ${task.id} - ${taskTitle}`)
      console.log(`   Arquiteto: ${architectData?.name || 'N/A}'}`)

      try {
        // Mark as processing
        await supabase
          .from('tendenci_prospec_arq_agendamentos')
          .update({ status: 'processando' })
          .eq('id', task.id)

        // Call the process-automated-task function
        const { data: processResult, error: processError } = await supabase.functions.invoke(
          'process-automated-task',
          {
            body: {
              taskId: task.id,
              origem_modulo: 'prospeccao'
            }
          }
        )

        if (processError) {
          console.error(`❌ Erro ao processar tarefa ${task.id}:`, processError.message)
          
          // Mark as failed
          await supabase
            .from('tendenci_prospec_arq_agendamentos')
            .update({ 
              status: 'falha',
              observacoes: `Erro no processamento: ${processError.message}`
            })
            .eq('id', task.id)

          results.push({
            taskId: task.id,
            success: false,
            error: processError.message
          })
        } else {
          console.log(`✅ Tarefa ${task.id} processada com sucesso`)
          
          results.push({
            taskId: task.id,
            success: true,
            result: processResult
          })
        }
      } catch (taskError) {
        const errorMessage = taskError instanceof Error ? taskError.message : 'Erro desconhecido'
        console.error(`❌ Exceção ao processar tarefa ${task.id}:`, errorMessage)
        
        // Mark as failed
        await supabase
          .from('tendenci_prospec_arq_agendamentos')
          .update({ 
            status: 'falha',
            observacoes: `Exceção: ${errorMessage}`
          })
          .eq('id', task.id)

        results.push({
          taskId: task.id,
          success: false,
          error: errorMessage
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`\n📊 Resumo: ${successCount} sucesso, ${failCount} falhas de ${pendingTasks.length} tarefas`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processadas ${pendingTasks.length} tarefas`,
        processed: successCount,
        failed: failCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro geral:', errorMessage)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
