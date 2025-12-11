import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, MapPin, Globe, Edit, Package, History } from "lucide-react";
import EditSupplierDialog from "./EditSupplierDialog";
import SupplierContacts from "./SupplierContacts";
import SupplierProducts from "./SupplierProducts";
import SupplierPurchaseHistory from "./SupplierPurchaseHistory";

interface SupplierDetailSheetProps {
  supplier: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function SupplierDetailSheet({ supplier, open, onOpenChange, onUpdate }: SupplierDetailSheetProps) {
  const [editOpen, setEditOpen] = useState(false);

  if (!supplier) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="flex flex-row items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{supplier.name}</SheetTitle>
              {supplier.trade_name && (
                <p className="text-sm text-muted-foreground">{supplier.trade_name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={supplier.active ? "default" : "secondary"}>
                {supplier.active ? "Ativo" : "Inativo"}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {supplier.cpf_cnpj && (
                  <div>
                    <span className="text-muted-foreground">CNPJ/CPF:</span>
                    <span className="ml-2 font-mono">{supplier.cpf_cnpj}</span>
                  </div>
                )}
                {supplier.inscricao_estadual && (
                  <div>
                    <span className="text-muted-foreground">IE:</span>
                    <span className="ml-2">{supplier.inscricao_estadual}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${supplier.phone}`} className="hover:underline">{supplier.phone}</a>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${supplier.email}`} className="hover:underline">{supplier.email}</a>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={supplier.website} target="_blank" rel="noopener" className="hover:underline">
                      {supplier.website}
                    </a>
                  </div>
                )}
                {(supplier.logradouro || supplier.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      {supplier.logradouro && <p>{supplier.logradouro}, {supplier.numero}</p>}
                      {supplier.bairro && <p>{supplier.bairro}</p>}
                      {supplier.city && <p>{supplier.city}/{supplier.state} - CEP {supplier.cep}</p>}
                    </div>
                  </div>
                )}
                {supplier.payment_terms && (
                  <div>
                    <span className="text-muted-foreground">Prazo Pagamento:</span>
                    <span className="ml-2">{supplier.payment_terms}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="contacts">
              <TabsList className="w-full">
                <TabsTrigger value="contacts" className="flex-1">Contatos</TabsTrigger>
                <TabsTrigger value="products" className="flex-1">Produtos</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">Compras</TabsTrigger>
              </TabsList>

              <TabsContent value="contacts">
                <SupplierContacts supplierId={supplier.id} />
              </TabsContent>

              <TabsContent value="products">
                <SupplierProducts supplierId={supplier.id} />
              </TabsContent>

              <TabsContent value="history">
                <SupplierPurchaseHistory supplierId={supplier.id} />
              </TabsContent>
            </Tabs>

            {supplier.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <EditSupplierDialog
        supplier={supplier}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          onUpdate();
          setEditOpen(false);
        }}
      />
    </>
  );
}
