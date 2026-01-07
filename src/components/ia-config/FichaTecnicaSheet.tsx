import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet } from 'lucide-react';
import { EmbeddedFichaTecnica } from './EmbeddedFichaTecnica';

interface FichaTecnicaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionProductId: string | null;
  productName: string;
  initialStatus?: string;
  onClose?: () => void;
}

export function FichaTecnicaSheet({
  open,
  onOpenChange,
  productionProductId,
  productName,
  initialStatus = 'rascunho',
  onClose
}: FichaTecnicaSheetProps) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen && onClose) {
      onClose();
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Aprovado</Badge>;
      case 'finalizado':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Finalizado</Badge>;
      default:
        return <Badge variant="secondary">Rascunho</Badge>;
    }
  };

  if (!productionProductId) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span className="truncate">Ficha Técnica</span>
            {getStatusBadge()}
          </SheetTitle>
          <p className="text-sm text-muted-foreground truncate">{productName}</p>
        </SheetHeader>
        
        <div className="py-4">
          <EmbeddedFichaTecnica
            productionProductId={productionProductId}
            productName={productName}
            onStatusChange={setCurrentStatus}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
