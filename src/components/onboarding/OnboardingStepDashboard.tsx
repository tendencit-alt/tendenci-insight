import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Rocket, TrendingUp, Wallet, Target, DollarSign, PiggyBank } from "lucide-react";

interface Props {
  onComplete: () => void;
  completed?: boolean;
}

const KPIS = [
  { label: "Receita", icon: DollarSign, desc: "Faturamento total do período" },
  { label: "Margem Contribuição", icon: TrendingUp, desc: "Receita menos custos variáveis" },
  { label: "EBITDA", icon: Target, desc: "Resultado operacional antes de juros e impostos" },
  { label: "Resultado Econômico", icon: BarChart3, desc: "Lucro ou prejuízo do período" },
  { label: "Saldo Caixa", icon: Wallet, desc: "Dinheiro disponível hoje" },
  { label: "Burn Rate", icon: PiggyBank, desc: "Velocidade de consumo do caixa" },
];

export function OnboardingStepDashboard({ onComplete }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Dashboard Executivo
        </CardTitle>
        <CardDescription>Seu dashboard será alimentado automaticamente com os dados configurados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {KPIS.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="border rounded-lg p-4 text-center bg-accent/10">
                <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{kpi.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{kpi.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">
            🎉 Parabéns! Seu ERP está configurado e pronto para uso.
          </p>
          <Button size="lg" onClick={onComplete} className="bg-green-600 hover:bg-green-700">
            <Rocket className="h-5 w-5 mr-2" />
            Acessar meu ERP
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
