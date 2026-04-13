import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Check, Loader2 } from "lucide-react";

interface Props {
  onComplete: () => void;
  completed?: boolean;
}

const ESTRUTURA_PADRAO = [
  { code: "1", name: "Receitas", children: ["1.1 Venda de Produtos", "1.2 Prestação de Serviços", "1.3 Receita Recorrente", "1.4 Receita de Frete", "1.5 Outras Receitas"] },
  { code: "2", name: "Despesas sobre Vendas", children: ["2.1 Impostos sobre Vendas", "2.2 Devoluções", "2.3 Fretes sobre Vendas", "2.4 Compromissos sobre Venda"] },
  { code: "3", name: "Despesas Operacionais", children: ["3.1 Equipe", "3.2 Estrutura Física", "3.3 Tecnologia", "3.4 Marketing", "3.5 Serviços Externos", "3.6 Administrativo"] },
  { code: "4", name: "Depreciação e Amortização", children: [] },
  { code: "5", name: "Resultado Financeiro", children: ["5.1 Receitas Financeiras", "5.2 Despesas Financeiras"] },
  { code: "6", name: "Capital e Financiamentos", children: [] },
];

export function OnboardingStepPlanoContas({ onComplete, completed }: Props) {
  const [usePadrao, setUsePadrao] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    // The standard chart of accounts is already seeded via migrations
    // This step just confirms the user wants to use it
    setTimeout(() => {
      setSaving(false);
      onComplete();
    }, 800);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Plano de Contas
          {completed && <Check className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>Estrutura de categorias financeiras para DRE e Fluxo de Caixa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {usePadrao === null ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Deseja usar o plano de contas padrão? Ele já inclui toda a estrutura para DRE gerencial.</p>
            <div className="flex gap-3">
              <Button onClick={() => setUsePadrao(true)} className="flex-1">
                <Check className="h-4 w-4 mr-2" /> Sim, usar padrão
              </Button>
              <Button variant="outline" onClick={() => { setUsePadrao(false); onComplete(); }} className="flex-1">
                Configurar manualmente depois
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Estrutura que será ativada:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ESTRUTURA_PADRAO.map(cat => (
                <div key={cat.code} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px]">{cat.code}</Badge>
                    <span className="font-medium text-sm">{cat.name}</span>
                  </div>
                  {cat.children.length > 0 && (
                    <div className="space-y-0.5 ml-4">
                      {cat.children.map(c => (
                        <p key={c} className="text-xs text-muted-foreground">{c}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Confirmar Plano de Contas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
