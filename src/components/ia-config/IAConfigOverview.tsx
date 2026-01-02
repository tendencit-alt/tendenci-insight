import { Card, CardContent } from "@/components/ui/card";
import { Package, BookOpen, Shield, Zap } from "lucide-react";

interface IAConfigOverviewProps {
  produtosCount: number;
  conhecimentoCount: number;
  regrasCount: number;
  tecnicasCount: number;
}

export function IAConfigOverview({ 
  produtosCount, 
  conhecimentoCount, 
  regrasCount,
  tecnicasCount 
}: IAConfigOverviewProps) {
  const stats = [
    {
      label: "Produtos",
      value: produtosCount,
      icon: Package,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      label: "Conhecimento",
      value: conhecimentoCount,
      icon: BookOpen,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      label: "Regras",
      value: regrasCount,
      icon: Shield,
      color: "text-orange-500",
      bg: "bg-orange-500/10"
    },
    {
      label: "Técnicas",
      value: tecnicasCount,
      icon: Zap,
      color: "text-green-500",
      bg: "bg-green-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
