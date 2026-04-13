import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Receipt, Check, Info, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Props {
  onComplete: () => void;
  completed?: boolean;
}

const SUGESTOES = [
  { name: "Energia Elétrica", cat: "3.2 Estrutura Física" },
  { name: "Internet", cat: "3.3 Tecnologia" },
  { name: "Salários", cat: "3.1 Equipe" },
  { name: "Aluguel", cat: "3.2 Estrutura Física" },
];

export function OnboardingStepLancamento({ onComplete, completed }: Props) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Primeiro Lançamento Financeiro
          {completed && <Check className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>Registre uma despesa para ver o fluxo financeiro</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Sugestões de despesas comuns para começar:
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SUGESTOES.map(s => (
            <div key={s.name} className="border rounded-lg p-3 text-center">
              <p className="text-sm font-medium">{s.name}</p>
              <Badge variant="outline" className="text-[10px] mt-1">{s.cat}</Badge>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => navigate("/financeiro")} variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" /> Ir para Financeiro
          </Button>
          <Button onClick={onComplete}>
            <Check className="h-4 w-4 mr-2" /> Marcar como concluído
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
