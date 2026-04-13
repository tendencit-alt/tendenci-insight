import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCart, Check, Info, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  onComplete: () => void;
  completed?: boolean;
}

export function OnboardingStepPedido({ onComplete, completed }: Props) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Primeiro Pedido
          {completed && <Check className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>Crie seu primeiro pedido para ver o fluxo completo do ERP</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Ao criar um pedido, o sistema gera automaticamente:
            <ul className="list-disc ml-4 mt-2 space-y-1 text-xs">
              <li>Projeto financeiro vinculado</li>
              <li>Contas a receber (parcelas)</li>
              <li>Compromissos sobre venda (comissões, taxas)</li>
              <li>Lançamentos no Livro Razão</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button onClick={() => navigate("/pedidos")} variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" /> Ir para Pedidos
          </Button>
          <Button onClick={onComplete}>
            <Check className="h-4 w-4 mr-2" /> Marcar como concluído
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
