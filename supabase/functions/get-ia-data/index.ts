import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Endpoint unificado para buscar dados da IA
 * Retorna produtos, conhecimentos, ou dados específicos
 * 
 * Query params:
 * - type: "products" | "knowledge" | "all" (default: all)
 * - product_id: ID específico do produto
 * - knowledge_id: ID específico do conhecimento
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "all";
    const productId = url.searchParams.get("product_id");
    const knowledgeId = url.searchParams.get("knowledge_id");

    console.log("[get-ia-data] Type:", type, "ProductId:", productId, "KnowledgeId:", knowledgeId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const result: any = {};

    // Buscar produto específico
    if (productId) {
      const { data: product, error } = await supabase
        .from("tendenci_ia_produtos")
        .select("*")
        .eq("id", productId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      return new Response(
        JSON.stringify({ success: true, product }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar conhecimento específico
    if (knowledgeId) {
      const { data: knowledge, error } = await supabase
        .from("tendenci_ia_conhecimento")
        .select("*")
        .eq("id", knowledgeId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      return new Response(
        JSON.stringify({ success: true, knowledge }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar produtos
    if (type === "products" || type === "all") {
      const { data: products, error } = await supabase
        .from("tendenci_ia_produtos")
        .select("id, nome, descricao, preco_base, categoria, diferenciais, quando_oferecer, imagem_url, galeria, video_url, ativo")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      result.products = products || [];
    }

    // Buscar conhecimentos
    if (type === "knowledge" || type === "all") {
      const { data: knowledge, error } = await supabase
        .from("tendenci_ia_conhecimento")
        .select("id, titulo, conteudo, categoria, palavras_chave, prioridade, tipo, arquivo_url, tipo_arquivo, ativo")
        .eq("ativo", true)
        .order("prioridade", { ascending: false });

      if (error) throw error;
      result.knowledge = knowledge || [];
    }

    // Adicionar estatísticas
    result.stats = {
      total_products: result.products?.length || 0,
      total_knowledge: result.knowledge?.length || 0,
      fetched_at: new Date().toISOString(),
    };

    console.log("[get-ia-data] Products:", result.stats.total_products, "Knowledge:", result.stats.total_knowledge);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[get-ia-data] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
