import { Headphones, UserCheck, BarChart3, Eye, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CRMView = "sdr" | "consultor" | "gestor";

export const CRM_VIEWS: { key: CRMView; label: string; icon: any; tagline: string }[] = [
  {
    key: "sdr",
    label: "Visão SDR",
    icon: Headphones,
    tagline: "Captação e qualificação de leads.",
  },
  {
    key: "consultor",
    label: "Visão Consultor",
    icon: UserCheck,
    tagline: "Funil, propostas e clientes.",
  },
  {
    key: "gestor",
    label: "Visão Gestor",
    icon: BarChart3,
    tagline: "KPIs, forecast e performance.",
  },
];

interface Props {
  value: CRMView;
  onChange: (view: CRMView) => void;
}

export function CRMViewSwitcher({ value, onChange }: Props) {
  const current = CRM_VIEWS.find((v) => v.key === value)!;
  const Icon = current.icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ver como</span>
          <span className="font-medium text-foreground">{current.label.replace("Visão ", "")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Mudar perspectiva
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CRM_VIEWS.map((v) => {
          const VIcon = v.icon;
          const active = v.key === value;
          return (
            <DropdownMenuItem
              key={v.key}
              onClick={() => onChange(v.key)}
              className={cn("flex items-start gap-2 py-2", active && "bg-muted/60")}
            >
              <VIcon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{v.label}</span>
                  {active && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{v.tagline}</p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
