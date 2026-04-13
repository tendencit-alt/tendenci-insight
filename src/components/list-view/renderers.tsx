import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, BADGE_DOT_COLORS } from "./types";
import type { StatusConfig, ListViewBadge } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Render a colored status badge */
export function renderStatus(config: StatusConfig | null | undefined) {
  if (!config) return null;
  return (
    <Badge className={`text-[11px] font-medium ${STATUS_COLORS[config.color] || STATUS_COLORS.gray}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${BADGE_DOT_COLORS[config.color] || BADGE_DOT_COLORS.gray}`} />
      {config.label}
    </Badge>
  );
}

/** Render contextual alert badges */
export function renderBadges(badges: ListViewBadge[] | undefined) {
  if (!badges?.length) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {badges.map((b, i) => (
        <Badge key={i} variant="outline" className={`text-[10px] h-4 ${STATUS_COLORS[b.color] || ""}`}>
          {b.icon && <b.icon className="h-2.5 w-2.5 mr-0.5" />}
          {b.label}
        </Badge>
      ))}
    </div>
  );
}

/** Format currency BRL */
export function renderCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Format date */
export function renderDate(value: string | null | undefined, pattern = "dd/MM/yyyy") {
  if (!value) return "—";
  try {
    return format(new Date(value), pattern, { locale: ptBR });
  } catch {
    return value;
  }
}

/** Format relative date */
export function renderShortDate(value: string | null | undefined) {
  return renderDate(value, "dd/MM/yy");
}
