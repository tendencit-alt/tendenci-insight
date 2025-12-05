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

    // FASE 10: Validações adicionais
    if (!deal_id) {
      throw new Error('deal_id é obrigatório')
    }
    
    if (!new_message || new_message.trim().length === 0) {
      throw new Error('new_message é obrigatório e não pode ser vazio')
    }

    console.log('📝 Updating follow-up history for deal:', deal_id)

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

    // 2️⃣ Adicionar nova mensagem ao histórico
    const timestamp = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo' // FASE 3: Usar timezone Brasil
    })
    
    const followupNumber = (deal.followup_count || 0) + 1
    const newEntry = `🤖 IA (Follow-up ${followupNumber}) [${timestamp}]: ${new_message}`
    
    const updatedHistory = deal.conversation_history 
      ? `${deal.conversation_history}\n\n${newEntry}`
      : newEntry

    // 3️⃣ Atualizar deal no banco
    // FASE 7: Atualizar last_followup_at (não last_interaction, que é para cliente)
    const updateData: any = {
      conversation_history: updatedHistory,
      followup_count: followupNumber,
      last_followup_at: new Date().toISOString()
      // NOTA: last_interaction é atualizado apenas quando o CLIENTE responde
    }

    const { error: updateError } = await supabase
      .from('crm_deals')
      .update(updateData)
      .eq('id', deal_id)

    if (updateError) {
      console.error('❌ Error updating deal:', updateError)
      throw updateError
    }

    // 4️⃣ FASE 8: Atualizar log de 'pending' para 'sent' (confirmação do callback)
    const { error: logUpdateError } = await supabase
      .from('followup_logs')
      .update({
        status: 'sent', // Confirmado pelo callback
        message_sent: new_message,
        sent_at: new Date().toISOString()
      })
      .eq('deal_id', deal_id)
      .eq('followup_number', followupNumber)
      .eq('status', 'pending') // Apenas logs pendentes

    if (logUpdateError) {
      console.warn('⚠️ Error updating followup log status:', logUpdateError)
      // Não lançar erro, apenas log - pode ser que já foi atualizado
    } else {
      console.log('✅ Follow-up log status updated to sent')
    }

    // 5️⃣ Se não encontrou log pending, criar novo com status 'sent'
    const { data: existingLog } = await supabase
      .from('followup_logs')
      .select('id')
      .eq('deal_id', deal_id)
      .eq('followup_number', followupNumber)
      .single()

    if (!existingLog) {
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
    }

    console.log('✅ Follow-up history updated successfully')

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
