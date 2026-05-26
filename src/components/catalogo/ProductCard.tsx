import { Package, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  nome: string;
  descricao?: string;
  preco_base?: number;
  categoria?: string;
  imagem_url?: string;
  estoque?: number;
}

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onBuyNow: () => void;
}

export function ProductCard({ product, onClick, onBuyNow }: ProductCardProps) {
  const formatPrice = (price?: number) => {
    if (!price) return "Consulte";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const hasStock = (product.estoque ?? 0) > 0;

  return (
    <Card 
      className="group overflow-hidden bg-card border-border hover:shadow-xl transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="aspect-square relative overflow-hidden bg-muted/40">
        {product.imagem_url ? (
          <img
            src={product.imagem_url}
            alt={product.nome}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {hasStock && (
            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs font-medium">
              Pronta Entrega
            </Badge>
          )}
          {product.categoria && (
            <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-foreground text-xs">
              {product.categoria}
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-foreground line-clamp-2 min-h-[3rem] group-hover:text-[#C41E3A] transition-colors">
          {product.nome}
        </h3>

        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">
            {formatPrice(product.preco_base)}
          </span>
        </div>


        <Button
          onClick={(e) => {
            e.stopPropagation();
            onBuyNow();
          }}
          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-5 rounded-lg transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2"
        >
          <MessageCircle className="h-5 w-5" />
          Comprar com Consultor
        </Button>
      </div>
    </Card>
  );
}
