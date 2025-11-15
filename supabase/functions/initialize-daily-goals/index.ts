import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    // Buscar todos os vendedores (não masters)
    const { data: sellers, error: sellersError } = await supabase
      .from("profiles")
      .select("id")
      .neq("role", "admin");

    if (sellersError) throw sellersError;

    console.log(`Found ${sellers.length} sellers to initialize goals for`);

    // Para cada vendedor, criar meta diária se não existir
    for (const seller of sellers) {
      // Verificar se já existe meta para hoje
      const { data: existingGoal } = await supabase
        .from("tendenci_daily_architect_goals")
        .select("id")
        .eq("vendedor_id", seller.id)
        .eq("data", today)
        .maybeSingle();

      if (!existingGoal) {
        // Criar meta com valor padrão de 30
        const { error: insertError } = await supabase
          .from("tendenci_daily_architect_goals")
          .insert({
            vendedor_id: seller.id,
            data: today,
            meta_captacoes: 30,
            captacoes_realizadas: 0,
          });

        if (insertError) {
          console.error(`Error creating goal for seller ${seller.id}:`, insertError);
        } else {
          console.log(`Created daily goal for seller ${seller.id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Initialized daily goals for ${sellers.length} sellers`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
