import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2, Check } from "lucide-react";
import { SEGMENT_LABELS, type BusinessSegment } from "./types";
import { useSmartOnboarding } from "@/hooks/useSmartOnboarding";
import { useOnboardingAnalytics } from "@/hooks/useOnboardingAnalytics";

const TEMPLATE_PREVIEWS: Record<BusinessSegment, string[]> = {
  servicos: ["Prestação de Serviços", "Pessoal e Encargos", "Estrutura"],
  comercio: ["Venda de Produtos", "CMV", "Impostos sobre Vendas"],
  industria: ["Venda de Produtos", "Matéria-Prima", "Mão de Obra Direta"],
  arquitetura: ["Projetos de Arquitetura", "Consultoria", "Equipe Técnica"],
  moveis_planejados: ["Venda de Móveis", "MDF/Ferragens", "Montagem", "Comissões"],
  personalizado: ["Apenas estrutura base de 6 raízes"],
};

export function AssistedChartTemplate() {
  const { onboarding, seedChartOfAccounts } = useSmartOnboarding();
  const { track } = useOnboardingAnalytics();
  const [selected, setSelected] = useState<BusinessSegment | null>(
    (onboarding?.chart_template as BusinessSegment) || (onboarding?.segment as BusinessSegment) || null,
  );

  const applied = !!onboarding?.chart_template;

  const handleApply = async () => {
    if (!selected) return;
    await track("chart_of_accounts", "started", { metadata: { template: selected } });
    await seedChartOfAccounts.mutateAsync(selected);
    await track("chart_of_accounts", "completed", { metadata: { template: selected } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Plano de Contas Assistido
          {applied && <Badge variant="outline" className="text-success border-success/40">Aplicado</Badge>}
        </CardTitle>
        <CardDescription>Escolha um modelo. Você poderá ajustar depois nas configurações.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {(Object.keys(SEGMENT_LABELS) as BusinessSegment[]).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                selected === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="text-sm font-semibold">{SEGMENT_LABELS[key]}</div>
              <ul className="mt-2 space-y-0.5">
                {TEMPLATE_PREVIEWS[key].map(p => (
                  <li key={p} className="text-[11px] text-muted-foreground">• {p}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <Button onClick={handleApply} disabled={!selected || seedChartOfAccounts.isPending}>
          {seedChartOfAccounts.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Aplicar plano de contas
        </Button>
      </CardContent>
    </Card>
  );
}
