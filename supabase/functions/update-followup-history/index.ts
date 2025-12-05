import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface UpdateFollowupRequest {
  deal_id: string
  new_message: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { deal_id, new_message }: UpdateFollowupRequest = await req.json()

    // FASE 11: Validações robustas
    if (!deal_id) {
      console.error('❌ deal_id é obrigatório')
      throw new Error('deal_id é obrigatório')
    }
    
    if (!new_message || new_message.trim().length === 0) {
      console.error('❌ new_message é obrigatório e não pode ser vazio')
      throw new Error('new_message é obrigatório e não pode ser vazio')
    }

    console.log('📝 Updating follow-up history for deal:', deal_id)
    console.log('📝 Message length:', new_message.length)

    // 1️⃣ Buscar deal atual
    const { data: deal, error: fetchError } = await supabase
      .from('crm_deals')
      .select('conversation_history, followup_count, title')
      .eq('id', deal_id)
      .single()

    if (fetchError || !deal) {
      console.error('❌ Deal not found:', fetchError)
      throw new Error('Deal not found')
    }

    console.log('✅ Deal encontrado:', deal.title, 'followup_count atual:', deal.followup_count)

    // 2️⃣ Adicionar nova mensagem ao histórico
    const timestamp = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })
    
    const followupNumber = (deal.followup_count || 0) + 1
    const newEntry = `🤖 IA (Follow-up ${followupNumber}) [${timestamp}]: ${new_message}`
    
    const updatedHistory = deal.conversation_history 
      ? `${deal.conversation_history}\n\n${newEntry}`
      : newEntry

    // 3️⃣ Atualizar deal no banco
    // FASE 7: last_followup_at = quando sistema enviou, last_interaction = quando cliente respondeu
    const updateData: any = {
      conversation_history: updatedHistory,
      followup_count: followupNumber,
      last_followup_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('crm_deals')
      .update(updateData)
      .eq('id', deal_id)

    if (updateError) {
      console.error('❌ Error updating deal:', updateError)
      throw updateError
    }

    console.log('✅ Deal updated, followup_count agora:', followupNumber)

    // 4️⃣ FASE 5: Verificar se já existe log com QUALQUER status para este followup_number
    const { data: existingLog, error: existingLogError } = await supabase
      .from('followup_logs')
      .select('id, status')
      .eq('deal_id', deal_id)
      .eq('followup_number', followupNumber)
      .maybeSingle() // Usar maybeSingle para não dar erro se não encontrar

    if (existingLogError) {
      console.warn('⚠️ Error checking existing log:', existingLogError)
    }

    if (existingLog) {
      // Log existe - atualizar para 'sent' independente do status anterior
      console.log(`📝 Log existente encontrado (status: ${existingLog.status}), atualizando para sent...`)
      
      const { error: logUpdateError, count } = await supabase
        .from('followup_logs')
        .update({
          status: 'sent',
          message_sent: new_message,
          sent_at: new Date().toISOString()
        })
        .eq('id', existingLog.id)

      if (logUpdateError) {
        console.warn('⚠️ Error updating followup log:', logUpdateError)
      } else {
        console.log('✅ Follow-up log atualizado para sent')
      }
    } else {
      // 5️⃣ Não existe log - criar novo com status 'sent'
      console.log('📝 Nenhum log existente, criando novo com status sent...')
      
      const { error: logError } = await supabase
        .from('followup_logs')
        .insert({
          deal_id: deal_id,
          followup_number: followupNumber,
          message_sent: new_message,
          status: 'sent',
          sent_at: new Date().toISOString()
        })

      if (logError) {
        console.warn('⚠️ Error creating followup log:', logError)
      } else {
        console.log('✅ Novo log criado com status sent')
      }
    }

    // 6️⃣ Registrar na timeline do deal
    const { error: timelineError } = await supabase
      .from('crm_timeline')
      .insert({
        deal_id: deal_id,
        message: `Follow-up automático #${followupNumber} enviado`,
        update_type: 'Sistema - Follow-up'
      })

    if (timelineError) {
      console.warn('⚠️ Error creating timeline entry:', timelineError)
    } else {
      console.log('✅ Timeline entry created')
    }

    console.log('🏁 Follow-up history updated successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        followup_count: followupNumber,
        message: 'Follow-up history updated successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
