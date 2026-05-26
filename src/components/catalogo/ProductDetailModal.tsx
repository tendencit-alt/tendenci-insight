import { X, MessageCircle, Check, Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductGallery } from "./ProductGallery";

interface Product {
  id: string;
  nome: string;
  descricao?: string;
  preco_base?: number;
  categoria?: string;
  imagem_url?: string;
  galeria?: string[];
  videos?: string[];
  diferenciais?: string[];
  estoque?: number;
  largura?: number;
  comprimento?: number;
  altura?: number;
  unidade_medida?: string;
}

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBuyNow: (product: Product) => void;
}

export function ProductDetailModal({ product, open, onOpenChange, onBuyNow }: ProductDetailModalProps) {
  if (!product) return null;

  const formatPrice = (price?: number) => {
    if (!price) return "Consulte";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const hasStock = (product.estoque ?? 0) > 0;
  const images = [
    ...(product.imagem_url ? [product.imagem_url] : []),
    ...(product.galeria || [])
  ];

  const hasDimensions = product.largura || product.comprimento || product.altura;
  const unit = product.unidade_medida || 'm';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-white">
        <VisuallyHidden>
          <DialogTitle>{product.nome}</DialogTitle>
        </VisuallyHidden>
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Gallery Section */}
          <div className="p-6 bg-muted/40">
            <ProductGallery
              images={images}
              videos={product.videos}
              productName={product.nome}
            />
          </div>

          {/* Details Section */}
          <div className="p-6 flex flex-col">
            {/* Category & Stock Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {product.categoria && (
                <Badge variant="secondary" className="text-xs">
                  {product.categoria}
                </Badge>
              )}
              {hasStock && (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs">
                  Pronta Entrega
                </Badge>
              )}
            </div>

            {/* Product Name */}
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {product.nome}
            </h2>

            {/* Price */}
            <div className="mb-6">
              <span className="text-3xl md:text-4xl font-bold text-[#C41E3A]">
                {formatPrice(product.preco_base)}
              </span>
            </div>

            {/* Description */}
            {product.descricao && (
              <div className="mb-6">
                <p className="text-muted-foreground leading-relaxed">
                  {product.descricao}
                </p>
              </div>
            )}

            <Separator className="my-4" />

            {/* Diferenciais */}
            {product.diferenciais && product.diferenciais.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-3">Diferenciais</h3>
                <ul className="space-y-2">
                  {product.diferenciais.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-muted-foreground">
                      <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dimensions */}
            {hasDimensions && (
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Dimensões
                </h3>
                <div className="flex flex-wrap gap-4 text-muted-foreground">
                  {product.largura && (
                    <span>Largura: {product.largura}{unit}</span>
                  )}
                  {product.comprimento && (
                    <span>Comprimento: {product.comprimento}{unit}</span>
                  )}
                  {product.altura && (
                    <span>Altura: {product.altura}{unit}</span>
                  )}
                </div>
              </div>
            )}

            {/* Buy Button */}
            <div className="mt-auto pt-6">
              <Button
                onClick={() => onBuyNow(product)}
                className="w-full bg-[#C41E3A] hover:bg-[#A01830] text-white font-semibold py-6 text-lg rounded-xl transition-all duration-200 hover:shadow-xl flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                Comprar Agora via WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
