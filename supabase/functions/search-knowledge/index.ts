import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const tipo = url.searchParams.get("tipo") || "";
    const categoria = url.searchParams.get("categoria") || "";
    const limit = parseInt(url.searchParams.get("limit") || "10");

    console.log("[search-knowledge] Query:", query, "Tipo:", tipo, "Categoria:", categoria);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let queryBuilder = supabase
      .from("tendenci_ia_conhecimento")
      .select("id, titulo, conteudo, categoria, palavras_chave, prioridade, tipo, arquivo_url, tipo_arquivo")
      .eq("ativo", true)
      .order("prioridade", { ascending: false });

    // Busca por texto (título, conteúdo e palavras-chave)
    if (query) {
      queryBuilder = queryBuilder.or(`titulo.ilike.%${query}%,conteudo.ilike.%${query}%`);
    }

    // Filtro por tipo
    if (tipo) {
      queryBuilder = queryBuilder.ilike("tipo", `%${tipo}%`);
    }

    // Filtro por categoria
    if (categoria) {
      queryBuilder = queryBuilder.ilike("categoria", `%${categoria}%`);
    }

    const { data: items, error } = await queryBuilder.limit(limit);

    if (error) {
      console.error("[search-knowledge] Error:", error);
      throw error;
    }

    // Filtrar também por palavras-chave se houver query
    let filteredItems = items || [];
    if (query && filteredItems.length === 0) {
      // Tentar buscar por palavras-chave
      const { data: keywordItems } = await supabase
        .from("tendenci_ia_conhecimento")
        .select("id, titulo, conteudo, categoria, palavras_chave, prioridade, tipo, arquivo_url, tipo_arquivo")
        .eq("ativo", true)
        .order("prioridade", { ascending: false })
        .limit(50);

      filteredItems = (keywordItems || []).filter((item) =>
        item.palavras_chave?.some((k: string) =>
          k.toLowerCase().includes(query.toLowerCase())
        )
      ).slice(0, limit);
    }

    console.log("[search-knowledge] Found", filteredItems.length, "items");

    // Formatar resposta para n8n
    const formattedItems = filteredItems.map((item) => ({
      id: item.id,
      titulo: item.titulo,
      conteudo: item.conteudo,
      categoria: item.categoria,
      tipo: item.tipo,
      palavras_chave: item.palavras_chave || [],
      prioridade: item.prioridade,
      arquivo_url: item.arquivo_url,
      tipo_arquivo: item.tipo_arquivo,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        total: formattedItems.length,
        items: formattedItems,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[search-knowledge] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
