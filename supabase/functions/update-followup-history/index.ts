import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { formatBrasilDateTime } from '../_shared/timezone.ts'

interface UpdateFollowupRequest {
  deal_id: string
  new_message: string
  followup_number?: number // Receber do payload para sincronizar
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

    const { deal_id, new_message, followup_number }: UpdateFollowupRequest = await req.json()

    // Validações robustas
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
    console.log('📝 Followup number from payload:', followup_number)

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

    // 2️⃣ Determinar o número do follow-up
    // PRIORIDADE: usar followup_number do payload se fornecido, senão calcular
    const finalFollowupNumber = followup_number ?? ((deal.followup_count || 0) + 1)
    
    console.log('📊 Follow-up number final:', finalFollowupNumber)

    // 3️⃣ Adicionar nova mensagem ao histórico
    const timestamp = formatBrasilDateTime(new Date())
    const newEntry = `🤖 IA (Follow-up ${finalFollowupNumber}) [${timestamp}]: ${new_message}`
    
    const updatedHistory = deal.conversation_history 
      ? `${deal.conversation_history}\n\n${newEntry}`
      : newEntry

    // 4️⃣ Atualizar deal no banco
    const updateData: any = {
      conversation_history: updatedHistory,
      followup_count: finalFollowupNumber,
      last_followup_at: new Date().toISOString()
    }

    const { data: updateResult, error: updateError } = await supabase
      .from('crm_deals')
      .update(updateData)
      .eq('id', deal_id)
      .select('id')
      .single()

    if (updateError) {
      console.error('❌ Error updating deal:', updateError)
      throw updateError
    }

    console.log('✅ Deal updated, followup_count agora:', finalFollowupNumber, 'rows affected:', updateResult ? 1 : 0)

    // 5️⃣ Verificar se já existe log para este follow-up number
    const { data: existingLog, error: existingLogError } = await supabase
      .from('followup_logs')
      .select('id, status')
      .eq('deal_id', deal_id)
      .eq('followup_number', finalFollowupNumber)
      .maybeSingle()

    if (existingLogError) {
      console.warn('⚠️ Error checking existing log:', existingLogError)
    }

    const nowISO = new Date().toISOString()

    if (existingLog) {
      // Log existe - atualizar para 'sent'
      console.log(`📝 Log existente encontrado (status: ${existingLog.status}), atualizando para sent...`)
      
      const { data: logUpdateResult, error: logUpdateError } = await supabase
        .from('followup_logs')
        .update({
          status: 'sent',
          message_sent: new_message,
          sent_at: nowISO
        })
        .eq('id', existingLog.id)
        .select('id')
        .single()

      if (logUpdateError) {
        console.warn('⚠️ Error updating followup log:', logUpdateError)
      } else {
        console.log('✅ Follow-up log atualizado para sent, id:', logUpdateResult?.id)
      }
    } else {
      // Não existe log - criar novo com status 'sent'
      console.log('📝 Nenhum log existente, criando novo com status sent...')
      
      const { data: newLog, error: logError } = await supabase
        .from('followup_logs')
        .insert({
          deal_id: deal_id,
          followup_number: finalFollowupNumber,
          message_sent: new_message,
          status: 'sent',
          sent_at: nowISO
        })
        .select('id')
        .single()

      if (logError) {
        console.warn('⚠️ Error creating followup log:', logError)
      } else {
        console.log('✅ Novo log criado com status sent, id:', newLog?.id)
      }
    }

    // 6️⃣ Registrar na timeline do deal
    const { error: timelineError } = await supabase
      .from('crm_timeline')
      .insert({
        deal_id: deal_id,
        message: `Follow-up automático #${finalFollowupNumber} enviado`,
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
        followup_count: finalFollowupNumber,
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
