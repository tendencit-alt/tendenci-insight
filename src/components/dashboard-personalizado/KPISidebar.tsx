import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, DollarSign, Users, Package, Target, PhoneCall,
  FileText, PresentationIcon, XCircle, CheckCircle, BarChart3, PieChart, Calendar
} from "lucide-react";

interface KPI {
  id: string;
  name: string;
  description: string;
  type: "numeric" | "graph" | "table";
  icon: any;
  category: string;
}

const availableKPIs: KPI[] = [
  { id: "crm_contatos_feitos", name: "Contatos Feitos", description: "Total de contatos realizados", type: "numeric", icon: PhoneCall, category: "CRM" },
  { id: "crm_projetos_captados", name: "Projetos Captados", description: "Quantidade captada", type: "numeric", icon: Target, category: "CRM" },
  { id: "crm_em_orcamento", name: "Em Orçamento", description: "Negócios em orçamento", type: "numeric", icon: FileText, category: "CRM" },
  { id: "crm_conquistado", name: "Conquistados", description: "Negócios ganhos", type: "numeric", icon: CheckCircle, category: "CRM" },
  { id: "crm_valor_conquistado", name: "Valor Conquistado", description: "Valor total ganho", type: "numeric", icon: DollarSign, category: "CRM" },
  { id: "projetos_aprovado", name: "Projetos Aprovados", description: "Total aprovados", type: "numeric", icon: CheckCircle, category: "Projetos" },
  { id: "arquitetos_ativos", name: "Arquitetos Ativos", description: "Total ativos", type: "numeric", icon: Users, category: "Arquitetos" },
];

interface KPISidebarProps {
  onAddKPI: (kpiId: string, type: "card" | "graph" | "table") => void;
}

export function KPISidebar({ onAddKPI }: KPISidebarProps) {
  const categories = Array.from(new Set(availableKPIs.map((kpi) => kpi.category)));

  return (
    <div className="w-80 border-r bg-background/95 backdrop-blur">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">KPIs Disponíveis</h2>
        <p className="text-sm text-muted-foreground">Clique para adicionar</p>
      </div>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="p-4 space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase">{category}</h3>
              <div className="space-y-2">
                {availableKPIs.filter((kpi) => kpi.category === category).map((kpi) => (
                  <Card key={kpi.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary" onClick={() => onAddKPI(kpi.id, kpi.type === "numeric" ? "card" : kpi.type === "graph" ? "graph" : "table")}>
                    <CardHeader className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <kpi.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm line-clamp-1">{kpi.name}</CardTitle>
                          <CardDescription className="text-xs line-clamp-2 mt-1">{kpi.description}</CardDescription>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {kpi.type === "numeric" ? "Numérico" : kpi.type === "graph" ? "Gráfico" : "Tabela"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
