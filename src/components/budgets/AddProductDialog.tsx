import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileText, Package, Layers } from "lucide-react";

interface AddProductDialogProps {
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddProductDialog({ budgetId, open, onOpenChange, onSuccess }: AddProductDialogProps) {
  const [mode, setMode] = useState<"template" | "manual">("template");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ambiente, setAmbiente] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['budget-product-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_product_templates')
        .select('*, budget_template_lines(*)')
        .order('categoria')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "manual" && !name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    if (mode === "template" && !selectedTemplateId) {
      toast.error("Selecione um template");
      return;
    }

    setLoading(true);
    try {
      // Get max position
      const { data: existingProducts } = await supabase
        .from('budget_products')
        .select('position')
        .eq('budget_id', budgetId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (existingProducts?.[0]?.position || 0) + 1;

      if (mode === "manual") {
        // Create product manually
        const { error } = await supabase
          .from('budget_products')
          .insert({
            budget_id: budgetId,
            name: name.trim(),
            description: description.trim() || null,
            ambiente: ambiente.trim() || null,
            quantity: 1,
            position: nextPosition
          });

        if (error) throw error;
        toast.success("Produto adicionado!");
      } else {
        // Create from template
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) throw new Error("Template não encontrado");

        // Create the product
        const { data: newProduct, error: productError } = await supabase
          .from('budget_products')
          .insert({
            budget_id: budgetId,
            name: template.name,
            description: template.description,
            ambiente: ambiente.trim() || null,
            quantity: 1,
            position: nextPosition
          })
          .select()
          .single();

        if (productError) throw productError;

        // Get global costs for linking
        const { data: globalCosts } = await supabase
          .from('budget_global_costs')
          .select('id, code, value');

        const costMap = new Map(globalCosts?.map(c => [c.code, c]) || []);

        // Create lines from template
        if (template.budget_template_lines && template.budget_template_lines.length > 0) {
          const lines = template.budget_template_lines.map((line: any) => {
            const costRef = line.cost_ref_code ? costMap.get(line.cost_ref_code) : null;
            const unitCost = costRef?.value || 0;
            const quantity = line.default_quantity || 1;

            return {
              product_id: newProduct.id,
              line_name: line.line_name,
              line_type: line.line_type,
              quantity,
              unit: line.unit,
              unit_cost: unitCost,
              subtotal: quantity * unitCost,
              cost_ref_id: costRef?.id || null,
              cost_ref_code: line.cost_ref_code,
              position: line.position
            };
          });

          const { error: linesError } = await supabase
            .from('budget_product_lines')
            .insert(lines);

          if (linesError) throw linesError;
        }

        toast.success("Produto criado a partir do template!");
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar produto");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMode("template");
    setName("");
    setDescription("");
    setAmbiente("");
    setSelectedTemplateId(null);
  };

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const cat = template.categoria || 'outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, typeof templates>);

  const categoryLabels: Record<string, string> = {
    armarios: 'Armários',
    gabinetes: 'Gabinetes',
    gavetas: 'Gavetas',
    prateleiras: 'Prateleiras',
    paineis: 'Painéis',
    outros: 'Outros'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Produto ao Orçamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "template" | "manual")}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="template" className="gap-2">
                <Package className="h-4 w-4" />
                Usar Template
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Layers className="h-4 w-4" />
                Criar do Zero
              </TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="space-y-4 mt-4">
              {templatesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Carregando templates...
                </div>
              ) : templates.length > 0 ? (
                <RadioGroup value={selectedTemplateId || ""} onValueChange={setSelectedTemplateId}>
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                    {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                      <div key={category}>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          {categoryLabels[category] || category}
                        </h4>
                        <div className="space-y-2">
                          {categoryTemplates.map(template => (
                            <div
                              key={template.id}
                              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                                selectedTemplateId === template.id ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border'
                              }`}
                              onClick={() => setSelectedTemplateId(template.id)}
                            >
                              <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                              <div className="flex-1 min-w-0">
                                <Label htmlFor={template.id} className="font-medium cursor-pointer block">
                                  {template.name}
                                </Label>
                                {template.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="text-[10px]">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {template.budget_template_lines?.length || 0} linhas
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum template disponível.</p>
                  <p className="text-xs">Use a aba "Criar do Zero" para adicionar produtos manualmente.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Armário Superior 3 Portas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição detalhada do produto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="ambiente">Ambiente</Label>
            <Input
              id="ambiente"
              placeholder="Ex: Cozinha, Quarto, Sala..."
              value={ambiente}
              onChange={(e) => setAmbiente(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                "Adicionar Produto"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
