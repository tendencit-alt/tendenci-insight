import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Product {
  id: string;
  nome: string;
  descricao: string | null;
  preco_base: number | null;
  categoria: string | null;
  diferenciais: string[] | null;
  quando_oferecer: string | null;
  imagem_url: string | null;
  galeria: string[] | null;
  video_url: string | null;
}

interface ScoredProduct extends Product {
  relevanceScore: number;
}

// Calculate relevance score for a product based on query terms
function calculateRelevanceScore(product: Product, queryTerms: string[]): number {
  let score = 0;
  
  const searchFields = [
    { value: product.nome, weight: 10 },
    { value: product.categoria, weight: 8 },
    { value: product.descricao, weight: 5 },
    { value: (product.diferenciais || []).join(" "), weight: 4 },
    { value: product.quando_oferecer, weight: 6 },
  ];
  
  for (const term of queryTerms) {
    const lowerTerm = term.toLowerCase();
    
    for (const { value, weight } of searchFields) {
      if (!value) continue;
      
      const lowerValue = value.toLowerCase();
      
      // Exact word match (highest score)
      const words = lowerValue.split(/\s+/);
      if (words.includes(lowerTerm)) {
        score += weight * 3;
      }
      // Word starts with term
      else if (words.some(w => w.startsWith(lowerTerm))) {
        score += weight * 2;
      }
      // Contains term
      else if (lowerValue.includes(lowerTerm)) {
        score += weight;
      }
    }
  }
  
  return score;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const categoria = url.searchParams.get("categoria") || "";
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const minScore = parseInt(url.searchParams.get("min_score") || "1");

    console.log("[search-products] Query:", query, "Categoria:", categoria, "Limit:", limit);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Build base query
    let queryBuilder = supabase
      .from("tendenci_ia_produtos")
      .select("id, nome, descricao, preco_base, categoria, diferenciais, quando_oferecer, imagem_url, galeria, video_url")
      .eq("ativo", true);

    // Apply category filter if provided
    if (categoria) {
      queryBuilder = queryBuilder.ilike("categoria", `%${categoria}%`);
    }

    const { data: allProducts, error } = await queryBuilder;

    if (error) {
      console.error("[search-products] Error:", error);
      throw error;
    }

    let results: ScoredProduct[] = [];

    if (!query) {
      // No query - return all products with score 0
      results = (allProducts || []).map((p: Product) => ({
        ...p,
        relevanceScore: 0
      })).slice(0, limit);
    } else {
      // Parse query into terms
      const queryTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term.length >= 2);
      
      console.log("[search-products] Search terms:", queryTerms);
      
      // Score each product
      const scoredProducts: ScoredProduct[] = (allProducts || []).map((product: Product) => ({
        ...product,
        relevanceScore: calculateRelevanceScore(product, queryTerms)
      }));
      
      // Filter and sort by relevance
      results = scoredProducts
        .filter(p => p.relevanceScore >= minScore)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
      
      console.log("[search-products] Scores:", results.map(p => `${p.nome}: ${p.relevanceScore}`).join(", "));
    }

    console.log("[search-products] Found", results.length, "products");

    // Format response
    const formattedProducts = results.map((p) => ({
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
      relevance_score: p.relevanceScore
    }));

    return new Response(
      JSON.stringify({
        success: true,
        total: formattedProducts.length,
        query: query || null,
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
