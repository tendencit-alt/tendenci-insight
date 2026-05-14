import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Eye, Pencil, Package, History as HistoryIcon, ArrowRight } from "lucide-react";
import { logAudit } from "@/lib/auditLog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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

  // History state
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: auditEntries = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["category-audit-log"],
    enabled: historyOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .or(
          "table_name.eq.product_categories,and(table_name.eq.products,field_name.eq.category_id)"
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      // enrich with user names
      const userIds = Array.from(
        new Set((data ?? []).map((e: any) => e.user_id).filter(Boolean))
      );
      let profiles: Record<string, string> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profiles = Object.fromEntries(
          (profs ?? []).map((p: any) => [p.id, p.full_name || p.email || "—"])
        );
      }
      return (data ?? []).map((e: any) => ({
        ...e,
        user_name: e.user_id ? profiles[e.user_id] || "Usuário" : "Sistema",
      }));
    },
  });

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
      let reallocatedProductIds: string[] = [];
      const reallocatedToName =
        categories.find((c) => c.id === reallocateTo)?.name ?? null;

      // Reallocate products if needed
      if (deleteProductCount > 0 && reallocateTo) {
        // capture ids first so we can audit per product
        const { data: affected } = await supabase
          .from("products")
          .select("id")
          .eq("category_id", categoryToDelete.id);
        reallocatedProductIds = (affected ?? []).map((p) => p.id);

        const { error: updErr } = await supabase
          .from("products")
          .update({ category_id: reallocateTo })
          .eq("category_id", categoryToDelete.id);
        if (updErr) throw updErr;

        // Audit per product
        await Promise.all(
          reallocatedProductIds.map((pid) =>
            logAudit({
              table_name: "products",
              record_id: pid,
              event_type: "reallocate",
              field_name: "category_id",
              old_value: categoryToDelete.id,
              new_value: reallocateTo,
              metadata: {
                reason: "category_deleted",
                from_category_name: categoryToDelete.name,
                to_category_name: reallocatedToName,
              },
            })
          )
        );
      }

      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", categoryToDelete.id);
      if (error) throw error;

      // Audit category deletion (with reallocation summary)
      await logAudit({
        table_name: "product_categories",
        record_id: categoryToDelete.id,
        event_type: "delete",
        old_value: categoryToDelete.name,
        metadata: {
          name: categoryToDelete.name,
          reallocated_count: reallocatedProductIds.length,
          reallocated_to_id: reallocateTo || null,
          reallocated_to_name: reallocatedToName,
        },
      });

      toast({
        title: "Categoria removida",
        description:
          deleteProductCount > 0
            ? `${deleteProductCount} produto(s) realocado(s) com sucesso.`
            : undefined,
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["category-audit-log"] });
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
      const previousName = selectedCategory.name;
      const newNameValue = editName.trim();
      const { error } = await supabase
        .from("product_categories")
        .update({ name: newNameValue })
        .eq("id", selectedCategory.id);
      if (error) throw error;

      if (previousName !== newNameValue) {
        await logAudit({
          table_name: "product_categories",
          record_id: selectedCategory.id,
          event_type: "update",
          field_name: "name",
          old_value: previousName,
          new_value: newNameValue,
        });
      }

      toast({ title: "Categoria atualizada!" });
      setEditOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["category-products"] });
      queryClient.invalidateQueries({ queryKey: ["category-audit-log"] });
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
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Tem certeza que deseja remover a categoria{" "}
                  <span className="font-medium">"{categoryToDelete?.name}"</span>?
                </p>
                {deleteProductCount > 0 && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 space-y-2">
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium">
                        Esta categoria possui {deleteProductCount} produto(s) vinculado(s).
                        Selecione outra categoria para realocá-los antes de excluir.
                      </p>
                    </div>
                    <Select value={reallocateTo} onValueChange={setReallocateTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Realocar produtos para..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter((c) => c.id !== categoryToDelete?.id && c.active)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteLoading || (deleteProductCount > 0 && !reallocateTo)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {deleteProductCount > 0 ? "Realocar e remover" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
