import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, ShoppingCart, FolderKanban, Wallet, HandCoins,
  Truck, FileBarChart, LayoutDashboard, Plug, Sparkles,
  CheckCircle2, Pencil, ExternalLink, Calendar, DollarSign,
} from "lucide-react";
import type { SearchResult, SearchEntityType } from "./types";

const ICONS: Record<SearchEntityType, any> = {
  client: Users,
  supplier: Truck,
  order: ShoppingCart,
  project: FolderKanban,
  expense: HandCoins,
  revenue: Wallet,
  payable: HandCoins,
  receivable: Wallet,
  goal: Sparkles,
  report: FileBarChart,
  dashboard: LayoutDashboard,
  ticket: Sparkles,
  integration: Plug,
  intent: Sparkles,
  action: ExternalLink,
};

const TYPE_LABEL: Record<SearchEntityType, string> = {
  client: "Cliente",
  supplier: "Fornecedor",
  order: "Pedido",
  project: "Projeto",
  expense: "Despesa",
  revenue: "Receita",
  payable: "Conta a Pagar",
  receivable: "Conta a Receber",
  goal: "Meta",
  report: "KPI",
  dashboard: "Dashboard",
  ticket: "Ticket",
  integration: "Integração",
  intent: "Ação Inteligente",
  action: "Ação",
};

interface Props {
  result: SearchResult;
  selected?: boolean;
  onSelect: (r: SearchResult) => void;
  onAction: (r: SearchResult, actionId: string) => void;
}

export function SearchResultItem({ result, selected, onSelect, onAction }: Props) {
  const navigate = useNavigate();
  const Icon = ICONS[result.type] || Sparkles;

  const handleOpen = () => {
    if (result.route) navigate(result.route);
    onSelect(result);
  };

  const quickActions = (() => {
    const acts: { id: string; label: string; icon: any }[] = [];
    if (result.route) acts.push({ id: "open", label: "Abrir", icon: ExternalLink });
    if (result.type === "payable") {
      acts.push({ id: "mark-paid", label: "Marcar pago", icon: CheckCircle2 });
      acts.push({ id: "reschedule", label: "Reagendar", icon: Calendar });
    }
    if (result.type === "receivable") {
      acts.push({ id: "mark-received", label: "Marcar recebido", icon: CheckCircle2 });
    }
    if (result.type === "order" || result.type === "project") {
      acts.push({ id: "view-margin", label: "Ver margem", icon: DollarSign });
    }
    if (result.type === "client" || result.type === "supplier") {
      acts.push({ id: "edit", label: "Editar", icon: Pencil });
    }
    return acts.slice(0, 3);
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => e.key === "Enter" && handleOpen()}
      className={`group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        selected ? "bg-primary/10" : "hover:bg-muted/60"
      }`}
    >
      <div className={`shrink-0 h-9 w-9 rounded-md flex items-center justify-center ${
        result.type === "intent" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{result.title}</span>
          {result.badge && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{result.badge}</Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{TYPE_LABEL[result.type]}</span>
        </div>
        {result.subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{result.subtitle}</p>
        )}
        {result.description && (
          <p className="text-xs text-foreground/70 mt-0.5">{result.description}</p>
        )}
        {quickActions.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {quickActions.map((a) => {
              const AIcon = a.icon;
              return (
                <Button
                  key={a.id}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(result, a.id);
                    if (a.id === "open") handleOpen();
                  }}
                >
                  <AIcon className="h-3 w-3 mr-1" />
                  {a.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
