import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Target, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

interface NoActiveGoalAlertProps {
  type: "sales" | "prospecting" | "company";
  currentMonth?: string;
  sellersWithoutGoals?: number;
  onCreateClick?: () => void;
}

export function NoActiveGoalAlert({ 
  type, 
  currentMonth,
  sellersWithoutGoals,
  onCreateClick 
}: NoActiveGoalAlertProps) {
  const { isMaster } = usePermissions();
  const navigate = useNavigate();

  const getMonthName = () => {
    if (currentMonth) {
      const [year, month] = currentMonth.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const monthName = getMonthName();

  if (isMaster) {
    return (
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-base font-semibold">
          ⚠️ Metas não configuradas para {monthName}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-sm">
            {sellersWithoutGoals && sellersWithoutGoals > 0 
              ? `${sellersWithoutGoals} vendedor(es) ainda não possuem metas configuradas para este mês.`
              : "Nenhuma meta foi configurada para o período atual."
            }
          </p>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => onCreateClick ? onCreateClick() : navigate('/metas/gestao')}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Configurar Metas
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-muted-foreground/30 bg-muted/50">
      <Target className="h-5 w-5 text-muted-foreground" />
      <AlertTitle className="text-base font-medium">
        Aguardando configuração de metas
      </AlertTitle>
      <AlertDescription className="text-sm text-muted-foreground">
        As metas para {monthName} ainda não foram configuradas pelo gestor.
        Seus dados serão atualizados assim que as metas forem definidas.
      </AlertDescription>
    </Alert>
  );
}