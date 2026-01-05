import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupResult {
  orphanTasksCanceled: number
  inactiveArchitectTasksCanceled: number
  details: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🧹 [cleanup-orphan-tasks] Iniciando limpeza de tarefas órfãs...')

  const result: CleanupResult = {
    orphanTasksCanceled: 0,
    inactiveArchitectTasksCanceled: 0,
    details: []
  }

  try {
    // 1. Buscar todas as tarefas pendentes de arquitetos
    const { data: pendingTasks, error: fetchError } = await supabase
      .from('tendenci_prospec_arq_agendamentos')
      .select('id, architect_id, observacoes')
      .in('status', ['pendente', 'processando'])

    if (fetchError) {
      console.error('❌ Erro ao buscar tarefas:', fetchError.message)
      throw fetchError
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log('✅ Nenhuma tarefa pendente encontrada')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma tarefa pendente para limpar',
          result 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Encontradas ${pendingTasks.length} tarefas pendentes para verificar`)

    // 2. Buscar IDs de arquitetos ativos
    const { data: activeArchitects, error: archError } = await supabase
      .from('architects')
      .select('id')
      .eq('active', true)

    if (archError) {
      console.error('❌ Erro ao buscar arquitetos ativos:', archError.message)
      throw archError
    }

    const activeArchitectIds = new Set(activeArchitects?.map(a => a.id) || [])
    console.log(`👥 ${activeArchitectIds.size} arquitetos ativos no sistema`)

    // 3. Buscar todos os IDs de arquitetos existentes (ativos ou não)
    const { data: allArchitects, error: allArchError } = await supabase
      .from('architects')
      .select('id')

    if (allArchError) {
      console.error('❌ Erro ao buscar todos arquitetos:', allArchError.message)
      throw allArchError
    }

    const allArchitectIds = new Set(allArchitects?.map(a => a.id) || [])
    console.log(`👥 ${allArchitectIds.size} arquitetos totais no sistema`)

    // 4. Identificar tarefas órfãs e de arquitetos inativos
    const orphanTaskIds: string[] = []
    const inactiveArchitectTaskIds: string[] = []

    for (const task of pendingTasks) {
      if (!task.architect_id) {
        // Tarefa sem architect_id
        orphanTaskIds.push(task.id)
        result.details.push(`Tarefa ${task.id}: sem architect_id`)
      } else if (!allArchitectIds.has(task.architect_id)) {
        // Arquiteto não existe mais
        orphanTaskIds.push(task.id)
        result.details.push(`Tarefa ${task.id}: arquiteto ${task.architect_id} não existe`)
      } else if (!activeArchitectIds.has(task.architect_id)) {
        // Arquiteto existe mas está inativo
        inactiveArchitectTaskIds.push(task.id)
        result.details.push(`Tarefa ${task.id}: arquiteto ${task.architect_id} inativo`)
      }
    }

    console.log(`🔍 Órfãs: ${orphanTaskIds.length}, Inativos: ${inactiveArchitectTaskIds.length}`)

    // 5. Cancelar tarefas órfãs
    if (orphanTaskIds.length > 0) {
      const { error: cancelOrphanError } = await supabase
        .from('tendenci_prospec_arq_agendamentos')
        .update({ 
          status: 'cancelada',
          observacoes: 'Cancelada automaticamente: arquiteto excluído do sistema'
        })
        .in('id', orphanTaskIds)

      if (cancelOrphanError) {
        console.error('❌ Erro ao cancelar tarefas órfãs:', cancelOrphanError.message)
      } else {
        result.orphanTasksCanceled = orphanTaskIds.length
        console.log(`✅ ${orphanTaskIds.length} tarefas órfãs canceladas`)
      }
    }

    // 6. Cancelar tarefas de arquitetos inativos
    if (inactiveArchitectTaskIds.length > 0) {
      const { error: cancelInactiveError } = await supabase
        .from('tendenci_prospec_arq_agendamentos')
        .update({ 
          status: 'cancelada',
          observacoes: 'Cancelada automaticamente: arquiteto marcado como inativo'
        })
        .in('id', inactiveArchitectTaskIds)

      if (cancelInactiveError) {
        console.error('❌ Erro ao cancelar tarefas de inativos:', cancelInactiveError.message)
      } else {
        result.inactiveArchitectTasksCanceled = inactiveArchitectTaskIds.length
        console.log(`✅ ${inactiveArchitectTaskIds.length} tarefas de arquitetos inativos canceladas`)
      }
    }

    // 7. Log de auditoria
    const totalCanceled = result.orphanTasksCanceled + result.inactiveArchitectTasksCanceled
    if (totalCanceled > 0) {
      await supabase
        .from('system_errors')
        .insert({
          title: 'Limpeza de tarefas órfãs executada',
          description: `${result.orphanTasksCanceled} tarefas de arquitetos excluídos e ${result.inactiveArchitectTasksCanceled} de arquitetos inativos foram canceladas`,
          module: 'prospeccao',
          severity: 'info',
          source: 'cleanup-orphan-tasks',
          metadata: result
        })
    }

    console.log(`\n📊 Resumo: ${totalCanceled} tarefas canceladas no total`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Limpeza concluída: ${totalCanceled} tarefas canceladas`,
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro geral:', errorMessage)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        result
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
