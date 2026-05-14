import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Eye, Pencil, Package } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

interface Category {
  id: string;
  name: string;
  active: boolean;
  position: number;
}

interface Product {
  id: string;
  name: string;
  code: string | null;
  current_stock: number | null;
  min_stock: number | null;
  unit: string | null;
}

export default function CategoriesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  
  // View state
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  
  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteProductCount, setDeleteProductCount] = useState(0);
  const [reallocateTo, setReallocateTo] = useState<string>("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: categories = [], refetch } = useQuery({
    queryKey: ["product-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as Category[];
    }
  });

  // Fetch products for the selected category
  const { data: categoryProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["category-products", selectedCategory?.id],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, code, current_stock, min_stock, unit")
        .eq("category_id", selectedCategory.id)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!selectedCategory && viewOpen
  });

  const lowStockProducts = categoryProducts.filter(
    p => p.min_stock !== null && p.current_stock !== null && p.current_stock <= p.min_stock
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setLoading(true);
    try {
      const maxPosition = Math.max(0, ...categories.map((c) => c.position));
      const { error } = await supabase.from("product_categories").insert({
        name: newName.trim(),
        position: maxPosition + 1
      });
      if (error) throw error;

      toast({ title: "Categoria criada!" });
      setNewName("");
      refetch();
    } catch (error: any) {
      toast({ title: "Erro ao criar categoria", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    // Block delete if products exist and no reallocation target chosen
    if (deleteProductCount > 0 && !reallocateTo) {
      toast({
        title: "Realocação obrigatória",
        description: `Esta categoria possui ${deleteProductCount} produto(s). Selecione outra categoria para realocá-los.`,
        variant: "destructive",
      });
      return;
    }

    setDeleteLoading(true);
    try {
      // Reallocate products if needed
      if (deleteProductCount > 0 && reallocateTo) {
        const { error: updErr } = await supabase
          .from("products")
          .update({ category_id: reallocateTo })
          .eq("category_id", categoryToDelete.id);
        if (updErr) throw updErr;
      }

      const { error } = await supabase.from("product_categories").delete().eq("id", categoryToDelete.id);
      if (error) throw error;
      toast({
        title: "Categoria removida",
        description: deleteProductCount > 0
          ? `${deleteProductCount} produto(s) realocado(s) com sucesso.`
          : undefined,
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteOpen(false);
      setCategoryToDelete(null);
      setReallocateTo("");
      setDeleteProductCount(0);
    } catch (error: any) {
      toast({ title: "Erro ao remover categoria", description: error.message, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCategory || !editName.trim()) return;
    
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from("product_categories")
        .update({ name: editName.trim() })
        .eq("id", selectedCategory.id);
      if (error) throw error;
      
      toast({ title: "Categoria atualizada!" });
      setEditOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["category-products"] });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar categoria", description: error.message, variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("product_categories")
        .update({ active: !active })
        .eq("id", id);
      if (error) throw error;
      refetch();
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const openView = (cat: Category) => {
    setSelectedCategory(cat);
    setViewOpen(true);
  };

  const openEdit = (cat: Category) => {
    setSelectedCategory(cat);
    setEditName(cat.name);
    setEditOpen(true);
  };

  const openDelete = async (cat: Category) => {
    setCategoryToDelete(cat);
    setReallocateTo("");
    setDeleteProductCount(0);
    setDeleteOpen(true);
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", cat.id);
    setDeleteProductCount(count ?? 0);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Categorias de Itens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nova categoria..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={loading || !newName.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{cat.name}</span>
                  <Badge 
                    variant={cat.active ? "default" : "secondary"} 
                    className="cursor-pointer" 
                    onClick={() => toggleActive(cat.id, cat.active)}
                  >
                    {cat.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => openView(cat)}
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => openEdit(cat)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive" 
                    onClick={() => openDelete(cat)}
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View Sheet */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedCategory?.name}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            <Tabs defaultValue="todos">
              <TabsList className="w-full">
                <TabsTrigger value="todos" className="flex-1">
                  Todos os Itens ({categoryProducts.length})
                </TabsTrigger>
                <TabsTrigger value="estoque-minimo" className="flex-1">
                  Estoque Mínimo ({lowStockProducts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="todos" className="mt-4">
                {loadingProducts ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : categoryProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum item nesta categoria
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                        <TableHead className="text-right">Mínimo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.code && (
                                <p className="text-xs text-muted-foreground">{product.code}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {product.current_stock ?? 0} {product.unit || "un"}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.min_stock ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="estoque-minimo" className="mt-4">
                {loadingProducts ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : lowStockProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum item com estoque baixo nesta categoria
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                        <TableHead className="text-right">Mínimo</TableHead>
                        <TableHead className="text-right">Faltando</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.code && (
                                <p className="text-xs text-muted-foreground">{product.code}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-destructive font-medium">
                            {product.current_stock ?? 0} {product.unit || "un"}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.min_stock}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {(product.min_stock ?? 0) - (product.current_stock ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nome da categoria"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={editLoading || !editName.trim()}>
              {editLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a categoria "{categoryToDelete?.name}"? 
              Os itens vinculados a esta categoria ficarão sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
