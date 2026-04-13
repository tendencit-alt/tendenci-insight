import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Plus, CreditCard, FileText, ShoppingCart,
  Factory, UserPlus, Zap
} from "lucide-react";

const ACTIONS = [
  { label: "Novo Pedido", icon: ShoppingCart, path: "/pedidos", color: "text-blue-600" },
  { label: "Novo Lançamento", icon: CreditCard, path: "/financeiro", color: "text-green-600" },
  { label: "Novo Cliente", icon: UserPlus, path: "/pedidos", color: "text-purple-600" },
  { label: "Novo Orçamento", icon: FileText, path: "/pedidos", color: "text-orange-600" },
  { label: "Iniciar Produção", icon: Factory, path: "/producao", color: "text-amber-600" },
  { label: "Conciliar Extrato", icon: Zap, path: "/financeiro", color: "text-teal-600" },
];

export function QuickActionsBlock() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="justify-start h-9 text-xs gap-2"
              onClick={() => navigate(action.path)}
            >
              <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
