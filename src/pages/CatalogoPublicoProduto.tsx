import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ArrowLeft, Ruler, Clock } from "lucide-react";
import { PublicLeadDialog } from "@/components/catalogo-public/PublicLeadDialog";

interface PublicTenant {
  tenant_id: string;
  tenant_name: string;
  logo_url: string | null;
  footer_company_name: string | null;
  primary_color: string | null;
  catalogo_indexavel: boolean;
  meta_description: string | null;
}

interface PublicProductDetail {
  id: string;
  name: string;
  descricao_curta: string | null;
  descricao_longa: string | null;
  sale_price: number | null;
  image_url: string | null;
  imagens: string[] | null;
  dimensoes: any;
  prazo_producao_dias: number | null;
  category_id: string | null;
  category_name: string | null;
  tenant_id: string;
}

function formatBRL(v: number | null | undefined) {
  if (v == null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function NotFoundView({ slug }: { slug?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Produto não encontrado</h1>
        <p className="text-muted-foreground mb-6">
          Este produto não está mais disponível ou foi removido do catálogo.
        </p>
        <Button asChild variant="outline">
          <Link to={slug ? `/c/${slug}` : "/"}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao catálogo
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function CatalogoPublicoProduto() {
  const { tenant_slug, product_id } = useParams<{ tenant_slug: string; product_id: string }>();
  const [leadOpen, setLeadOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

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

  const { data: product, isLoading: loadingProduct, error: productError } = useQuery<PublicProductDetail | null>({
    queryKey: ["public-catalog-product", tenant_slug, product_id],
    enabled: !!tenant_slug && !!product_id && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_catalog_product", {
        p_slug: tenant_slug!,
        p_product_id: product_id!,
      });
      if (error) throw error;
      const row = (data as any[])?.[0];
      return (row as PublicProductDetail) || null;
    },
  });

  const primary = tenant?.primary_color || "#C41E3A";
  const brand = tenant?.footer_company_name || tenant?.tenant_name || "Catálogo";

  if (loadingTenant || loadingProduct) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tenantError || !tenant || productError || !product) {
    return <NotFoundView slug={tenant_slug} />;
  }

  const gallery = [
    ...(product.image_url ? [product.image_url] : []),
    ...((product.imagens || []).filter((u) => u && u !== product.image_url)),
  ];
  const cover = gallery[galleryIdx] || null;

  const dims = product.dimensoes && typeof product.dimensoes === "object" ? product.dimensoes : null;
  const dimsEntries = dims
    ? Object.entries(dims).filter(([_, v]) => v !== null && v !== undefined && v !== "")
    : [];

  const metaDesc =
    (product.descricao_curta || product.descricao_longa || "")
      .split("\n")[0]
      .slice(0, 160) || `${product.name} — ${brand}`;
  const pageTitle = `${product.name} — ${brand}`;
  const canonical = `https://www.tendencitech.com.br/c/${tenant_slug}/p/${product.id}`;

  return (
    <div
      className="min-h-screen bg-background"
      style={{ ["--catalog-primary" as any]: primary } as any}
    >
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDesc} />
        <meta
          name="robots"
          content={tenant.catalogo_indexavel ? "index,follow" : "noindex,nofollow"}
        />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonical} />
        {cover && <meta property="og:image" content={cover} />}
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: metaDesc,
            image: cover || undefined,
            category: product.category_name || undefined,
            brand: { "@type": "Brand", name: brand },
            offers: product.sale_price
              ? {
                  "@type": "Offer",
                  priceCurrency: "BRL",
                  price: product.sale_price,
                  availability: "https://schema.org/InStock",
                }
              : undefined,
          })}
        </script>
      </Helmet>

      <header className="border-b" style={{ borderColor: `${primary}30` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link to={`/c/${tenant_slug}`} className="flex items-center gap-3">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={brand} className="h-10 w-auto object-contain" />
            ) : (
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center text-white font-bold"
                style={{ background: primary }}
              >
                {brand.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-bold" style={{ color: primary }}>
              {brand}
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={`/c/${tenant_slug}`} className="hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Catálogo de {brand}
          </Link>
          <span>/</span>
          {product.category_name && (
            <>
              <span>{product.category_name}</span>
              <span>/</span>
            </>
          )}
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Galeria */}
          <div className="space-y-3">
            <div className="aspect-square bg-muted rounded-xl overflow-hidden relative">
              {cover ? (
                <img
                  src={cover}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Sem imagem
                </div>
              )}

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {gallery.map((url, i) => (
                  <button
                    key={url + i}
                    type="button"
                    onClick={() => setGalleryIdx(i)}
                    className={`aspect-square rounded-md overflow-hidden border-2 transition ${
                      i === galleryIdx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    style={i === galleryIdx ? { borderColor: primary } : undefined}
                    aria-label={`Imagem ${i + 1}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conteúdo */}
          <div className="space-y-5">
            {product.category_name && (
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {product.category_name}
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">{product.name}</h1>

            <div className="text-2xl md:text-3xl font-bold" style={{ color: primary }}>
              {formatBRL(product.sale_price)}
            </div>

            {product.descricao_curta && (
              <p className="text-base text-muted-foreground">{product.descricao_curta}</p>
            )}

            <Button
              size="lg"
              onClick={() => setLeadOpen(true)}
              style={{ background: primary, color: "white" }}
              className="w-full sm:w-auto"
            >
              Solicitar orçamento
            </Button>

            {(dimsEntries.length > 0 || product.prazo_producao_dias) && (
              <div className="rounded-lg border bg-card/50 p-4 space-y-3">
                <h3 className="font-semibold text-sm">Especificações</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {dimsEntries.map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2">
                      <Ruler className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <div className="text-muted-foreground capitalize text-xs">{k}</div>
                        <div className="font-medium">{String(v)}</div>
                      </div>
                    </div>
                  ))}
                  {product.prazo_producao_dias ? (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <div className="text-muted-foreground text-xs">Prazo de produção</div>
                        <div className="font-medium">
                          {product.prazo_producao_dias} dias
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {product.descricao_longa && (
              <div className="prose prose-sm max-w-none">
                <h3 className="font-semibold text-sm mb-2">Descrição</h3>
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {product.descricao_longa}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicLeadDialog
        open={leadOpen}
        onOpenChange={setLeadOpen}
        slug={tenant_slug!}
        productId={product.id}
        productName={product.name}
        primaryColor={primary}
      />
    </div>
  );
}
