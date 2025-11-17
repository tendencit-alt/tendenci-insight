import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ArchitectData {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  categoria?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { architects } = await req.json() as { architects: ArchitectData[] };

    console.log(`Processando importação de ${architects.length} arquitetos`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Processar em lotes menores
    const batchSize = 5;
    for (let i = 0; i < architects.length; i += batchSize) {
      const batch = architects.slice(i, i + batchSize);

      for (const architect of batch) {
        try {
          // Validar dados mínimos
          if (!architect.name || architect.name.trim() === '') {
            console.log(`Arquiteto ignorado - sem nome válido`);
            skippedCount++;
            continue;
          }

          // Verificar se já existe por telefone ou email
          let existsQuery = supabase
            .from("architects")
            .select("id")
            .eq("name", architect.name)
            .limit(1);

          if (architect.phone && architect.phone.length > 5) {
            existsQuery = existsQuery.or(`phone.eq.${architect.phone}`);
          }

          if (architect.email) {
            existsQuery = existsQuery.or(`email.eq.${architect.email}`);
          }

          const { data: existing } = await existsQuery.maybeSingle();

          if (existing) {
            console.log(`Arquiteto já existe: ${architect.name}`);
            skippedCount++;
            continue;
          }

          // Inserir novo arquiteto
          const insertData = {
            name: architect.name.trim(),
            company: architect.company && architect.company !== architect.name ? architect.company.trim() : null,
            phone: architect.phone || null,
            email: architect.email || null,
            categoria: architect.categoria?.toLowerCase() || 'metropolitano',
            status_funil: 'novo_arquiteto',
          };

          const { error: insertError } = await supabase
            .from("architects")
            .insert(insertData);

          if (insertError) {
            console.error(`Erro ao inserir ${architect.name}:`, insertError.message);
            errors.push(`${architect.name}: ${insertError.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error(`Erro ao processar arquiteto:`, error);
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`${architect.name}: ${errorMessage}`);
        }
      }

      // Delay entre lotes
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: architects.length,
        inserted: successCount,
        skipped: skippedCount,
        errors: errorCount,
        errorMessages: errors.slice(0, 10), // Primeiros 10 erros apenas
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro geral:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
