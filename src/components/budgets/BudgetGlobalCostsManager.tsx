import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save, Search } from "lucide-react";

const categoryLabels: Record<string, string> = {
  material: "Materiais",
  maquina: "Máquinas",
  mao_de_obra: "Mão de Obra",
  ferragem: "Ferragens"
};

const categoryColors: Record<string, string> = {
  material: "bg-blue-500/10 text-blue-600",
  maquina: "bg-purple-500/10 text-purple-600",
  mao_de_obra: "bg-orange-500/10 text-orange-600",
  ferragem: "bg-green-500/10 text-green-600"
};

interface GlobalCost {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  value: number;
  description: string | null;
  active: boolean;
}

export function BudgetGlobalCostsManager() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const queryClient = useQueryClient();

  const { data: costs = [], isLoading } = useQuery({
    queryKey: ['budget-global-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_global_costs')
        .select('*')
        .eq('active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as GlobalCost[];
    }
  });

  const updateCostMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase
        .from('budget_global_costs')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-global-costs'] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success("Custo atualizado! Todos os orçamentos foram recalculados.");
      setEditingId(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar custo");
    }
  });

  const handleEdit = (cost: GlobalCost) => {
    setEditingId(cost.id);
    setEditValue(cost.value);
  };

  const handleSave = (id: string) => {
    updateCostMutation.mutate({ id, value: editValue });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue(0);
  };

  const filteredCosts = costs.filter(cost =>
    cost.name.toLowerCase().includes(search.toLowerCase()) ||
    cost.code.toLowerCase().includes(search.toLowerCase())
  );

  const costsByCategory = filteredCosts.reduce((acc, cost) => {
    if (!acc[cost.category]) acc[cost.category] = [];
    acc[cost.category].push(cost);
    return acc;
  }, {} as Record<string, GlobalCost[]>);

  const categories = Object.keys(categoryLabels);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Variáveis Globais de Custo</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Ao alterar qualquer valor, todos os orçamentos que usam essa variável serão recalculados automaticamente.
      </p>

      <Tabs defaultValue="material" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat}>
              {categoryLabels[cat]} ({costsByCategory[cat]?.length || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-24">Unidade</TableHead>
                  <TableHead className="w-40 text-right">Valor (R$)</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costsByCategory[cat]?.map(cost => (
                  <TableRow key={cost.id}>
                    <TableCell>
                      <Badge variant="outline" className={categoryColors[cost.category]}>
                        {cost.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cost.name}</p>
                        {cost.description && (
                          <p className="text-xs text-muted-foreground">{cost.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cost.unit}</TableCell>
                    <TableCell className="text-right">
                      {editingId === cost.id ? (
                        <MoneyInput
                          value={editValue}
                          onChange={setEditValue}
                          className="w-32 text-right ml-auto"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">
                          {cost.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === cost.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSave(cost.id)}
                            disabled={updateCostMutation.isPending}
                          >
                            {updateCostMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={updateCostMutation.isPending}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(cost)}
                        >
                          Editar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma variável encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
