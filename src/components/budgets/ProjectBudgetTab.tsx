import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Calculator, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateBudgetDialog } from "./CreateBudgetDialog";
import { BudgetEditor } from "./BudgetEditor";

interface ProjectBudgetTabProps {
  projectId: string;
}

export function ProjectBudgetTab({ projectId }: ProjectBudgetTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading, refetch } = useQuery({
    queryKey: ['project-budgets', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const selectedBudget = budgets.find(b => b.id === selectedBudgetId);

  if (selectedBudget) {
    const budgetForEditor = {
      ...selectedBudget,
      description: selectedBudget.notes
    };
    return (
      <BudgetEditor
        budget={budgetForEditor}
        onBack={() => setSelectedBudgetId(null)}
        onRefresh={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Orçamentos Técnicos
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os orçamentos detalhados deste projeto
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Orçamento
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : budgets.length > 0 ? (
        <div className="grid gap-3">
          {budgets.map(budget => {
            const grossPrice = (budget.total_cost || 0) * (1 + (budget.markup_percent || 0) / 100);
            const finalPrice = grossPrice * (1 - (budget.discount_percent || 0) / 100);

            return (
              <Card
                key={budget.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedBudgetId(budget.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{budget.name}</h4>
                      <Badge variant="outline" className={
                        budget.status === 'aprovado' ? 'bg-green-500/10 text-green-600' :
                        budget.status === 'recusado' ? 'bg-red-500/10 text-red-600' :
                        'bg-yellow-500/10 text-yellow-600'
                      }>
                        {budget.status === 'aprovado' ? 'Aprovado' :
                         budget.status === 'recusado' ? 'Recusado' : 'Rascunho'}
                      </Badge>
                    </div>
                    {budget.notes && (
                      <p className="text-sm text-muted-foreground truncate">{budget.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Criado {formatDistanceToNow(new Date(budget.created_at!), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Custo</p>
                    <p className="font-medium">
                      R$ {(budget.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Preço Final</p>
                    <p className="font-semibold text-primary">
                      R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Markup</p>
                    <p className="font-medium">{budget.markup_percent || 0}%</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-semibold mb-2">Nenhum orçamento técnico</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Crie um orçamento técnico detalhado para calcular custos de materiais, mão de obra e ferragens.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Criar Primeiro Orçamento
          </Button>
        </Card>
      )}

      <CreateBudgetDialog
        projectId={projectId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
