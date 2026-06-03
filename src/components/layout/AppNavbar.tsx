import { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationUsage } from "@/hooks/useNavigationUsage";
import { LayoutGrid } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";

import { TenantSwitcher } from "@/components/layout/TenantSwitcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  User,
  Menu,
  ChevronDown,
  Sun,
  Moon,
  Building2,
  ShoppingCart,
  Factory,
  Wallet,
  Scale,
  Target,
  Database,
  BarChart3,
  Settings,
  Home,
  Search,
  Crown,
} from "lucide-react";
import { useVisibleModuleGroups, MODULE_ROUTE_MAP } from "@/hooks/useModulesConfig";
import { commandBarStore } from "@/components/command/CommandBar";
import { useTheme } from "next-themes";
import { useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { ComingSoonBadge, ComingSoonItem, isComingSoon } from "@/lib/comingSoon";

// ── Owner accordion persistence ──
const OWNER_ACCORDION_KEY = "erp_owner_accordion_open";
// ── Main modules accordion persistence ──
const MAIN_ACCORDION_KEY = "erp_main_accordion_open";
interface ModuleItem {
  label: string;
  route: string;
  icon: keyof typeof LucideIcons;
  module?: string;
  available: boolean;
}

interface ModuleSection {
  title: string;
  description?: string;
  items: ModuleItem[];
}

interface ModuleGroup {
  key: string;
  label: string;
  icon: React.ElementType;
  items: ModuleItem[];
  sections?: ModuleSection[];
  requiredModules?: string[];
  masterOnly?: boolean;
  ownerOnly?: boolean;
}

const OPERATIONAL_ROUTE_ORDER = [
  "/producao-operacoes",
  "/compras",
  "/estoque",
  "/entregas-montagem",
];

const ERP_MODULES: ModuleGroup[] = [
  {
    key: "comercial",
    label: "Comercial",
    icon: ShoppingCart,
    requiredModules: ["pedidos"],
    items: [
      { label: "CRM", route: "/crm", icon: "Target", module: "comercial", available: true },
      { label: "Pedidos", route: "/pedidos", icon: "ClipboardList", module: "pedidos", available: true },
      { label: "Clientes / Fornecedores", route: "/clientes", icon: "Users", module: "comercial", available: true },
      { label: "Catálogo de Produtos", route: "/catalogo", icon: "BookOpen", module: "comercial", available: true },
      { label: "Leads", route: "/crm?view=sdr&tab=leads", icon: "UserPlus", module: "comercial", available: true },
      
    ],
  },
  {
    key: "operacional",
    label: "Operacional",
    icon: Factory,
    requiredModules: ["producao", "operacional"],
    items: [
      { label: "Produção / Operações", route: "/producao-operacoes", icon: "Factory", module: "operacional", available: true },
      { label: "Compras", route: "/compras", icon: "Package", module: "operacional", available: true },
      { label: "Estoque", route: "/estoque", icon: "Layers", module: "operacional", available: true },
      { label: "Entregas & Montagem", route: "/entregas-montagem", icon: "Truck", module: "operacional", available: true },
      
      { label: "Ordens de Produção", route: "/ordens-producao", icon: "ListChecks", available: false },
      { label: "Execução / Obras", route: "/execucao-obras", icon: "HardHat", available: false },
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: Wallet,
    requiredModules: ["financeiro"],
    items: [
      { label: "Contas a Pagar e Receber", route: "/financeiro?tab=obligations", icon: "ArrowUpCircle", module: "financeiro", available: true },
      { label: "Tesouraria", route: "/financeiro?tab=treasury", icon: "Landmark", module: "financeiro", available: true },
      { label: "Conciliação Bancária", route: "/financeiro?tab=reconciliation", icon: "GitCompare", module: "financeiro", available: true },
      { label: "Fluxo de Caixa", route: "/financeiro?tab=cashflow", icon: "TrendingUp", module: "financeiro", available: true },
      { label: "DRE Gerencial", route: "/financeiro?tab=dre", icon: "BarChart2", module: "financeiro", available: true },
      { label: "Resultado Financeiro", route: "/financeiro?tab=financial-result", icon: "DollarSign", module: "financeiro", available: true },
      { label: "Capital e Financiamentos", route: "/financeiro?tab=capital", icon: "Banknote", module: "financeiro", available: true },
      { label: "Plano de Contas", route: "/cadastros-financeiros?tab=chart", icon: "BookOpen", module: "cadastros_financeiros", available: true },
      { label: "Cadastros Financeiros", route: "/cadastros-financeiros?tab=bank-accounts", icon: "Database", module: "cadastros_financeiros", available: true },
    ],
  },
  {
    key: "controladoria",
    label: "Controladoria",
    icon: Scale,
    requiredModules: ["cadastros_financeiros"],
    items: [
      { label: "Contas Bancárias", route: "/cadastros-financeiros?tab=bank-accounts", icon: "Landmark", module: "cadastros_financeiros", available: true },
      { label: "Plano de Contas", route: "/cadastros-financeiros?tab=chart", icon: "BookOpen", module: "cadastros_financeiros", available: true },
      { label: "Centros de Custo", route: "/cadastros-financeiros?tab=cost-centers", icon: "Building", module: "cadastros_financeiros", available: true },
      { label: "Projetos Financeiros", route: "/cadastros-financeiros?tab=projects", icon: "Briefcase", module: "cadastros_financeiros", available: true },
      { label: "Compromissos sobre Venda", route: "/cadastros-financeiros?tab=commitments", icon: "FolderCog", module: "cadastros_financeiros", available: true },
      
      { label: "Taxas de Cartão", route: "/cadastros-financeiros?tab=card-rates", icon: "CreditCard", module: "cadastros_financeiros", available: true },
      { label: "Automação por Origem", route: "/cadastros-financeiros?section=settings&tab=origin-rules", icon: "Sparkles", module: "cadastros_financeiros", available: true },
      { label: "Automações por Evento", route: "/cadastros-financeiros?section=settings&tab=event-automations", icon: "Bot", module: "cadastros_financeiros", available: true },
      { label: "Permissões Financeiras", route: "/cadastros-financeiros?section=settings&tab=permissions", icon: "Shield", module: "cadastros_financeiros", available: true },
    ],
  },
  {
    key: "planejamento",
    label: "Planejamento",
    icon: Target,
    requiredModules: ["financeiro"],
    items: [
      { label: "Metas", route: "/financeiro?tab=goals", icon: "Target", module: "financeiro", available: true },
      { label: "Orçamento", route: "/financeiro?tab=budget", icon: "Calculator", available: false },
      { label: "Forecast", route: "/financeiro?tab=forecast", icon: "TrendingUp", available: false },
    ],
  },
  {
    key: "cadastros",
    label: "Cadastros",
    icon: Database,
    requiredModules: ["fornecedores", "estoque"],
    items: [
      { label: "Clientes", route: "/cadastros-clientes", icon: "UserCircle", available: false },
      { label: "Produtos", route: "/estoque", icon: "Package", module: "estoque", available: true },
      { label: "Contas Bancárias", route: "/financeiro?tab=treasury", icon: "Landmark", module: "financeiro", available: true },
      { label: "Estrutura Organizacional", route: "/estrutura-organizacional", icon: "Network", available: false },
    ],
  },
  {
    key: "relatorios",
    label: "KPI's e BI",
    icon: BarChart3,
    requiredModules: ["dashboard"],
    items: [
      { label: "BI", route: "/dashboard", icon: "LayoutDashboard", module: "dashboard", available: true },
      { label: "KPI's", route: "/relatorios", icon: "FileSpreadsheet", module: "dashboard", available: true },
    ],
  },
  {
    key: "configuracoes",
    label: "Configurações",
    icon: Settings,
    masterOnly: true,
    items: [
      { label: "Usuários", route: "/settings/users", icon: "Users", module: "configuracoes", available: true },
      { label: "Permissões", route: "/settings", icon: "Shield", module: "configuracoes", available: true },
      { label: "Financeiro", route: "/configuracoes?tab=financeiro", icon: "Landmark", module: "configuracoes", available: true },
      { label: "Integrações", route: "/integracoes", icon: "Plug", available: false },
    ],
  },
  {
    key: "owner",
    label: "Owner",
    icon: Building2,
    ownerOnly: true,
    items: [],
    sections: [
      {
        title: "Operação do SaaS",
        description: "Visão e gestão essencial dos tenants",
        items: [
          { label: "Owner Control Tower", route: "/owner/control-tower", icon: "Landmark", available: true },
          { label: "Empresas / Tenants", route: "/super-administrador?tab=tenants", icon: "Building2", available: true },
          { label: "Planos & Módulos", route: "/super-administrador?tab=plan-modules", icon: "Package", available: true },
        ],
      },
    ],
  },
];

// Advanced/legacy owner items intentionally hidden from the slim Painel Master menu.
// Routes remain registered in App.tsx and can be re-enabled here later if needed.

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-8 w-8 hover:bg-muted/50"
      title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function AppNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasModuleAccess, loading, isMaster, isOwner } = usePermissions();
  const { profile, user, signOut } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const companyLogo = companySettings?.logo_url;
  const companyName = companySettings?.trade_name || companySettings?.company_name || "Sistema";
  const normalizedRole = profile?.role?.toLowerCase().trim() ?? "";
  const SYSTEM_OWNER_EMAIL = "pablo@tendenci.com.br";
  const canSeeOwnerMenu = user?.email?.toLowerCase().trim() === SYSTEM_OWNER_EMAIL;
  const ownerModule = ERP_MODULES.find((mod) => mod.key === "owner") ?? null;
  const location = useLocation();

  // ── Module dropdown accordion: only ONE module dropdown open at a time, persisted ──
  const MODULE_OPEN_KEY = "erp_navbar_open_module";
  const [openModuleKey, setOpenModuleKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem(MODULE_OPEN_KEY);
    } catch {
      return null;
    }
  });
  const handleToggleModule = (key: string, isOpen: boolean) => {
    const next = isOpen ? key : null;
    setOpenModuleKey(next);
    try {
      if (next) localStorage.setItem(MODULE_OPEN_KEY, next);
      else localStorage.removeItem(MODULE_OPEN_KEY);
    } catch {}
  };
  // ── Main modules accordion (single-open, persisted) ──
  const [openMainGroup, setOpenMainGroup] = useState<string | null>(() => {
    try { return localStorage.getItem(MAIN_ACCORDION_KEY); } catch { return null; }
  });
  const handleToggleMainGroup = (key: string) => {
    setOpenMainGroup((prev) => {
      const next = prev === key ? null : key;
      try {
        if (next) localStorage.setItem(MAIN_ACCORDION_KEY, next);
        else localStorage.removeItem(MAIN_ACCORDION_KEY);
      } catch {}
      return next;
    });
  };
  const { getTopPaths } = useNavigationUsage();
  const topPaths = getTopPaths(50);

  // ── Accordion state: only ONE owner section open at a time, persisted ──
  const [openOwnerSection, setOpenOwnerSection] = useState<string | null>(() => {
    try {
      return localStorage.getItem(OWNER_ACCORDION_KEY);
    } catch {
      return null;
    }
  });
  const [openOwnerSectionMobile, setOpenOwnerSectionMobile] = useState<string | null>(null);

  const handleToggleOwnerSection = (title: string) => {
    setOpenOwnerSection((prev) => {
      const next = prev === title ? null : title;
      try {
        if (next) localStorage.setItem(OWNER_ACCORDION_KEY, next);
        else localStorage.removeItem(OWNER_ACCORDION_KEY);
      } catch {}
      return next;
    });
  };
  const handleToggleOwnerSectionMobile = (title: string) => {
    setOpenOwnerSectionMobile((prev) => (prev === title ? null : title));
  };

  // Auto-open the section that contains the current route
  useMemo(() => {
    if (!ownerModule?.sections) return;
    const match = ownerModule.sections.find((s) =>
      s.items.some((i) => location.pathname === i.route || location.pathname.startsWith(i.route + "/"))
    );
    if (match && openOwnerSection !== match.title) {
      setOpenOwnerSection(match.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Auto-open the main group that contains the current route
  useMemo(() => {
    const match = ERP_MODULES.find((g) =>
      g.key !== "owner" &&
      g.items.some((i) => !isComingSoon(i) && (location.pathname === i.route || location.pathname.startsWith(i.route.split("?")[0])))
    );
    if (match && openMainGroup !== match.key) {
      setOpenMainGroup(match.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Keep a fixed business order for Operação; other groups can still float by usage.
  const sortItemsForGroup = (groupKey: string, items: ModuleItem[]) => {
    if (groupKey === "operacional") {
      const routeOrder = new Map(OPERATIONAL_ROUTE_ORDER.map((route, index) => [route, index]));

      return [...items].sort((a, b) => {
        const aw = routeOrder.get(a.route) ?? Number.MAX_SAFE_INTEGER;
        const bw = routeOrder.get(b.route) ?? Number.MAX_SAFE_INTEGER;
        if (aw !== bw) return aw - bw;
        return a.label.localeCompare(b.label, "pt-BR");
      });
    }

    return [...items].sort((a, b) => {
      const ai = topPaths.indexOf(a.route);
      const bi = topPaths.indexOf(b.route);
      const aw = ai === -1 ? 999 : ai;
      const bw = bi === -1 ? 999 : bi;
      return aw - bw;
    });
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.HelpCircle;
  };

  // Dynamic modules from modules_config (DB feature flags)
  const { groups: dynamicGroups } = useVisibleModuleGroups();

  const visibleModules = useMemo(() => {
    // Build ModuleGroup-shaped array from DB config so existing renderers work.
    return dynamicGroups.map((g) => ({
      key: g.category,
      label: g.label.toUpperCase(),
      icon: LayoutGrid as any,
      items: (() => {
        const items = g.items.map((m) => ({
          label: m.label,
          route: MODULE_ROUTE_MAP[m.module_key] ?? "/",
          icon: (m.icon as any) ?? "Circle",
          module: m.category === "financeiro" ? "financeiro" : undefined,
          available: true,
        }));

        if (g.category === "financeiro") {
          const financeiroIndex = items.findIndex((item) => item.route === "/financeiro");
          const rhPjItem = {
            label: "RH / PJ",
            route: "/financeiro/rh-pj",
            icon: "UserCheck" as keyof typeof LucideIcons,
            module: "financeiro",
            available: true,
          };

          if (!items.some((item) => item.route === rhPjItem.route)) {
            if (financeiroIndex >= 0) items.splice(financeiroIndex + 1, 0, rhPjItem);
            else items.unshift(rhPjItem);
          }
        }

        return items;
      })(),
    })) as ModuleGroup[];
  }, [dynamicGroups]);

  const renderMainGroupAccordion = (mod: ModuleGroup) => {
    const visibleItems = mod.items.filter((i) => {
      // Keep coming-soon items visible (Core rule). Only hide by permission.
      if (i.module && !loading && !isComingSoon(i)) return hasModuleAccess(i.module as any);
      return true;
    });
    if (visibleItems.length === 0) return null;

    const sortedItems = sortItemsForGroup(mod.key, visibleItems);
    const isModuleActive = mod.items.some(
      (i) => !isComingSoon(i) && (location.pathname === i.route || location.pathname.startsWith(i.route.split("?")[0]))
    );
    const isOpen = openMainGroup === mod.key;

    return (
      <Collapsible
        key={mod.key}
        open={isOpen}
        onOpenChange={() => handleToggleMainGroup(mod.key)}
      >
        <CollapsibleTrigger
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors hover:bg-muted/60 group",
            isModuleActive && "bg-primary/5"
          )}
        >
          <div className="flex items-center gap-2">
            <mod.icon className={cn(
              "h-4 w-4 flex-shrink-0",
              isModuleActive || isOpen ? "text-primary" : "text-muted-foreground"
            )} />
            <span
              className={cn(
                "text-[12px] font-bold uppercase tracking-wider transition-colors",
                isModuleActive || isOpen ? "text-primary" : "text-foreground/80"
              )}
            >
              {mod.label}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0",
              isOpen && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          {/* Lazy: only render items when open */}
          {isOpen && (
            <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-border/40 ml-5 mb-1">
              {sortedItems.map((item) => {
                const IconComp = getIconComponent(item.icon);
                if (isComingSoon(item)) {
                  return (
                    <ComingSoonItem
                      key={item.route}
                      label={item.label}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-[13px] rounded-md"
                    >
                      <IconComp className="h-3.5 w-3.5" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <ComingSoonBadge />
                    </ComingSoonItem>
                  );
                }
                return (
                  <NavLink
                    key={item.route}
                    to={item.route}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-[13px] rounded-md hover:bg-muted/60 transition-colors"
                    activeClassName="bg-primary/10 text-primary font-medium"
                  >
                    <IconComp className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-500",
      vendedor: "bg-blue-500",
      arquiteto: "bg-green-500",
      owner: "bg-amber-500",
      tenant_owner: "bg-amber-500",
    };
    return colors[role] || "bg-gray-500";
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      vendedor: "Vendedor",
      arquiteto: "Parceiro Profissional",
      owner: "Owner",
      tenant_owner: "Owner",
    };
    return labels[role] || role;
  };

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-border/40 bg-card/95 text-card-foreground backdrop-blur-[12px] supports-[backdrop-filter]:bg-card/95 shadow-sm">
      <div className="flex items-center h-full px-3 max-w-[1800px] mx-auto gap-1">
        {companyLogo ? (
          <img src={companyLogo} alt={companyName} className="h-7 w-auto flex-shrink-0" />
        ) : (
          <span className="font-bold text-sm flex-shrink-0">{companyName}</span>
        )}

        <div className="hidden xl:flex items-center gap-0.5 flex-1 ml-3 min-w-0 overflow-x-auto">
          <NavLink
            to="/central-navegacao"
            end
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md hover:bg-muted/50 font-medium transition-colors"
            activeClassName="bg-primary/10 text-primary font-semibold"
          >
            <Home className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap">Central</span>
          </NavLink>

          <DropdownMenu
            open={openModuleKey === "__main__"}
            onOpenChange={(o) => handleToggleModule("__main__", o)}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 h-auto text-xs rounded-md hover:bg-muted/50 transition-colors font-medium",
                  openModuleKey === "__main__" && "bg-primary/10 text-primary font-semibold"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Módulos</span>
                <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform duration-200", openModuleKey === "__main__" && "rotate-180")} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80 max-h-[80vh] overflow-y-auto bg-card border border-border shadow-lg">
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <LayoutGrid className="h-3.5 w-3.5" />
                Módulos
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="py-1 px-1">
                {visibleModules.map(renderMainGroupAccordion)}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="xl:hidden">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-border/50">
                {companyLogo ? (
                  <img src={companyLogo} alt={companyName} className="h-12 w-auto" />
                ) : (
                  <span className="font-bold text-lg">{companyName}</span>
                )}
                <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase mt-2">ERP</p>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {!loading && hasModuleAccess("dashboard" as any) && (
                  <div className="px-3 mb-1">
                    <NavLink
                      to="/central-navegacao"
                      end
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-muted"
                      activeClassName="bg-primary text-primary-foreground font-semibold"
                    >
                      <Home className="h-5 w-5 flex-shrink-0" />
                      <span>Central de Navegação</span>
                    </NavLink>
                  </div>
                )}

                {visibleModules.map((mod) => {
                  const visibleItems = mod.items.filter((item) => {
                    if (item.module && !loading && !isComingSoon(item)) return hasModuleAccess(item.module as any);
                    return true;
                  });
                  if (visibleItems.length === 0) return null;

                  const sortedItems = sortItemsForGroup(mod.key, visibleItems);
                  const isOpen = openMainGroup === mod.key;
                  const isModuleActive = mod.items.some(
                    (i) => !isComingSoon(i) && (location.pathname === i.route || location.pathname.startsWith(i.route.split("?")[0]))
                  );

                  return (
                    <div key={mod.key} className="px-3 mb-1">
                      <Collapsible open={isOpen} onOpenChange={() => handleToggleMainGroup(mod.key)}>
                        <CollapsibleTrigger
                          className={cn(
                            "flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-muted transition-colors",
                            isModuleActive && "bg-primary/5"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <mod.icon className={cn(
                              "h-4 w-4",
                              isModuleActive || isOpen ? "text-primary" : "text-muted-foreground"
                            )} />
                            <span className={cn(
                              "text-[11px] font-bold uppercase tracking-wider",
                              isModuleActive || isOpen ? "text-primary" : "text-foreground/80"
                            )}>
                              {mod.label}
                            </span>
                          </div>
                          <ChevronDown className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                            isOpen && "rotate-180"
                          )} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                          {isOpen && (
                            <div className="pl-4 ml-3 border-l border-border/40 space-y-0.5 py-1">
                              {sortedItems.map((item) => {
                                const IconComp = getIconComponent(item.icon);
                                if (isComingSoon(item)) {
                                  return (
                                    <ComingSoonItem
                                      key={item.route}
                                      label={item.label}
                                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                                    >
                                      <IconComp className="h-4 w-4 flex-shrink-0" />
                                      <span className="flex-1">{item.label}</span>
                                      <ComingSoonBadge />
                                    </ComingSoonItem>
                                  );
                                }
                                return (
                                  <NavLink
                                    key={item.route}
                                    to={item.route}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-muted text-sm"
                                    activeClassName="bg-primary text-primary-foreground font-semibold"
                                  >
                                    <IconComp className="h-4 w-4 flex-shrink-0" />
                                    <span>{item.label}</span>
                                  </NavLink>
                                );
                              })}
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}

                {canSeeOwnerMenu && ownerModule && (
                  <div className="mb-1">
                    <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase px-6 py-2 flex items-center gap-2">
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                      Painel Master
                    </p>
                    <div className="px-3 space-y-1">
                      {(ownerModule.sections ?? []).map((section) => {
                        const isOpen = openOwnerSectionMobile === section.title;
                        return (
                          <Collapsible
                            key={section.title}
                            open={isOpen}
                            onOpenChange={() => handleToggleOwnerSectionMobile(section.title)}
                          >
                            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-muted transition-colors">
                              <div className="flex flex-col items-start text-left">
                                <span className={cn(
                                  "text-[11px] font-bold uppercase tracking-wider",
                                  isOpen ? "text-primary" : "text-foreground/80"
                                )}>
                                  {section.title}
                                </span>
                                {section.description && (
                                  <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                                    {section.description}
                                  </span>
                                )}
                              </div>
                              <ChevronDown className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                isOpen && "rotate-180"
                              )} />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                              {isOpen && (
                                <div className="pl-4 ml-3 border-l border-border/40 space-y-0.5 py-1">
                                  {section.items.map((item) => {
                                    const IconComp = getIconComponent(item.icon);
                                    return (
                                      <NavLink
                                        key={item.route}
                                        to={item.route}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-muted text-sm"
                                        activeClassName="bg-primary text-primary-foreground font-semibold"
                                      >
                                        <IconComp className="h-4 w-4 flex-shrink-0" />
                                        <span>{item.label}</span>
                                      </NavLink>
                                    );
                                  })}
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>

                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 xl:flex-none" />

        <div className="flex items-center gap-1.5">
          {canSeeOwnerMenu && ownerModule && (
            <DropdownMenu
              open={openModuleKey === "__owner__"}
              onOpenChange={(o) => handleToggleModule("__owner__", o)}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 h-auto text-xs rounded-md hover:bg-muted/50 font-medium transition-colors",
                    (location.pathname.startsWith("/owner") || openModuleKey === "__owner__") && "bg-primary/10 text-primary font-semibold"
                  )}
                >
                  <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                  <span className="whitespace-nowrap">Painel Master</span>
                  <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform duration-200", openModuleKey === "__owner__" && "rotate-180")} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-[80vh] overflow-y-auto bg-card border border-border shadow-lg">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  Painel Master
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="py-1">
                  {(ownerModule.sections ?? []).map((section) => {
                    const isOpen = openOwnerSection === section.title;
                    const isActiveSection = section.items.some(
                      (i) =>
                        location.pathname === i.route ||
                        location.pathname.startsWith(i.route + "/")
                    );
                    return (
                      <Collapsible
                        key={section.title}
                        open={isOpen}
                        onOpenChange={() => handleToggleOwnerSection(section.title)}
                      >
                        <CollapsibleTrigger
                          className={cn(
                            "flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors hover:bg-muted/60 group",
                            isActiveSection && "bg-primary/5"
                          )}
                        >
                          <div className="flex flex-col items-start text-left">
                            <span
                              className={cn(
                                "text-[11px] font-bold uppercase tracking-wider transition-colors",
                                isActiveSection || isOpen
                                  ? "text-primary"
                                  : "text-foreground/80"
                              )}
                            >
                              {section.title}
                            </span>
                            {section.description && (
                              <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                                {section.description}
                              </span>
                            )}
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                              isOpen && "rotate-180"
                            )}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                          {/* Lazy: only render items when open */}
                          {isOpen && (
                            <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-border/40 ml-4 mb-1">
                              {section.items.map((item) => {
                                const IconComp = getIconComponent(item.icon);
                                return (
                                  <DropdownMenuItem
                                    key={item.route}
                                    asChild
                                    className="cursor-pointer"
                                  >
                                    <NavLink
                                      to={item.route}
                                      className="flex items-center gap-2 w-full px-2 py-1.5 text-[13px]"
                                      activeClassName="bg-primary/10 text-primary font-medium"
                                    >
                                      <IconComp className="h-3.5 w-3.5" />
                                      <span>{item.label}</span>
                                    </NavLink>
                                  </DropdownMenuItem>
                                );
                              })}
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>

              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <GlobalSearch />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => commandBarStore.open()}
            className="md:hidden h-8 w-8"
            title="Buscar (Ctrl+K)"
          >
            <Search className="h-4 w-4" />
          </Button>

          <TenantSwitcher />
          
          <ThemeToggle />
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1.5 h-auto py-1 px-1.5">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className={`${getRoleColor(profile?.role)} text-white text-[10px]`}>
                    {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-[11px] font-medium leading-tight">{profile?.full_name || user?.email}</span>
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                    {getRoleLabel(profile?.role)}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border border-border">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" />
                <span>{user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
