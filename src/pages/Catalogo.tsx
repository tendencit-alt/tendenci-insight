import { useState, useEffect, useMemo } from "react";
import { Instagram, Phone, ArrowLeft, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { CatalogoHeader } from "@/components/catalogo/CatalogoHeader";
import { ProductCard } from "@/components/catalogo/ProductCard";
import { ProductDetailModal } from "@/components/catalogo/ProductDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { CatalogoAdminBar } from "@/components/catalogo/CatalogoAdminBar";
import { SharePublicCatalogPanel } from "@/components/catalogo/SharePublicCatalogPanel";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

interface Product {
  id: string;
  nome: string;
  descricao?: string | null;
  preco_base?: number | null;
  categoria?: string | null;
  imagem_url?: string | null;
  galeria?: string[];
  videos?: string[];
  diferenciais?: string[];
  estoque?: number | null;
  largura?: number | null;
  comprimento?: number | null;
  altura?: number | null;
  unidade_medida?: string | null;
  ativo?: boolean | null;
}

interface CatalogSettings {
  logo_url?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  footer_company_name?: string | null;
  footer_copyright?: string | null;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  primary_color?: string | null;
}

export default function Catalogo() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "price-asc" | "price-desc" | "category">("category");

  const { activeTenantId, memberships } = useActiveTenant();
  const { user } = useAuth();
  const tenantName = useMemo(
    () => memberships.find((m) => m.tenant_id === activeTenantId)?.name || "Loja",
    [memberships, activeTenantId]
  );

  const { data: settings } = useQuery<CatalogSettings | null>({
    queryKey: ["catalog-settings", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_catalogo_settings" as any)
        .select("*")
        .eq("tenant_id", activeTenantId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || null;
    },
  });

  const heroTitle = settings?.hero_title || "Nossos Produtos";
  const heroSubtitle =
    settings?.hero_subtitle || `Conheça os produtos de ${tenantName}`;
  const companyName = settings?.footer_company_name || tenantName;
  const copyright =
    settings?.footer_copyright ||
    `© ${new Date().getFullYear()} ${tenantName}. Todos os direitos reservados.`;
  const whatsappUrl = settings?.whatsapp_url || "";
  const instagramUrl = settings?.instagram_url || "";
  const whatsappNumber = useMemo(() => {
    if (!whatsappUrl) return "";
    const m = whatsappUrl.match(/(\d{8,15})/);
    return m?.[1] || "";
  }, [whatsappUrl]);
  const primaryColor = settings?.primary_color || "#C41E3A";

  // Tenant da vitrine: mesma fonte usada para tenant_catalogo_settings.
  // Sem tenant resolvido (ex.: anon sem domínio/slug), NÃO carregamos
  // produtos para evitar vazamento cross-tenant (defesa em profundidade
  // do lado cliente — RLS continua valendo no servidor).
  const catalogTenantId = activeTenantId;

  useEffect(() => {
    if (!catalogTenantId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogTenantId]);

  const loadProducts = async () => {
    try {
      if (!catalogTenantId) {
        setProducts([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, description, descricao_curta, descricao_longa, sale_price, image_url, imagens, galeria, current_stock, dimensoes, prazo_producao_dias, ativo_no_catalogo, category_id, product_categories(name)"
        )
        .eq("tenant_id", catalogTenantId)
        .eq("ativo_no_catalogo", true)
        .eq("active", true)
        .order("name");

      if (error) throw error;

      const formattedProducts: Product[] = (data || []).map((p: any) => {
        const dim = p.dimensoes && typeof p.dimensoes === "object" ? p.dimensoes : {};
        const imagens = Array.isArray(p.imagens) && p.imagens.length
          ? p.imagens
          : Array.isArray(p.galeria)
          ? p.galeria
          : [];
        const cover = p.image_url || imagens[0] || null;
        return {
          id: p.id,
          nome: p.name,
          descricao: p.descricao_curta || p.description || p.descricao_longa,
          preco_base: p.sale_price,
          categoria: p.product_categories?.name || null,
          imagem_url: cover,
          galeria: imagens,
          videos: [],
          diferenciais: [],
          estoque: p.current_stock,
          largura: dim.largura ?? null,
          comprimento: dim.comprimento ?? null,
          altura: dim.altura ?? null,
          unidade_medida: dim.unidade ?? "cm",
          ativo: true,
        };
      });

      setProducts(formattedProducts);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = products.filter((p) => {
      if (selectedCategory && p.categoria !== selectedCategory) return false;
      if (term) {
        const haystack = `${p.nome} ${p.descricao || ""} ${p.categoria || ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "name-asc": return a.nome.localeCompare(b.nome, "pt-BR");
        case "name-desc": return b.nome.localeCompare(a.nome, "pt-BR");
        case "price-asc": return (a.preco_base ?? Infinity) - (b.preco_base ?? Infinity);
        case "price-desc": return (b.preco_base ?? -Infinity) - (a.preco_base ?? -Infinity);
        case "category":
        default: {
          const ca = (a.categoria || "zzz").localeCompare(b.categoria || "zzz", "pt-BR");
          return ca !== 0 ? ca : a.nome.localeCompare(b.nome, "pt-BR");
        }
      }
    });
    return list;
  }, [products, selectedCategory, searchTerm, sortBy]);

  const handleBuyNow = (product: Product) => {
    if (!whatsappNumber) return;
    const price = product.preco_base
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.preco_base)
      : "";
    const message = encodeURIComponent(
      `Olá! Tenho interesse no produto: ${product.nome}${price ? ` - ${price}` : ""}`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
  };

  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="min-h-screen bg-background" style={{ ["--catalog-primary" as any]: primaryColor }}>
          <SharePublicCatalogPanel />
          <div className="mt-6">
          <CatalogoHeader
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        logoUrl={settings?.logo_url || null}
        brandName={companyName}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user && (
          <div className="flex justify-start mb-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao sistema
              </Link>
            </Button>
          </div>
        )}
        {user && <CatalogoAdminBar onProductCreated={loadProducts} />}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {heroTitle}
          </h1>
          <p className="text-muted-foreground">{heroSubtitle}</p>
        </div>

        {/* Filtros: busca + ordenação */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 max-w-3xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, descrição ou categoria..."
              className="pl-9 pr-9 bg-background"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="md:w-56 bg-background">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category">Categoria (A–Z)</SelectItem>
              <SelectItem value="name-asc">Nome (A–Z)</SelectItem>
              <SelectItem value="name-desc">Nome (Z–A)</SelectItem>
              <SelectItem value="price-asc">Menor preço</SelectItem>
              <SelectItem value="price-desc">Maior preço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!loading && (
          <p className="text-sm text-muted-foreground text-center mb-6">
            {filteredProducts.length} produto{filteredProducts.length === 1 ? "" : "s"}
            {selectedCategory && <> em <strong>{selectedCategory}</strong></>}
            {searchTerm && <> para "<strong>{searchTerm}</strong>"</>}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              {searchTerm
                ? `Nenhum produto encontrado para "${searchTerm}"`
                : selectedCategory
                ? `Nenhum produto encontrado na categoria "${selectedCategory}"`
                : "Nenhum produto cadastrado ainda"}
            </p>
            {(searchTerm || selectedCategory) && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setSearchTerm(""); setSelectedCategory(null); }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => openProductDetail(product)}
                onBuyNow={() => handleBuyNow(product)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="bg-muted/40 border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-foreground font-medium">{companyName}</p>
            <div className="flex items-center gap-6">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:opacity-80 transition-colors"
                  style={{ color: primaryColor }}
                >
                  <Phone className="h-5 w-5" />
                  <span>WhatsApp</span>
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:opacity-80 transition-colors"
                  style={{ color: primaryColor }}
                >
                  <Instagram className="h-5 w-5" />
                  <span>Instagram</span>
                </a>
              )}
            </div>
          </div>
          <div className="text-center mt-6 text-sm text-muted-foreground">{copyright}</div>
        </div>
      </footer>

          <ProductDetailModal
            product={selectedProduct}
            open={modalOpen}
            onOpenChange={setModalOpen}
            onBuyNow={handleBuyNow}
          />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

