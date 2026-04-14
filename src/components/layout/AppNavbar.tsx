import { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LogOut, User, Menu, ChevronDown, Sun, Moon, Building2,
  LayoutDashboard, ShoppingCart, Factory, Wallet, Scale, Target,
  Database, BarChart3, Settings,
  Home,
} from "lucide-react";
import { useTheme } from "next-themes";
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
import { useCompanySettings } from "@/hooks/useCompanySettings";


// ── ERP Module Structure ──
interface ModuleItem {
  label: string;
  route: string;
  icon: keyof typeof LucideIcons;
  module?: string; // permission module key
  available: boolean;
}

interface ModuleGroup {
  key: string;
  label: string;
  icon: React.ElementType;
  items: ModuleItem[];
  requiredModules?: string[]; // at least one must be accessible
  masterOnly?: boolean;
  ownerOnly?: boolean;
}

const ERP_MODULES: ModuleGroup[] = [
  {
    key: "comercial",
    label: "Comercial",
    icon: ShoppingCart,
    requiredModules: ["pedidos"],
    items: [
      { label: "Clientes", route: "/clientes", icon: "Users", available: false },
      { label: "Orçamentos", route: "/orcamentos", icon: "FileText", available: false },
      { label: "Pedidos", route: "/pedidos", icon: "ClipboardList", module: "pedidos", available: true },
      { label: "Contratos", route: "/contratos", icon: "FileSignature", available: false },
      { label: "Comissões", route: "/comissoes", icon: "Percent", available: false },
    ],
  },
  {
    key: "operacional",
    label: "Operacional",
    icon: Factory,
    requiredModules: ["producao"],
    items: [
      { label: "Projetos", route: "/projetos-op", icon: "FolderKanban", available: false },
      { label: "Produção", route: "/producao", icon: "Factory", module: "producao", available: true },
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
      { label: "Contas a Receber", route: "/financeiro?tab=receivables", icon: "ArrowUpCircle", module: "financeiro", available: true },
      { label: "Contas a Pagar", route: "/financeiro?tab=payables", icon: "ArrowDownCircle", module: "financeiro", available: true },
      { label: "Tesouraria", route: "/financeiro?tab=treasury", icon: "Landmark", module: "financeiro", available: true },
      { label: "Conciliação Bancária", route: "/financeiro?tab=reconciliation", icon: "GitCompare", module: "financeiro", available: true },
      { label: "Fluxo de Caixa", route: "/financeiro?tab=cashflow", icon: "TrendingUp", module: "financeiro", available: true },
      { label: "DRE Gerencial", route: "/financeiro?tab=dre", icon: "BarChart2", module: "financeiro", available: true },
      { label: "Resultado Financeiro", route: "/financeiro?tab=financial-result", icon: "DollarSign", module: "financeiro", available: true },
      { label: "Capital e Financiamentos", route: "/financeiro?tab=capital", icon: "Banknote", module: "financeiro", available: true },
    ],
  },
  {
    key: "controladoria",
    label: "Controladoria",
    icon: Scale,
    requiredModules: ["cadastros_financeiros"],
    items: [
      { label: "Plano de Contas", route: "/cadastros-financeiros?tab=chart", icon: "BookOpen", module: "cadastros_financeiros", available: true },
      { label: "Centros de Custo", route: "/cadastros-financeiros?tab=cost-centers", icon: "Building", module: "cadastros_financeiros", available: true },
      { label: "Projetos Financeiros", route: "/cadastros-financeiros?tab=projects", icon: "Briefcase", module: "cadastros_financeiros", available: true },
      { label: "Classificação Automática", route: "/cadastros-financeiros?tab=classification", icon: "Sparkles", module: "cadastros_financeiros", available: true },
      { label: "Automações por Evento", route: "/cadastros-financeiros?tab=event_automations", icon: "Bot", module: "cadastros_financeiros", available: true },
      { label: "Auditoria", route: "/cadastros-financeiros?tab=audit", icon: "ShieldCheck", module: "cadastros_financeiros", available: true },
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
      { label: "Fornecedores", route: "/fornecedores", icon: "Truck", module: "fornecedores", available: true },
      { label: "Clientes", route: "/cadastros-clientes", icon: "UserCircle", available: false },
      { label: "Produtos", route: "/estoque", icon: "Package", module: "estoque", available: true },
      { label: "Contas Bancárias", route: "/financeiro?tab=treasury", icon: "Landmark", module: "financeiro", available: true },
      { label: "Estrutura Organizacional", route: "/estrutura-organizacional", icon: "Network", available: false },
    ],
  },
  {
    key: "relatorios",
    label: "Relatórios e BI",
    icon: BarChart3,
    requiredModules: ["dashboard"],
    items: [
      { label: "BI Analítico", route: "/bi-dashboard", icon: "LayoutDashboard", module: "dashboard", available: true },
      { label: "Relatórios", route: "/relatorios", icon: "FileSpreadsheet", module: "dashboard", available: true },
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
      { label: "Integrações", route: "/integracoes", icon: "Plug", available: false },
    ],
  },
];

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
  const companyName = companySettings?.trade_name || companySettings?.company_name || 'Sistema';

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.HelpCircle;
  };

  // Filter visible module groups based on permissions
  const visibleModules = useMemo(() => {
    if (loading) return ERP_MODULES.filter(m => !m.ownerOnly);

    return ERP_MODULES.filter((mod) => {
      if (mod.ownerOnly && !isOwner) return false;
      if (mod.masterOnly && !isMaster) return false;
      if (mod.requiredModules) {
        return mod.requiredModules.some(m => hasModuleAccess(m as any));
      }
      return true;
    });
  }, [loading, isMaster, isOwner, hasModuleAccess]);

  const renderModuleDropdown = (mod: ModuleGroup) => {
    const availableItems = mod.items.filter(i => {
      if (!i.available) return false;
      if (i.module && !loading) return hasModuleAccess(i.module as any);
      return true;
    });
    const comingSoonItems = mod.items.filter(i => !i.available);

    if (availableItems.length === 0 && comingSoonItems.length === 0) return null;

    return (
      <DropdownMenu key={mod.key}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-1.5 px-2.5 py-1.5 h-auto text-xs rounded-md hover:bg-muted/50"
          >
            <mod.icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap font-medium">{mod.label}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-card border border-border shadow-lg">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            {mod.label}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableItems.map((item) => {
            const IconComp = getIconComponent(item.icon);
            return (
              <DropdownMenuItem key={item.route} asChild className="cursor-pointer">
                <NavLink
                  to={item.route}
                  className="flex items-center gap-2 w-full px-2 py-2"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <IconComp className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              </DropdownMenuItem>
            );
          })}
          {comingSoonItems.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {comingSoonItems.map((item) => {
                const IconComp = getIconComponent(item.icon);
                return (
                  <DropdownMenuItem key={item.label} disabled className="opacity-40">
                    <IconComp className="h-4 w-4 mr-2" />
                    <span>{item.label}</span>
                    <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1">Em breve</Badge>
                  </DropdownMenuItem>
                );
              })}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = { admin: 'bg-red-500', vendedor: 'bg-blue-500', arquiteto: 'bg-green-500' };
    return colors[role] || 'bg-gray-500';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = { admin: 'Admin', vendedor: 'Vendedor', arquiteto: 'Arquiteto' };
    return labels[role] || role;
  };

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-border/40 bg-card/95 text-card-foreground backdrop-blur-[12px] supports-[backdrop-filter]:bg-card/95 shadow-sm">
      <div className="flex items-center h-full px-3 max-w-[1800px] mx-auto gap-1">
        {/* Logo */}
        {companyLogo ? (
          <img src={companyLogo} alt={companyName} className="h-7 w-auto flex-shrink-0" />
        ) : (
          <span className="font-bold text-sm flex-shrink-0">{companyName}</span>
        )}

        {/* Desktop: Dashboard direct link + module dropdowns */}
        <div className="hidden xl:flex items-center gap-0.5 flex-1 ml-3">
          <NavLink
            to="/central-navegacao"
            end
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md hover:bg-muted/50 font-medium transition-colors"
            activeClassName="bg-primary/10 text-primary font-semibold"
          >
            <Home className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap">Central</span>
          </NavLink>

          {visibleModules.map(renderModuleDropdown)}
        </div>

        {/* Mobile Menu */}
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
                {(!loading && hasModuleAccess("dashboard" as any)) && (
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
                  const availableItems = mod.items.filter((item) => {
                    if (!item.available) return false;
                    if (item.module && !loading) return hasModuleAccess(item.module as any);
                    return true;
                  });
                  const comingSoonItems = mod.items.filter(i => !i.available);

                  if (availableItems.length === 0 && comingSoonItems.length === 0) return null;

                  return (
                    <div key={mod.key} className="mb-1">
                      <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase px-6 py-2 flex items-center gap-2">
                        <mod.icon className="h-3.5 w-3.5" />
                        {mod.label}
                      </p>
                      <div className="px-3 space-y-0.5">
                        {availableItems.map((item) => {
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
                        {comingSoonItems.map((item) => {
                          const IconComp = getIconComponent(item.icon);
                          return (
                            <div
                              key={item.label}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground/50 cursor-default select-none"
                            >
                              <IconComp className="h-4 w-4 flex-shrink-0" />
                              <span>{item.label}</span>
                              <Badge variant="outline" className="ml-auto text-[8px] h-4 px-1 border-muted-foreground/20 text-muted-foreground/40">Em breve</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {isOwner && (
                  <div className="mb-1">
                    <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase px-6 py-2 flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      Owner
                    </p>
                    <div className="px-3">
                      <NavLink
                        to="/super-admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-muted text-sm"
                        activeClassName="bg-primary text-primary-foreground font-semibold"
                      >
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span>Painel Owner</span>
                      </NavLink>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 xl:flex-none" />

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {isOwner && (
            <NavLink
              to="/super-admin"
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md hover:bg-muted/50 font-medium transition-colors"
              activeClassName="bg-primary/10 text-primary font-semibold"
            >
              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="whitespace-nowrap">Owner</span>
            </NavLink>
          )}
          <ThemeToggle />
          <NotificationBell />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1.5 h-auto py-1 px-1.5">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className={`${getRoleColor(profile?.role)} text-white text-[10px]`}>
                    {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-[11px] font-medium leading-tight">{profile?.full_name || user?.email}</span>
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1">{getRoleLabel(profile?.role)}</Badge>
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
