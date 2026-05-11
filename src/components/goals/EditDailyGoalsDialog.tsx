import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EditDailyGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface SellerGoal {
  id: string;
  full_name: string;
  email: string;
  meta_captacoes: number;
}

export function EditDailyGoalsDialog({ open, onOpenChange, onSuccess }: EditDailyGoalsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState<SellerGoal[]>([]);
  const [editedGoals, setEditedGoals] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      fetchSellers();
    }
  }, [open]);

  const fetchSellers = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os vendedores (não masters)
      const { data: sellersData, error: sellersError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .neq("role", "admin")
        .order("full_name");

      if (sellersError) throw sellersError;

      // Buscar metas diárias atuais de cada vendedor para hoje
      const today = new Date().toISOString().split('T')[0];
      const { data: goalsData, error: goalsError } = await supabase
        .from("tendenci_daily_architect_goals")
        .select("vendedor_id, meta_captacoes")
        .eq("data", today);

      if (goalsError) throw goalsError;

      // Criar mapa de metas por vendedor
      const goalsMap = new Map(goalsData?.map(g => [g.vendedor_id, g.meta_captacoes]) || []);

      // Combinar dados
      const sellersWithGoals = sellersData?.map(seller => ({
        id: seller.id,
        full_name: seller.full_name || seller.email,
        email: seller.email,
        meta_captacoes: goalsMap.get(seller.id) || 30, // Meta padrão de 30
      })) || [];

      setSellers(sellersWithGoals);
      
      // Inicializar metas editadas
      const initialGoals: Record<string, number> = {};
      sellersWithGoals.forEach(seller => {
        initialGoals[seller.id] = seller.meta_captacoes;
      });
      setEditedGoals(initialGoals);
    } catch (error: any) {
      console.error("Erro ao buscar vendedores:", error);
      toast({
        title: "Erro ao carregar vendedores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoalChange = (sellerId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditedGoals(prev => ({
      ...prev,
      [sellerId]: Math.max(0, numValue), // Não permitir valores negativos
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Atualizar meta de cada vendedor
      for (const seller of sellers) {
        const newGoal = editedGoals[seller.id];
        
        // Verificar se já existe meta para hoje
        const { data: existingGoal } = await supabase
          .from("tendenci_daily_architect_goals")
          .select("id")
          .eq("vendedor_id", seller.id)
          .eq("data", today)
          .maybeSingle();

        if (existingGoal) {
          // Atualizar meta existente
          const { error } = await supabase
            .from("tendenci_daily_architect_goals")
            .update({ meta_captacoes: newGoal })
            .eq("id", existingGoal.id);

          if (error) throw error;
        } else {
          // Criar nova meta
          const { error } = await supabase
            .from("tendenci_daily_architect_goals")
            .insert({
              vendedor_id: seller.id,
              data: today,
              meta_captacoes: newGoal,
              captacoes_realizadas: 0,
            });

          if (error) throw error;
        }
      }

      toast({
        title: "Metas atualizadas",
        description: "As metas diárias foram atualizadas com sucesso.",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar metas:", error);
      toast({
        title: "Erro ao salvar metas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Editar Metas Diárias de Captação
          </DialogTitle>
          <DialogDescription>
            Defina a meta diária de captação de profissionais parceiros para cada vendedor. A meta padrão é de 30 captações por dia.
          </DialogDescription>
        </DialogHeader>

        {loading && sellers.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">
              {sellers.map((seller) => (
                <Card key={seller.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      {seller.full_name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{seller.email}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label htmlFor={`goal-${seller.id}`} className="text-xs">
                          Meta de Captações Diárias
                        </Label>
                        <Input
                          id={`goal-${seller.id}`}
                          type="number"
                          min="0"
                          value={editedGoals[seller.id] || 0}
                          onChange={(e) => handleGoalChange(seller.id, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        captações/dia
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Metas
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
