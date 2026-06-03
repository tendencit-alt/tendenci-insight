import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Home, ChevronDown, ArrowRight } from "lucide-react";
import { useNavigationIntelligence } from "@/hooks/useNavigationIntelligence";
import { useNavigate } from "react-router-dom";

const ROUTE_LABELS: Record<string, string> = {
  "": "Home",
  "pedidos": "Pedidos",
  "financeiro": "Financeiro",
  "producao": "Produção",
  "fornecedores": "Fornecedores",
  "bi-dashboard": "Dashboard Executivo",
  "relatorios": "KPI's",
  "settings": "Configurações",
  "cadastros-financeiros": "Cadastros Financeiros",
  "aprovacoes": "Aprovações",
  "tarefas": "Tarefas",
  "users": "Usuários",
  "control-tower": "Control Tower",
  
  "benchmarking": "Benchmarking",
  "crm-comercial": "CRM",
  "estoque": "Estoque",
  "planning": "Planejamento",
  "executive": "Executivo",
  "projetos": "Projetos",
  "automacoes": "Automações",
  "auditoria": "Auditoria",
  "super-admin": "Owner Panel",
  "rh": "RH",
};

export function SmartBreadcrumb() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { breadcrumbActions, nextActions } = useNavigationIntelligence();

  if (pathname === "/" || pathname === "/central-navegacao") return null;

  const segments = pathname.split("/").filter(Boolean);
  const hasActions = breadcrumbActions.length > 0 || nextActions.length > 0;

  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" />
                <span className="text-xs">Home</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {segments.map((seg, i) => {
            const path = "/" + segments.slice(0, i + 1).join("/");
            const label = ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
            const isLast = i === segments.length - 1;
            return (
              <span key={path} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    hasActions ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary transition-colors">
                            {label}
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-56 p-1.5">
                          {breadcrumbActions.length > 0 && (
                            <div className="mb-1">
                              <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider px-2 py-1">Navegar</p>
                              {breadcrumbActions.map((a) => (
                                <button
                                  key={a.route}
                                  onClick={() => navigate(a.route)}
                                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-muted/60 transition-colors"
                                >
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          )}
                          {nextActions.length > 0 && (
                            <div>
                              {breadcrumbActions.length > 0 && <div className="border-t border-border/40 my-1" />}
                              <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider px-2 py-1">Próximas Ações</p>
                              {nextActions.slice(0, 3).map((a) => (
                                <button
                                  key={a.label}
                                  onClick={() => navigate(a.route)}
                                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-muted/60 transition-colors"
                                >
                                  <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                                  <div className="text-left">
                                    <p className="font-medium">{a.label}</p>
                                    <p className="text-[9px] text-muted-foreground">{a.reason}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <BreadcrumbPage className="text-xs">{label}</BreadcrumbPage>
                    )
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={path} className="text-xs">{label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Contextual next action chip */}
      {nextActions.length > 0 && (
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1 rounded-md text-primary hover:text-primary"
            onClick={() => navigate(nextActions[0].route)}
          >
            <ArrowRight className="h-3 w-3" />
            {nextActions[0].label}
          </Button>
        </div>
      )}
    </div>
  );
}
