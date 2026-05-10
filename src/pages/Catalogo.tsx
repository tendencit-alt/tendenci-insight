import { useState, useEffect, useMemo } from "react";
import { Instagram, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CatalogoHeader } from "@/components/catalogo/CatalogoHeader";
import { ProductCard } from "@/components/catalogo/ProductCard";
import { ProductDetailModal } from "@/components/catalogo/ProductDetailModal";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function Catalogo() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [whatsappNumber] = useState("5534991312717");

  useEffect(() => {
    loadProducts();
    loadWhatsAppConfig();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, descricao_curta, descricao_longa, sale_price, image_url, imagens, galeria, current_stock, dimensoes, prazo_producao_dias, ativo_no_catalogo, category_id, product_categories(name)')
        .eq('ativo_no_catalogo', true)
        .eq('active', true)
        .order('name');

      if (error) throw error;

      const formattedProducts: Product[] = (data || []).map((p: any) => {
        const dim = (p.dimensoes && typeof p.dimensoes === 'object') ? p.dimensoes : {};
        const imagens = Array.isArray(p.imagens) && p.imagens.length
          ? p.imagens
          : Array.isArray(p.galeria) ? p.galeria : [];
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
          unidade_medida: dim.unidade ?? 'cm',
          ativo: true,
        };
      });

      setProducts(formattedProducts);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWhatsAppConfig = async () => {
    // Load default WhatsApp number - can be customized later
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter(p => p.categoria === selectedCategory);
  }, [products, selectedCategory]);

  const handleBuyNow = (product: Product) => {
    const price = product.preco_base 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.preco_base)
      : '';
    
    const message = encodeURIComponent(
      `Olá! Tenho interesse no produto: ${product.nome}${price ? ` - ${price}` : ''}`
    );
    
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <CatalogoHeader
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Nossos Produtos
          </h1>
          <p className="text-gray-600">
            Móveis em madeira maciça com qualidade premium
          </p>
        </div>

        {/* Products Grid */}
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
            <p className="text-gray-500 text-lg">
              {selectedCategory 
                ? `Nenhum produto encontrado na categoria "${selectedCategory}"`
                : "Nenhum produto cadastrado ainda"}
            </p>
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

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 font-medium">
              Tendenci Marcenaria
            </p>
            <div className="flex items-center gap-6">
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-[#C41E3A] transition-colors"
              >
                <Phone className="h-5 w-5" />
                <span>WhatsApp</span>
              </a>
              <a
                href="https://instagram.com/tendenci"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-[#C41E3A] transition-colors"
              >
                <Instagram className="h-5 w-5" />
                <span>Instagram</span>
              </a>
            </div>
          </div>
          <div className="text-center mt-6 text-sm text-gray-400">
            © {new Date().getFullYear()} Tendenci. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onBuyNow={handleBuyNow}
      />
    </div>
  );
}
