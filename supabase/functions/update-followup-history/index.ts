import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { formatBrasilDateTime } from '../_shared/timezone.ts'

/**
 * update-followup-history v2.0
 * 
 * CALLBACK do n8n para atualizar histórico de follow-up
 * 
 * MUDANÇAS v2.0:
 * - Aceita success: false para registrar falhas do n8n
 * - Aceita error: string para detalhes do erro
 * - Dispara alertas automáticos quando há falha
 * - Mantém compatibilidade com formato antigo
 */

interface UpdateFollowupRequest {
  deal_id: string
  new_message?: string         // Opcional se for erro
  followup_number?: number
  success?: boolean            // NOVO: n8n informa se deu certo (default: true)
  error?: string               // NOVO: detalhes do erro se success=false
}

// Registrar erro no system_errors
async function logSystemError(
  supabase: any,
  title: string,
  module: string,
  description: string,
  severity: string = 'high',
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    await supabase.from('system_errors').insert({
      title,
      module,
      description,
      severity,
      status: 'open',
      metadata
    })
    console.log(`🚨 System error logged: ${title}`)
  } catch (e) {
    console.error('Failed to log system error:', e)
  }
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

    const payload: UpdateFollowupRequest = await req.json()
    const { deal_id, new_message, followup_number, success = true, error: errorFromN8n } = payload

    // Validações
    if (!deal_id) {
      console.error('❌ deal_id é obrigatório')
      throw new Error('deal_id é obrigatório')
    }

    console.log('═══════════════════════════════════════════════════════════')
    console.log('📝 [UPDATE-FOLLOWUP-HISTORY v2.0]')
    console.log(`📝 Deal: ${deal_id}`)
    console.log(`📝 Success: ${success}`)
    console.log(`📝 Followup number: ${followup_number}`)
    if (errorFromN8n) console.log(`📝 Error from n8n: ${errorFromN8n}`)
    console.log('═══════════════════════════════════════════════════════════')

    // ═══════════════════════════════════════════════════════════
    // CASO: n8n reportou FALHA
    // ═══════════════════════════════════════════════════════════
    if (!success) {
      console.log('❌ n8n reportou falha no envio do follow-up')
      
      // Buscar info do deal para contexto
      const { data: deal } = await supabase
        .from('crm_deals')
        .select('title, owner_id')
        .eq('id', deal_id)
        .single()
      
      // Atualizar log para failed
      const { error: logUpdateError } = await supabase
        .from('followup_logs')
        .update({
          status: 'failed',
          error_message: errorFromN8n || 'Erro reportado pelo n8n'
        })
        .eq('deal_id', deal_id)
        .eq('followup_number', followup_number || 1)
        .eq('status', 'pending')
      
      if (logUpdateError) {
        console.warn('⚠️ Erro ao atualizar log:', logUpdateError)
        
        // Tentar criar log se não existir
        await supabase.from('followup_logs').insert({
          deal_id: deal_id,
          followup_number: followup_number || 1,
          status: 'failed',
          error_message: errorFromN8n || 'Erro reportado pelo n8n'
        })
      }
      
      // Registrar na timeline
      await supabase.from('crm_timeline').insert({
        deal_id: deal_id,
        message: `❌ Falha no follow-up automático #${followup_number || '?'}: ${errorFromN8n || 'Erro desconhecido'}`,
        update_type: 'Sistema - Erro'
      })
      
      // Alertar no system_errors
      await logSystemError(
        supabase,
        `Falha no Follow-up: ${deal?.title || deal_id}`,
        'update-followup-history',
        errorFromN8n || 'n8n reportou erro no envio',
        'high',
        { 
          deal_id, 
          followup_number, 
          deal_title: deal?.title,
          owner_id: deal?.owner_id 
        }
      )
      
      console.log('🏁 Falha registrada')
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorFromN8n || 'Falha reportada pelo n8n',
          logged: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════════════════════════
    // CASO: SUCESSO - atualizar histórico normalmente
    // ═══════════════════════════════════════════════════════════
    
    if (!new_message || new_message.trim().length === 0) {
      console.error('❌ new_message é obrigatório para sucesso')
      throw new Error('new_message é obrigatório quando success=true')
    }

    console.log('✅ n8n reportou sucesso, atualizando histórico...')

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
    const finalFollowupNumber = followup_number ?? ((deal.followup_count || 0) + 1)
    
    console.log('📊 Follow-up number final:', finalFollowupNumber)

    // 3️⃣ Adicionar nova mensagem ao histórico
    const timestamp = formatBrasilDateTime(new Date())
    const newEntry = `🤖 IA (Follow-up ${finalFollowupNumber}) [${timestamp}]: ${new_message}`
    
    const updatedHistory = deal.conversation_history 
      ? `${deal.conversation_history}\n\n${newEntry}`
      : newEntry

    // 4️⃣ Atualizar deal no banco
    const { data: updateResult, error: updateError } = await supabase
      .from('crm_deals')
      .update({
        conversation_history: updatedHistory,
        followup_count: finalFollowupNumber,
        last_followup_at: new Date().toISOString()
      })
      .eq('id', deal_id)
      .select('id')
      .single()

    if (updateError) {
      console.error('❌ Error updating deal:', updateError)
      throw updateError
    }

    console.log('✅ Deal updated, followup_count agora:', finalFollowupNumber)

    // 5️⃣ Atualizar ou criar log
    const { data: existingLog } = await supabase
      .from('followup_logs')
      .select('id, status')
      .eq('deal_id', deal_id)
      .eq('followup_number', finalFollowupNumber)
      .maybeSingle()

    const nowISO = new Date().toISOString()

    if (existingLog) {
      console.log(`📝 Log existente (status: ${existingLog.status}), atualizando para sent...`)
      
      await supabase
        .from('followup_logs')
        .update({
          status: 'sent',
          message_sent: new_message,
          sent_at: nowISO,
          error_message: null // Limpar erro anterior
        })
        .eq('id', existingLog.id)
    } else {
      console.log('📝 Criando novo log com status sent...')
      
      await supabase.from('followup_logs').insert({
        deal_id: deal_id,
        followup_number: finalFollowupNumber,
        message_sent: new_message,
        status: 'sent',
        sent_at: nowISO
      })
    }

    // 6️⃣ Registrar na timeline
    await supabase.from('crm_timeline').insert({
      deal_id: deal_id,
      message: `Follow-up automático #${finalFollowupNumber} enviado via n8n + OpenAI`,
      update_type: 'Sistema - Follow-up'
    })

    console.log('🏁 Follow-up history updated successfully')
    console.log('═══════════════════════════════════════════════════════════')

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
