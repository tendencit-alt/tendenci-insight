import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Search, Instagram, Phone, X, ArrowLeft } from "lucide-react";
import { PublicLeadDialog } from "@/components/catalogo-public/PublicLeadDialog";

interface PublicTenant {
  tenant_id: string;
  tenant_name: string;
  logo_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  footer_company_name: string | null;
  footer_copyright: string | null;
  whatsapp_url: string | null;
  instagram_url: string | null;
  primary_color: string | null;
  banner_url: string | null;
  meta_description: string | null;
  catalogo_indexavel: boolean;
}

interface PublicProduct {
  id: string;
  name: string;
  descricao_curta: string | null;
  sale_price: number | null;
  image_url: string | null;
  imagens: string[] | null;
  category_id: string | null;
  category_name: string | null;
}

interface PublicCategory {
  id: string;
  name: string;
  color: string | null;
  sort_position: number | null;
}

function NotFoundView() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-muted-foreground mb-6">
          O catálogo solicitado não existe ou não está disponível.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Voltar</Link>
        </Button>
      </div>
    </div>
  );
}

function formatBRL(v: number | null | undefined) {
  if (v == null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function CatalogoPublico() {
  const { tenant_slug } = useParams<{ tenant_slug: string }>();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);

  const { data: tenant, isLoading: loadingTenant, error: tenantError } = useQuery<PublicTenant | null>({
    queryKey: ["public-catalog-tenant", tenant_slug],
    enabled: !!tenant_slug,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("resolve_public_catalog", {
        p_slug: tenant_slug!,
      });
      if (error) throw error;
      const row = (data as any[])?.[0];
      return (row as PublicTenant) || null;
    },
  });

  const { data: categories = [] } = useQuery<PublicCategory[]>({
    queryKey: ["public-catalog-categories", tenant_slug],
    enabled: !!tenant_slug && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_catalog_categories", {
        p_slug: tenant_slug!,
      });
      if (error) throw error;
      return (data as PublicCategory[]) || [];
    },
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery<PublicProduct[]>({
    queryKey: ["public-catalog-products", tenant_slug, search, categoryId],
    enabled: !!tenant_slug && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_catalog_products", {
        p_slug: tenant_slug!,
        p_search: search || null,
        p_category_id: categoryId,
        p_limit: 120,
        p_offset: 0,
      });
      if (error) throw error;
      return (data as PublicProduct[]) || [];
    },
  });

  const primary = tenant?.primary_color || "#C41E3A";
  const brand = tenant?.footer_company_name || tenant?.tenant_name || "Catálogo";
  const heroTitle = tenant?.hero_title || "Nossos Produtos";
  const heroSubtitle = tenant?.hero_subtitle || `Conheça os produtos de ${brand}`;
  const copyright =
    tenant?.footer_copyright || `© ${new Date().getFullYear()} ${brand}. Todos os direitos reservados.`;

  if (loadingTenant) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <Skeleton className="h-16 w-48 mb-8" />
          <Skeleton className="h-12 w-2/3 mb-4" />
          <Skeleton className="h-6 w-1/3 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tenantError || !tenant) return <NotFoundView />;

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;

  const handleAskQuote = (productId?: string) => {
    setSelectedProductId(productId || null);
    setLeadOpen(true);
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{ ["--catalog-primary" as any]: primary } as any}
    >
      <Helmet>
        <title>{`${brand} — Catálogo`}</title>
        {tenant.meta_description && (
          <meta name="description" content={tenant.meta_description} />
        )}
        <meta name="robots" content={tenant.catalogo_indexavel ? "index,follow" : "noindex,nofollow"} />
        <meta property="og:title" content={`${brand} — Catálogo`} />
        {tenant.meta_description && (
          <meta property="og:description" content={tenant.meta_description} />
        )}
        {tenant.logo_url && <meta property="og:image" content={tenant.logo_url} />}
        <link rel="canonical" href={`https://www.tendencitech.com.br/c/${tenant_slug}`} />
      </Helmet>

      <header
        className="border-b"
        style={{ borderColor: `${primary}30` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={brand} className="h-12 w-auto object-contain" />
          ) : (
            <div
              className="h-12 w-12 rounded-md flex items-center justify-center text-white font-bold"
              style={{ background: primary }}
            >
              {brand.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: primary }}>
              {brand}
            </h1>
          </div>
          <Button
            size="sm"
            onClick={() => handleAskQuote()}
            style={{ background: primary, color: "white" }}
          >
            Solicitar orçamento
          </Button>
        </div>
      </header>

      {tenant.banner_url && (
        <div className="w-full bg-muted">
          <img
            src={tenant.banner_url}
            alt=""
            className="w-full max-h-72 object-cover"
          />
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">{heroTitle}</h2>
          <p className="text-muted-foreground">{heroSubtitle}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6 max-w-3xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-9 pr-9 bg-background"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <Button
              variant={categoryId === null ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryId(null)}
              style={categoryId === null ? { background: primary, color: "white" } : undefined}
            >
              Todas
            </Button>
            {categories.map((c) => (
              <Button
                key={c.id}
                variant={categoryId === c.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryId(c.id)}
                style={
                  categoryId === c.id ? { background: primary, color: "white" } : undefined
                }
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}

        {loadingProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Nenhum produto disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => {
              const cover = p.image_url || (p.imagens && p.imagens[0]) || null;
              return (
                <Card
                  key={p.id}
                  className="overflow-hidden group hover:shadow-lg transition-shadow flex flex-col"
                >
                  <div className="aspect-square bg-muted overflow-hidden">
                    {cover ? (
                      <img
                        src={cover}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        Sem imagem
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    {p.category_name && (
                      <span className="text-xs text-muted-foreground">{p.category_name}</span>
                    )}
                    <h3 className="font-semibold leading-tight line-clamp-2">{p.name}</h3>
                    {p.descricao_curta && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {p.descricao_curta}
                      </p>
                    )}
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <span className="font-bold" style={{ color: primary }}>
                        {formatBRL(p.sale_price)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAskQuote(p.id)}
                      >
                        Orçar
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <footer className="bg-muted/40 border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-medium">{brand}</p>
            <div className="flex items-center gap-6">
              {tenant.whatsapp_url && (
                <a
                  href={tenant.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:opacity-80"
                  style={{ color: primary }}
                >
                  <Phone className="h-5 w-5" />
                  <span>WhatsApp</span>
                </a>
              )}
              {tenant.instagram_url && (
                <a
                  href={tenant.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:opacity-80"
                  style={{ color: primary }}
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

      <PublicLeadDialog
        open={leadOpen}
        onOpenChange={setLeadOpen}
        slug={tenant_slug!}
        productId={selectedProductId}
        productName={selectedProduct?.name || null}
        primaryColor={primary}
      />
    </div>
  );
}
