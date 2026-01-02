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
    const categoria = url.searchParams.get("categoria") || "";
    const limit = parseInt(url.searchParams.get("limit") || "10");

    console.log("[search-products] Query:", query, "Categoria:", categoria);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let queryBuilder = supabase
      .from("tendenci_ia_produtos")
      .select("id, nome, descricao, preco_base, categoria, diferenciais, quando_oferecer, imagem_url, galeria, video_url")
      .eq("ativo", true);

    // Busca por texto
    if (query) {
      queryBuilder = queryBuilder.or(`nome.ilike.%${query}%,descricao.ilike.%${query}%,categoria.ilike.%${query}%`);
    }

    // Filtro por categoria
    if (categoria) {
      queryBuilder = queryBuilder.ilike("categoria", `%${categoria}%`);
    }

    const { data: products, error } = await queryBuilder.limit(limit);

    if (error) {
      console.error("[search-products] Error:", error);
      throw error;
    }

    console.log("[search-products] Found", products?.length || 0, "products");

    // Formatar resposta para n8n
    const formattedProducts = (products || []).map((p) => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      preco_base: p.preco_base,
      preco_formatado: p.preco_base
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.preco_base)
        : null,
      categoria: p.categoria,
      diferenciais: p.diferenciais || [],
      quando_oferecer: p.quando_oferecer,
      imagem_url: p.imagem_url,
      galeria: p.galeria || [],
      video_url: p.video_url,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        total: formattedProducts.length,
        products: formattedProducts,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[search-products] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
