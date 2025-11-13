import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  variant = "default",
  trend 
}: StatCardProps) {
  const variantStyles = {
    default: "from-primary/10 to-primary/5 text-primary",
    success: "from-success/10 to-success/5 text-success",
    warning: "from-warning/10 to-warning/5 text-warning",
    destructive: "from-destructive/10 to-destructive/5 text-destructive",
  };

  return (
    <Card className="group overflow-hidden shadow-card hover:shadow-hover transition-all duration-300 border-l-4 border-l-primary/50 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-4xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1.5 text-sm pt-2">
                <span className={cn(
                  "font-bold flex items-center gap-0.5 px-2 py-1 rounded-md",
                  trend.isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
                )}>
                  {trend.isPositive ? "↑" : "↓"} {trend.value}
                </span>
                <span className="text-muted-foreground text-xs">vs. anterior</span>
              </div>
            )}
          </div>
          <div className={cn(
            "rounded-2xl p-4 bg-gradient-to-br backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
            variantStyles[variant]
          )}>
            <Icon className="h-7 w-7" strokeWidth={2.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}