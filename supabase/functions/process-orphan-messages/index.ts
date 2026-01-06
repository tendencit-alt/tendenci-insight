import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("🔄 [CRON] Iniciando verificação de mensagens órfãs...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar mensagens pendentes com mais de 30 segundos que não estão sendo processadas
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    
    const { data: orphanMessages, error: fetchError } = await supabase
      .from("ia_pending_messages")
      .select("*")
      .eq("processed", false)
      .eq("is_processing", false)
      .lt("created_at", thirtySecondsAgo)
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("❌ Erro ao buscar mensagens órfãs:", fetchError);
      throw fetchError;
    }

    if (!orphanMessages || orphanMessages.length === 0) {
      console.log("✅ Nenhuma mensagem órfã encontrada");
      return new Response(
        JSON.stringify({ 
          success: true, 
          orphans_found: 0,
          duration_ms: Date.now() - startTime 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔍 Encontradas ${orphanMessages.length} mensagens órfãs`);

    // Agrupar por telefone/instância para processar uma vez por cliente
    const clientGroups = new Map<string, typeof orphanMessages[0]>();
    for (const msg of orphanMessages) {
      const key = `${msg.phone_number}:${msg.instance_name}`;
      if (!clientGroups.has(key)) {
        clientGroups.set(key, msg);
      }
    }

    console.log(`👥 ${clientGroups.size} clientes únicos com mensagens pendentes`);

    let processed = 0;
    let errors = 0;

    // Processar cada cliente
    for (const [key, oldestMsg] of clientGroups) {
      try {
        console.log(`📤 Processando cliente ${key}, mensagem mais antiga: ${oldestMsg.id}`);
        
        // Chamar o process-ia-message para reprocessar
        const { error: invokeError } = await supabase.functions.invoke("process-ia-message", {
          body: {
            data: {
              key: {
                remoteJid: `${oldestMsg.phone_number}@s.whatsapp.net`,
              },
              message: {
                conversation: oldestMsg.content,
              },
            },
            instance: oldestMsg.instance_name,
            _orphan_recovery: true, // Flag para indicar que é recovery
          },
        });

        if (invokeError) {
          console.error(`❌ Erro ao invocar process-ia-message para ${key}:`, invokeError);
          errors++;
        } else {
          console.log(`✅ Mensagem reprocessada para ${key}`);
          processed++;
        }

        // Delay entre processamentos para evitar sobrecarga
        await new Promise(r => setTimeout(r, 500));
        
      } catch (clientError) {
        console.error(`❌ Erro ao processar cliente ${key}:`, clientError);
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`🏁 CRON finalizado: ${processed} processados, ${errors} erros, ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        orphans_found: orphanMessages.length,
        clients_processed: processed,
        errors,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro crítico no CRON:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
