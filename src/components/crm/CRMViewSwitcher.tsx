import { Headphones, UserCheck, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type CRMView = "sdr" | "consultor" | "gestor";

export const CRM_VIEWS: { key: CRMView; label: string; icon: any; tagline: string }[] = [
  {
    key: "sdr",
    label: "Visão SDR",
    icon: Headphones,
    tagline: "Você está captando e qualificando leads. Aqui ficam prospecção, tarefas e campanhas.",
  },
  {
    key: "consultor",
    label: "Visão Consultor",
    icon: UserCheck,
    tagline: "Você está vendendo e fechando. Aqui ficam seu funil, propostas e clientes.",
  },
  {
    key: "gestor",
    label: "Visão Gestor",
    icon: BarChart3,
    tagline: "Você está acompanhando o pipeline. Aqui ficam KPIs, forecast e performance.",
  },
];

interface Props {
  value: CRMView;
  onChange: (view: CRMView) => void;
}

export function CRMViewSwitcher({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
      {CRM_VIEWS.map((v) => {
        const Icon = v.icon;
        const active = value === v.key;
        return (
          <button
            key={v.key}
            type="button"
            onClick={() => onChange(v.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}
