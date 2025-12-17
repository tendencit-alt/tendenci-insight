import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[check-deals-without-tasks] Starting check...');

    // Buscar todos os pipelines
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('crm_pipelines')
      .select('id');

    if (pipelinesError) {
      console.error('[check-deals-without-tasks] Error fetching pipelines:', pipelinesError);
      throw pipelinesError;
    }

    console.log(`[check-deals-without-tasks] Found ${pipelines?.length || 0} pipelines`);

    let totalNotificationsCreated = 0;

    for (const pipeline of pipelines || []) {
      // Buscar etapas de Qualificação e Negociação deste pipeline
      const { data: stages, error: stagesError } = await supabase
        .from('crm_stages')
        .select('id, name')
        .eq('pipeline_id', pipeline.id)
        .or('name.ilike.%qualificação%,name.ilike.%negociação%,name.ilike.%qualificacao%,name.ilike.%negociacao%');

      if (stagesError || !stages || stages.length === 0) {
        continue;
      }

      const stageIds = stages.map((s: { id: string }) => s.id);

      // Buscar deals nessas etapas que estão abertos e têm owner
      const { data: deals, error: dealsError } = await supabase
        .from('crm_deals')
        .select(`
          id,
          title,
          owner_id,
          stage_entered_at,
          stage:crm_stages(name),
          lead:leads(
            client:clients(name)
          )
        `)
        .eq('pipeline_id', pipeline.id)
        .eq('status', 'aberto')
        .in('stage_id', stageIds)
        .not('owner_id', 'is', null);

      if (dealsError || !deals || deals.length === 0) {
        continue;
      }

      console.log(`[check-deals-without-tasks] Pipeline ${pipeline.id}: Found ${deals.length} deals`);

      const now = new Date().toISOString();

      for (const deal of deals) {
        // Verificar se tem tarefas válidas (pendente E due_at >= NOW())
        const { count, error: tasksError } = await supabase
          .from('crm_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deal_id', deal.id)
          .eq('status', 'open')
          .gte('due_at', now);

        if (tasksError) {
          console.error(`[check-deals-without-tasks] Error checking tasks for deal ${deal.id}:`, tasksError);
          continue;
        }

        // Se não tem tarefas válidas, verificar se deve criar notificação
        if (count === 0) {
          // Calcular horas sem tarefa
          const stageEnteredAt = deal.stage_entered_at ? new Date(deal.stage_entered_at) : new Date();
          const hoursWithoutTask = Math.floor((Date.now() - stageEnteredAt.getTime()) / (1000 * 60 * 60));

          // Só notificar se passou de 36 horas
          if (hoursWithoutTask < 36) {
            continue;
          }

          // Verificar se já existe notificação recente (últimas 24h) para evitar spam
          const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          
          const { count: existingNotifications } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', deal.owner_id)
            .eq('type', 'task_reminder')
            .ilike('link', `%${deal.id}%`)
            .gte('created_at', last24h);

          if (existingNotifications && existingNotifications > 0) {
            console.log(`[check-deals-without-tasks] Notification already exists for deal ${deal.id} in last 24h, skipping`);
            continue;
          }

          // Extrair client name e stage name dos objetos aninhados
          // @ts-ignore - Supabase returns nested objects differently
          const stage = deal.stage as unknown as { name: string } | null;
          // @ts-ignore - Supabase returns nested objects differently  
          const lead = deal.lead as unknown as { client: { name: string } | null } | null;
          
          const clientName = lead?.client?.name || 'Cliente não identificado';
          const stageName = stage?.name || 'Etapa não identificada';

          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: deal.owner_id,
              type: 'task_reminder',
              title: '⚠️ Oportunidade sem Tarefa',
              message: `O negócio "${deal.title}" (${clientName}) na etapa "${stageName}" está há ${hoursWithoutTask}h sem tarefa válida. Adicione uma tarefa.`,
              link: `/crm?deal=${deal.id}`,
              read: false,
              metadata: {
                deal_id: deal.id,
                hours_without_task: hoursWithoutTask,
                stage_name: stageName
              }
            });

          if (notifError) {
            console.error(`[check-deals-without-tasks] Error creating notification for deal ${deal.id}:`, notifError);
          } else {
            totalNotificationsCreated++;
            console.log(`[check-deals-without-tasks] Created notification for deal ${deal.id} (${hoursWithoutTask}h without task)`);
          }
        }
      }
    }

    console.log(`[check-deals-without-tasks] Completed. Total notifications created: ${totalNotificationsCreated}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_created: totalNotificationsCreated,
        message: `Created ${totalNotificationsCreated} notifications for deals without valid tasks`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[check-deals-without-tasks] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
