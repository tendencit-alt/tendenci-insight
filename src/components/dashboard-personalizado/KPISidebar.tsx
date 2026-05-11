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
  { id: "profissionais parceiros_ativos", name: "Profissionais Parceiros Ativos", description: "Total ativos", type: "numeric", icon: Users, category: "Profissionais Parceiros" },
];

interface KPISidebarProps {
  onAddKPI: (kpiId: string, type: "card" | "graph" | "table") => void;
}

export function KPISidebar({ onAddKPI }: KPISidebarProps) {
  const categories = Array.from(new Set(availableKPIs.map((kpi) => kpi.category)));

  return (
    <div className="w-80 border-r bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl">
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <h2 className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          KPIs Disponíveis
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Clique para adicionar ao canvas</p>
      </div>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="p-4 space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="font-bold text-xs text-muted-foreground mb-3 uppercase tracking-wider px-2">
                {category}
              </h3>
              <div className="space-y-2">
                {availableKPIs.filter((kpi) => kpi.category === category).map((kpi) => (
                  <Card 
                    key={kpi.id} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02] active:scale-95 group" 
                    onClick={() => onAddKPI(kpi.id, kpi.type === "numeric" ? "card" : kpi.type === "graph" ? "graph" : "table")}
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 transition-all">
                          <kpi.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold line-clamp-1">{kpi.name}</CardTitle>
                          <CardDescription className="text-xs line-clamp-2 mt-1.5">{kpi.description}</CardDescription>
                          <Badge variant="outline" className="mt-2.5 text-xs border-primary/30 bg-primary/5">
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
