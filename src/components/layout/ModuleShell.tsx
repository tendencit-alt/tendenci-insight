import { ReactNode, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
  ListChecks,
  Zap,
  Settings as SettingsIcon,
  Plug,
  BarChart3,
  Construction,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * ModuleShell — Estrutura padrão obrigatória de TODOS os módulos do ERP.
 * Hierarquia única: Visão Geral → Registros → Ações → Configurações → Integrações → KPI's.
 *
 * Regras:
 * - Ordem das seções é FIXA. Não reordenar.
 * - Nomes das seções são FIXOS. Não renomear.
 * - Seções sem conteúdo aparecem como "Em breve" (placeholder), nunca são ocultadas.
 * - Aba ativa é persistida via URL `?section=`.
 * - Conteúdo é renderizado sob demanda (lazy) — só monta a aba ativa.
 */

export type ModuleSectionKey =
  | "overview"
  | "records"
  | "actions"
  | "settings"
  | "integrations"
  | "reports";

export interface ModuleShellProps {
  /** Identificador interno (ex: "pedidos") usado para storage local. */
  moduleKey: string;
  /** Nome exibido no header. */
  title: string;
  /** Subtítulo curto descrevendo o módulo. */
  description?: string;
  /** Ícone do módulo (lucide). */
  icon?: ReactNode;
  /** Ações globais do módulo (botões à direita do header). */
  headerActions?: ReactNode;

  /** Barra de filtros padrão — renderizada entre as abas e o conteúdo, sempre visível. */
  filters?: ReactNode;

  /** Slots de conteúdo. Quando ausente → placeholder "Em breve". */
  overview?: ReactNode;
  records?: ReactNode;
  actions?: ReactNode;
  settings?: ReactNode;
  integrations?: ReactNode;
  reports?: ReactNode;

  /** Aba inicial caso não haja `?section=` na URL. Default: "records". */
  defaultSection?: ModuleSectionKey;
  /** Oculta a aba KPI's (Relatórios) deste módulo. */
  hideReports?: boolean;
}


// Simplificação MVP: apenas Registros e KPI's são exibidos.
// As demais seções (Visão Geral, Ações, Configurações, Integrações) ficam ocultas
// mas continuam aceitando conteúdo via URL `?section=`. Reverter trocando MVP_VISIBLE_SECTIONS.
const MVP_VISIBLE_SECTIONS: ModuleSectionKey[] = ["records", "reports"];

const SECTION_ORDER: {
  key: ModuleSectionKey;
  label: string;
  icon: ReactNode;
  hint: string;
}[] = [
  { key: "overview", label: "Visão Geral", icon: <LayoutDashboard className="h-4 w-4" />, hint: "Indicadores, resumo operacional e alertas." },
  { key: "records", label: "Registros", icon: <ListChecks className="h-4 w-4" />, hint: "Lista principal, filtros e busca." },
  { key: "actions", label: "Ações", icon: <Zap className="h-4 w-4" />, hint: "Operações em massa, workflows e execuções." },
  { key: "settings", label: "Configurações", icon: <SettingsIcon className="h-4 w-4" />, hint: "Regras, parâmetros e definições." },
  { key: "integrations", label: "Integrações", icon: <Plug className="h-4 w-4" />, hint: "Entrada/saída de dados, APIs e sincronizações." },
  { key: "reports", label: "KPI's", icon: <BarChart3 className="h-4 w-4" />, hint: "Análises, comparações e indicadores." },
];

function ComingSoon({ label, hint }: { label: string; hint: string }) {
  return (
    <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{label}</h3>
      <Badge variant="secondary" className="mb-3">Em breve</Badge>
      <p className="text-sm text-muted-foreground max-w-md">{hint}</p>
    </Card>
  );
}

export function ModuleShell({
  moduleKey,
  title,
  description,
  icon,
  headerActions,
  filters,
  overview,
  records,
  actions,
  settings,
  integrations,
  reports,
  defaultSection = "records",
  hideReports = false,
}: ModuleShellProps) {

  const [searchParams, setSearchParams] = useSearchParams();

  const slots: Record<ModuleSectionKey, ReactNode> = {
    overview,
    records,
    actions,
    settings,
    integrations,
    reports,
  };

  const urlSection = searchParams.get("section") as ModuleSectionKey | null;
  const storageKey = `erp_module_section_${moduleKey}`;
  const stored = (typeof window !== "undefined"
    ? (localStorage.getItem(storageKey) as ModuleSectionKey | null)
    : null);

  const visibleSections = SECTION_ORDER.filter(
    (s) => MVP_VISIBLE_SECTIONS.includes(s.key) && !(hideReports && s.key === "reports"),
  );


  const isVisible = (k: ModuleSectionKey | null | undefined) =>
    !!k && visibleSections.some((s) => s.key === k);

  const initial: ModuleSectionKey = isVisible(urlSection)
    ? (urlSection as ModuleSectionKey)
    : isVisible(stored)
      ? (stored as ModuleSectionKey)
      : isVisible(defaultSection)
        ? defaultSection
        : visibleSections[0].key;

  const handleChange = (value: string) => {
    const next = value as ModuleSectionKey;
    const params = new URLSearchParams(searchParams);
    params.set("section", next);
    setSearchParams(params, { replace: true });
    try {
      localStorage.setItem(storageKey, next);
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Header padrão */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
      </div>

      <Tabs value={initial} onValueChange={handleChange} className="w-full">
        <TabsList
          className={cn(
            "grid w-full h-auto",
            visibleSections.length === 1 && "grid-cols-1",
            visibleSections.length === 2 && "grid-cols-2",
            visibleSections.length >= 3 && "grid-cols-3 md:grid-cols-6",
          )}
        >
          {visibleSections.map((s) => {
            const empty = !slots[s.key] && !(s.key === "records" && overview);
            return (
              <TabsTrigger
                key={s.key}
                value={s.key}
                className={cn("flex items-center gap-2 py-2", empty && "opacity-60")}
                title={empty ? `${s.label} — Em breve` : s.label}
              >
                {s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {filters && (
          <div className="mt-3 rounded-lg border bg-card/50 px-3 py-2 md:px-4 md:py-3">
            {filters}
          </div>
        )}

        {visibleSections.map((s) => (
          <TabsContent key={s.key} value={s.key} className="mt-4">
            {initial === s.key ? (
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                {s.key === "records" ? (
                  <div className="space-y-4">
                    {overview /* KPIs ficam acima da tabela, abaixo dos filtros */}
                    {slots.records ?? <ComingSoon label={s.label} hint={s.hint} />}
                  </div>
                ) : (
                  slots[s.key] ?? <ComingSoon label={s.label} hint={s.hint} />
                )}
              </Suspense>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
