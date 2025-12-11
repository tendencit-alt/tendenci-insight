import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Phone, Mail, MapPin, Globe, Edit, Trash2, Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { isMaster } = usePermissions();
  const { toast } = useToast();

  if (!supplier) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", supplier.id);

      if (error) throw error;

      toast({ title: "Fornecedor excluído com sucesso!" });
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      toast({ 
        title: "Erro ao excluir fornecedor", 
        description: error.message?.includes("violates foreign key") 
          ? "Este fornecedor possui registros vinculados. Considere desativá-lo em vez de excluir."
          : error.message, 
        variant: "destructive" 
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

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
              {isMaster && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              )}
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fornecedor</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja excluir o fornecedor <strong>{supplier.name}</strong>?</p>
              <p className="text-destructive">
                Esta ação não pode ser desfeita. Se o fornecedor possuir registros vinculados 
                (contatos, produtos, pedidos de compra), a exclusão falhará.
              </p>
              <p className="text-muted-foreground">
                💡 Dica: Considere desativar o fornecedor em vez de excluir para manter o histórico.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
