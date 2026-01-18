import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, BookOpen, Shield, Zap } from "lucide-react";
import { IAConfigKPIDetailDialog } from "./IAConfigKPIDetailDialog";

type KPIType = "produtos" | "conhecimento" | "regras" | "tecnicas";

interface IAConfigOverviewProps {
  produtosCount: number;
  conhecimentoCount: number;
  regrasCount: number;
  tecnicasCount: number;
  regrasData?: { tipo: string; descricao: string }[];
  tecnicasData?: { nome: string; descricao: string }[];
}

export function IAConfigOverview({ 
  produtosCount, 
  conhecimentoCount, 
  regrasCount,
  tecnicasCount,
  regrasData = [],
  tecnicasData = [],
}: IAConfigOverviewProps) {
  const [selectedKPI, setSelectedKPI] = useState<KPIType | null>(null);

  const stats: { key: KPIType; label: string; value: number; icon: typeof Package; color: string; bg: string }[] = [
    {
      key: "produtos",
      label: "Produtos",
      value: produtosCount,
      icon: Package,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      key: "conhecimento",
      label: "Conhecimento",
      value: conhecimentoCount,
      icon: BookOpen,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      key: "regras",
      label: "Regras",
      value: regrasCount,
      icon: Shield,
      color: "text-orange-500",
      bg: "bg-orange-500/10"
    },
    {
      key: "tecnicas",
      label: "Técnicas",
      value: tecnicasCount,
      icon: Zap,
      color: "text-green-500",
      bg: "bg-green-500/10"
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card 
            key={stat.key} 
            className="border-none shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
            onClick={() => setSelectedKPI(stat.key)}
          >
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

      <IAConfigKPIDetailDialog
        open={selectedKPI !== null}
        onOpenChange={(open) => !open && setSelectedKPI(null)}
        type={selectedKPI || "produtos"}
        regrasData={regrasData}
        tecnicasData={tecnicasData}
      />
    </>
  );
}
