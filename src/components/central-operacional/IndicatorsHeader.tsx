import { QuickIndicator } from "@/hooks/useCentralOperacional";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  indicators: QuickIndicator[];
  loading: boolean;
}

export function IndicatorsHeader({ indicators, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {indicators.map((ind, i) => (
        <Card key={i} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className={`text-2xl font-bold ${ind.color || "text-foreground"}`}>
              {ind.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{ind.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
