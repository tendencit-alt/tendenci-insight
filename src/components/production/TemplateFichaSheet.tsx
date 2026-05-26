import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileText,
  Package,
  Wrench,
  Plus,
  Trash2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { AddInsumoDialog } from "./AddInsumoDialog";
import { AddMaoObraDialog } from "./AddMaoObraDialog";

interface TemplateFichaSheetProps {
  templateId: string | null;
  onOpenChange: (open: boolean) => void;
}

interface BOMItem {
  id: string;
  production_product_id: string;
  tipo: string;
  insumo_nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  subtotal: number;
  product_id?: string;
  product?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface GroupedBOM {
  insumos: BOMItem[];
  mao_obra: BOMItem[];
  servicos: BOMItem[];
}

export function TemplateFichaSheet({
  templateId,
  onOpenChange,
}: TemplateFichaSheetProps) {
  const queryClient = useQueryClient();
  const [addInsumoOpen, setAddInsumoOpen] = useState(false);
  const [addMaoObraOpen, setAddMaoObraOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    insumos: true,
    mao_obra: true,
    servicos: true,
  });

  // Buscar dados do template
  const { data: template, isLoading: loadingTemplate } = useQuery({
    queryKey: ["template-ficha", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_products")
        .select(`
          *,
          product:products(id, code, name, category:product_categories(name))
        `)
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });

  // Buscar itens da BOM
  const { data: bomItems, isLoading: loadingBom } = useQuery({
    queryKey: ["template-bom", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_product_bom")
        .select(`
          *,
          product:products(id, code, name)
        `)
        .eq("production_product_id", templateId)
        .order("tipo")
        .order("descricao");

      if (error) throw error;
      return data as BOMItem[];
    },
    enabled: !!templateId,
  });

  // Agrupar itens por tipo
  const groupedBom = useMemo<GroupedBOM>(() => {
    const result: GroupedBOM = { insumos: [], mao_obra: [], servicos: [] };
    bomItems?.forEach((item) => {
      if (item.tipo === "insumo") result.insumos.push(item);
      else if (item.tipo === "mao_obra") result.mao_obra.push(item);
      else if (item.tipo === "servico") result.servicos.push(item);
    });
    return result;
  }, [bomItems]);

  // Calcular CMV total
  const cmvTotal = useMemo(() => {
    return bomItems?.reduce((acc, item) => acc + (item.subtotal || 0), 0) || 0;
  }, [bomItems]);

  // Mutation para deletar item
  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("production_product_bom")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item removido!");
      queryClient.invalidateQueries({ queryKey: ["template-bom", templateId] });
      setDeleteItemId(null);
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  // Mutation para aprovar ficha
  const approveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("production_products")
        .update({ 
          status: "aprovado",
          cmv_total: cmvTotal 
        })
        .eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ficha técnica padrão aprovada!");
      queryClient.invalidateQueries({ queryKey: ["template-ficha", templateId] });
      queryClient.invalidateQueries({ queryKey: ["template-fichas"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao aprovar: " + error.message);
    },
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderBOMTable = (items: BOMItem[], sectionKey: string, title: string, icon: React.ReactNode) => {
    if (items.length === 0) return null;

    const sectionTotal = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);

    return (
      <Collapsible
        open={expandedSections[sectionKey]}
        onOpenChange={() => toggleSection(sectionKey)}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
            <div className="flex items-center gap-2">
              {expandedSections[sectionKey] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {icon}
              <span className="font-medium">{title}</span>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <span className="text-sm font-medium">
              {sectionTotal.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Und</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                <TableCell>
                    {item.product ? (
                      <div>
                        <span className="font-medium">{item.product.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({item.product.code})
                        </span>
                      </div>
                    ) : (
                      item.insumo_nome
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantidade}</TableCell>
                  <TableCell>{item.unidade}</TableCell>
                  <TableCell className="text-right">
                    {item.custo_unitario.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.subtotal.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteItemId(item.id)}
                      aria-label="Remover item da ficha"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (!templateId) return null;

  return (
    <>
      <Sheet open={!!templateId} onOpenChange={(open) => !open && onOpenChange(false)}>
        <SheetContent className="sm:max-w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Ficha Técnica Padrão
            </SheetTitle>
          </SheetHeader>

          {loadingTemplate ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : template ? (
            <div className="space-y-6 py-4">
              {/* Info do produto */}
              <div className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Produto</p>
                    <p className="font-medium text-lg">
                      {template.product?.code} - {template.product?.name}
                    </p>
                    {template.product?.category && (
                      <Badge variant="outline" className="mt-1">
                        {template.product.category.name}
                      </Badge>
                    )}
                  </div>
                  <Badge
                    variant={template.status === "aprovado" ? "default" : "secondary"}
                  >
                    {template.status === "aprovado" ? "Aprovado" : "Rascunho"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">CMV Total</p>
                    <p className="text-xl font-bold text-primary">
                      {cmvTotal.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Itens</p>
                    <p className="text-xl font-bold">{bomItems?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddInsumoOpen(true)}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Adicionar Insumo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddMaoObraOpen(true)}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Adicionar Mão de Obra
                </Button>
                {template.status !== "aprovado" && bomItems && bomItems.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar Ficha
                  </Button>
                )}
              </div>

              {/* Lista de itens */}
              {loadingBom ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : bomItems && bomItems.length > 0 ? (
                <div className="space-y-4">
                  {renderBOMTable(
                    groupedBom.insumos,
                    "insumos",
                    "Insumos",
                    <Package className="h-4 w-4 text-blue-500" />
                  )}
                  {renderBOMTable(
                    groupedBom.mao_obra,
                    "mao_obra",
                    "Mão de Obra",
                    <Wrench className="h-4 w-4 text-orange-500" />
                  )}
                  {renderBOMTable(
                    groupedBom.servicos,
                    "servicos",
                    "Serviços",
                    <Plus className="h-4 w-4 text-green-500" />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum item cadastrado ainda.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Adicione insumos e mão de obra para compor a ficha técnica.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive">Ficha técnica não encontrada.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de adicionar insumo */}
      {templateId && (
        <AddInsumoDialog
          open={addInsumoOpen}
          onOpenChange={setAddInsumoOpen}
          productionProductId={templateId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["template-bom", templateId] });
          }}
        />
      )}

      {/* Dialog de adicionar mão de obra */}
      {templateId && (
        <AddMaoObraDialog
          open={addMaoObraOpen}
          onOpenChange={setAddMaoObraOpen}
          productionProductId={templateId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["template-bom", templateId] });
          }}
        />
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este item da ficha técnica?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemId && deleteMutation.mutate(deleteItemId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
