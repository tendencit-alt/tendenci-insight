import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateConversationRequest {
  deal_id?: string;
  client_phone?: string;
  new_message: string;
  sender: 'ai' | 'client';
}

// Função para extrair últimos 8 dígitos do telefone
function getPhoneDigits(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-8);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: UpdateConversationRequest = await req.json();
    console.log('[update-deal-conversation] Payload recebido:', JSON.stringify(payload));

    const { deal_id, client_phone, new_message, sender } = payload;

    if (!new_message) {
      console.error('[update-deal-conversation] Erro: new_message é obrigatório');
      return new Response(
        JSON.stringify({ error: 'new_message é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!deal_id && !client_phone) {
      console.error('[update-deal-conversation] Erro: deal_id ou client_phone é obrigatório');
      return new Response(
        JSON.stringify({ error: 'deal_id ou client_phone é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let dealToUpdate: any = null;

    // Buscar deal pelo ID
    if (deal_id) {
      console.log('[update-deal-conversation] Buscando deal pelo ID:', deal_id);
      const { data, error } = await supabase
        .from('crm_deals')
        .select('id, conversation_history, title')
        .eq('id', deal_id)
        .maybeSingle();

      if (error) {
        console.error('[update-deal-conversation] Erro ao buscar deal por ID:', error);
      }
      dealToUpdate = data;
    }

    // Se não encontrou por ID, buscar pelo telefone do cliente
    if (!dealToUpdate && client_phone) {
      console.log('[update-deal-conversation] Buscando deal pelo telefone:', client_phone);
      const phoneDigits = getPhoneDigits(client_phone);
      console.log('[update-deal-conversation] Últimos 8 dígitos:', phoneDigits);

      // Buscar deal através do lead -> client
      const { data: deals, error } = await supabase
        .from('crm_deals')
        .select(`
          id,
          conversation_history,
          title,
          lead_id,
          leads!crm_deals_lead_id_fkey (
            client_id,
            clients!leads_client_id_fkey (
              phone
            )
          )
        `)
        .eq('from_ai', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[update-deal-conversation] Erro ao buscar deals:', error);
      }

      if (deals && deals.length > 0) {
        // Encontrar deal com telefone correspondente
        for (const deal of deals) {
          const leadData = deal.leads as any;
          if (leadData?.clients?.phone) {
            const dealPhoneDigits = getPhoneDigits(leadData.clients.phone);
            if (dealPhoneDigits === phoneDigits) {
              dealToUpdate = deal;
              console.log('[update-deal-conversation] Deal encontrado pelo telefone:', deal.id);
              break;
            }
          }
        }
      }

      // Também buscar em leads_whatsapp se não encontrou
      if (!dealToUpdate) {
        console.log('[update-deal-conversation] Buscando em leads_whatsapp...');
        const { data: whatsappLeads } = await supabase
          .from('leads_whatsapp')
          .select('id, conversa_whatsapp')
          .or(`telefone.ilike.%${phoneDigits}`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (whatsappLeads && whatsappLeads.length > 0) {
          // Atualizar conversa no leads_whatsapp
          const lead = whatsappLeads[0];
          const prefix = sender === 'ai' ? '🤖 IA' : '👤 Cliente';
          const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          const newEntry = `[${timestamp}] ${prefix}: ${new_message}`;
          
          const updatedConversation = lead.conversa_whatsapp 
            ? `${lead.conversa_whatsapp}\n${newEntry}`
            : newEntry;

          const { error: updateError } = await supabase
            .from('leads_whatsapp')
            .update({ 
              conversa_whatsapp: updatedConversation,
              updated_at: new Date().toISOString()
            })
            .eq('id', lead.id);

          if (updateError) {
            console.error('[update-deal-conversation] Erro ao atualizar leads_whatsapp:', updateError);
          } else {
            console.log('[update-deal-conversation] leads_whatsapp atualizado com sucesso');
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Conversa atualizada em leads_whatsapp',
              lead_id: lead.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (!dealToUpdate) {
      console.error('[update-deal-conversation] Nenhum deal encontrado');
      return new Response(
        JSON.stringify({ error: 'Nenhum deal encontrado com os parâmetros fornecidos' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir nova entrada de conversa
    const prefix = sender === 'ai' ? '🤖 IA' : '👤 Cliente';
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const newEntry = `[${timestamp}] ${prefix}: ${new_message}`;

    // Atualizar conversation_history
    const currentHistory = dealToUpdate.conversation_history || '';
    const updatedHistory = currentHistory ? `${currentHistory}\n${newEntry}` : newEntry;

    console.log('[update-deal-conversation] Atualizando deal:', dealToUpdate.id);

    const { error: updateError } = await supabase
      .from('crm_deals')
      .update({
        conversation_history: updatedHistory,
        last_interaction: new Date().toISOString()
      })
      .eq('id', dealToUpdate.id);

    if (updateError) {
      console.error('[update-deal-conversation] Erro ao atualizar deal:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar conversa', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Também registrar na timeline
    await supabase.from('crm_timeline').insert({
      deal_id: dealToUpdate.id,
      message: `${prefix}: ${new_message.substring(0, 100)}${new_message.length > 100 ? '...' : ''}`,
      update_type: sender === 'ai' ? 'whatsapp_ia_response' : 'whatsapp_client_message'
    });

    console.log('[update-deal-conversation] ✅ Conversa atualizada com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        deal_id: dealToUpdate.id,
        deal_title: dealToUpdate.title,
        message: 'Conversa atualizada com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[update-deal-conversation] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
