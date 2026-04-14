import { useLocation } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Home, ShoppingCart, Factory, Wallet, BookOpen, Target,
  Database, BarChart3, Settings, Building2, ChevronDown,
  Users, FileText, Briefcase, DollarSign, HardHat,
  Package, Layers, CreditCard, ArrowLeftRight, BarChart,
  TrendingUp, Calculator, History, Zap, Shield,
  LineChart, PieChart, UserCog, Link2,
  Landmark, ClipboardList, FolderOpen, Wrench,
  Star
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useNavigationUsage } from "@/hooks/useNavigationUsage";
import { cn } from "@/lib/utils";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

// ── Types ──
interface MenuItem {
  title: string;
  url: string;
  icon: any;
  comingSoon?: boolean;
  highlight?: boolean; // role-based highlight
}

interface MenuGroup {
  label: string;
  icon: any;
  items: MenuItem[];
  separator?: boolean;
  profiles?: string[];
}

// ── Storage keys ──
const STORAGE_KEY_GROUP = "erp_sidebar_last_group";

// ── Role-based configuration ──
type RoleKey = "owner" | "financeiro" | "comercial" | "operacional" | "admin";

interface RoleConfig {
  /** Groups to auto-expand (first match wins on initial load) */
  autoExpandGroups: string[];
  /** Item URLs to visually highlight */
  highlightItems: string[];
  /** Groups with reduced visual priority */
  dimGroups: string[];
}

const ROLE_CONFIGS: Record<RoleKey, RoleConfig> = {
  owner: {
    autoExpandGroups: ["Controladoria", "Planejamento", "Relatórios & BI"],
    highlightItems: [],
    dimGroups: ["Cadastros", "Operações"],
  },
  financeiro: {
    autoExpandGroups: ["Financeiro", "Controladoria", "Planejamento"],
    highlightItems: ["/conciliacao", "/fluxo-caixa", "/dre"],
    dimGroups: ["Operações", "Cadastros"],
  },
  comercial: {
    autoExpandGroups: ["Comercial", "Financeiro"],
    highlightItems: ["/pedidos", "/propostas", "/clientes"],
    dimGroups: ["Operações", "Controladoria"],
  },
  operacional: {
    autoExpandGroups: ["Operações"],
    highlightItems: ["/producao", "/ordens-producao", "/execucao-obras"],
    dimGroups: ["Controladoria", "Planejamento"],
  },
  admin: {
    autoExpandGroups: ["Home"],
    highlightItems: [],
    dimGroups: [],
  },
};

// ── Menu definition ──
const menuGroups: MenuGroup[] = [
  {
    label: "Home",
    icon: Home,
    items: [
      { title: "Central de Navegação", url: "/central-navegacao", icon: Home },
    ],
  },
  {
    label: "Comercial",
    icon: ShoppingCart,
    separator: true,
    items: [
      { title: "Pedidos", url: "/pedidos", icon: ShoppingCart },
      { title: "Orçamentos", url: "/propostas", icon: FileText, comingSoon: true },
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "Contratos", url: "/contratos", icon: Briefcase, comingSoon: true },
      { title: "Comissões", url: "/comissoes", icon: DollarSign, comingSoon: true },
    ],
  },
  {
    label: "Operações",
    icon: Factory,
    items: [
      { title: "Produção", url: "/producao", icon: Factory },
      { title: "Ordens de Produção", url: "/ordens-producao", icon: ClipboardList, comingSoon: true },
      { title: "Execução / Obras", url: "/execucao-obras", icon: HardHat, comingSoon: true },
      { title: "Projetos", url: "/projetos-operacionais", icon: Briefcase, comingSoon: true },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    separator: true,
    items: [
      { title: "Contas a Receber", url: "/contas-receber", icon: TrendingUp, comingSoon: true },
      { title: "Contas a Pagar", url: "/contas-pagar", icon: CreditCard, comingSoon: true },
      { title: "Tesouraria", url: "/financeiro", icon: Wallet },
      { title: "Conciliação Bancária", url: "/conciliacao", icon: ArrowLeftRight, comingSoon: true },
    ],
  },
  {
    label: "Controladoria",
    icon: BookOpen,
    items: [
      { title: "Fluxo de Caixa", url: "/fluxo-caixa", icon: BarChart, comingSoon: true },
      { title: "DRE Gerencial", url: "/dre", icon: LineChart, comingSoon: true },
      { title: "Resultado Financeiro", url: "/resultado-financeiro", icon: Calculator, comingSoon: true },
      { title: "Capital e Financiamentos", url: "/capital-financiamentos", icon: Landmark, comingSoon: true },
      { title: "Plano de Contas", url: "/cadastros-financeiros", icon: BookOpen },
      { title: "Centros de Custo", url: "/centros-custo", icon: FolderOpen, comingSoon: true },
      { title: "Projetos Financeiros", url: "/projetos-financeiros", icon: Briefcase, comingSoon: true },
      { title: "Classificação Automática", url: "/classificacao-automatica", icon: Zap, comingSoon: true },
      { title: "Automações por Evento", url: "/automacoes", icon: Zap },
      { title: "Auditoria", url: "/auditoria", icon: History },
    ],
  },
  {
    label: "Planejamento",
    icon: Target,
    separator: true,
    items: [
      { title: "Metas", url: "/metas", icon: Target },
      { title: "Orçamento", url: "/orcamento", icon: DollarSign, comingSoon: true },
      { title: "Forecast", url: "/forecast", icon: TrendingUp, comingSoon: true },
    ],
  },
  {
    label: "Cadastros",
    icon: Database,
    items: [
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "Fornecedores", url: "/fornecedores", icon: Package },
      { title: "Produtos / Materiais", url: "/estoque", icon: Layers },
      { title: "Contas Bancárias", url: "/contas-bancarias", icon: Landmark, comingSoon: true },
      { title: "Estrutura Organizacional", url: "/estrutura-organizacional", icon: Building2, comingSoon: true },
    ],
  },
  {
    label: "Relatórios & BI",
    icon: BarChart3,
    separator: true,
    items: [
      { title: "BI Analítico", url: "/bi-dashboard", icon: PieChart },
      { title: "Dashboards", url: "/dashboards", icon: BarChart3 },
      { title: "Relatórios Personalizados", url: "/relatorios-personalizados", icon: FileText, comingSoon: true },
      { title: "Exportações Inteligentes", url: "/exportacao-bi", icon: FileText, comingSoon: true },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    items: [
      { title: "Geral", url: "/settings", icon: Settings },
      { title: "Usuários", url: "/settings/users", icon: UserCog },
      { title: "Permissões", url: "/settings/permissoes", icon: Shield, comingSoon: true },
      { title: "Integrações", url: "/settings/integracoes", icon: Link2, comingSoon: true },
      { title: "Preferências do Sistema", url: "/settings/preferencias", icon: Wrench, comingSoon: true },
      { title: "Parâmetros Financeiros", url: "/settings/parametros-financeiros", icon: Calculator, comingSoon: true },
      { title: "Logs do Sistema", url: "/settings/logs", icon: History, comingSoon: true },
    ],
  },
  {
    label: "Owner",
    icon: Building2,
    profiles: ["system_owner"],
    items: [
      { title: "Painel Owner", url: "/super-admin", icon: Building2 },
    ],
  },
];

// ── Helpers ──
function findActiveGroupIndex(path: string): number | null {
  for (let i = 0; i < menuGroups.length; i++) {
    if (menuGroups[i].items.some(item => !item.comingSoon && (path === item.url || path.startsWith(item.url + '/')))) {
      return i;
    }
  }
  return null;
}

function findGroupIndexByLabel(label: string): number | null {
  const idx = menuGroups.findIndex(g => g.label === label);
  return idx >= 0 ? idx : null;
}

function resolveRoleKey(userLevel: string, profileTypeName: string | null): RoleKey {
  if (userLevel === 'system_owner') return 'owner';
  if (userLevel === 'tenant_owner') return 'owner';
  if (profileTypeName) {
    const n = profileTypeName.toLowerCase();
    if (n.includes('financ')) return 'financeiro';
    if (n.includes('comerc')) return 'comercial';
    if (n.includes('operac') || n.includes('produc')) return 'operacional';
    if (n.includes('contador')) return 'financeiro';
    if (n.includes('auditor')) return 'financeiro';
  }
  return 'admin';
}

// ── Quick-access item lookup from menu ──
function findMenuItem(url: string): MenuItem | null {
  for (const g of menuGroups) {
    const found = g.items.find(i => i.url === url);
    if (found) return found;
  }
  return null;
}

// ── Component ──
export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { userLevel } = usePermissions();
  const { user } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const companyLogo = companySettings?.logo_url;
  const companyName = companySettings?.trade_name || companySettings?.company_name || 'Tendenci';
  const location = useLocation();
  const currentPath = location.pathname;
  const { trackVisit, getTopPaths } = useNavigationUsage();

  // Fetch profile type name for role detection
  const [profileTypeName, setProfileTypeName] = useState<string | null>(null);
  useEffect(() => {
    if (!user) { setProfileTypeName(null); return; }
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from('profiles').select('profile_type_id, profile_types(name)')
        .eq('id', user.id).single()
        .then(({ data }) => {
          setProfileTypeName((data as any)?.profile_types?.name as string | null ?? null);
        });
    });
  }, [user]);

  const roleKey = resolveRoleKey(userLevel, profileTypeName);
  const roleConfig = ROLE_CONFIGS[roleKey];

  // ── Accordion state ──
  const [openGroupIndex, setOpenGroupIndex] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_GROUP);
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < menuGroups.length) return idx;
    }
    // Role-based default expand
    for (const gl of roleConfig.autoExpandGroups) {
      const idx = findGroupIndexByLabel(gl);
      if (idx !== null) return idx;
    }
    return findActiveGroupIndex(currentPath) ?? 0;
  });

  // Auto-expand on route change + track usage
  useEffect(() => {
    const activeIdx = findActiveGroupIndex(currentPath);
    if (activeIdx !== null && activeIdx !== openGroupIndex) {
      setOpenGroupIndex(activeIdx);
    }
    // Track navigation
    if (activeIdx !== null) {
      trackVisit(currentPath, menuGroups[activeIdx].label);
    }
  }, [currentPath]);

  // Persist
  useEffect(() => {
    if (openGroupIndex !== null) {
      localStorage.setItem(STORAGE_KEY_GROUP, String(openGroupIndex));
    }
  }, [openGroupIndex]);

  const handleToggleGroup = useCallback((idx: number) => {
    setOpenGroupIndex(prev => prev === idx ? null : idx);
  }, []);

  // Profile-based visibility
  const currentProfile = useMemo(() => {
    if (userLevel === 'system_owner') return 'system_owner';
    if (userLevel === 'tenant_owner') return 'tenant_owner';
    return 'tenant_admin';
  }, [userLevel]);

  const visibleGroups = useMemo(() =>
    menuGroups.filter(g => !g.profiles || g.profiles.length === 0 || g.profiles.includes(currentProfile)),
    [currentProfile]
  );

  // ── Quick shortcuts (top 3 most used paths) ──
  const quickShortcuts = useMemo(() => {
    const topPaths = getTopPaths(3);
    return topPaths
      .map(p => findMenuItem(p))
      .filter((m): m is MenuItem => m !== null && !m.comingSoon);
  }, [getTopPaths]);

  // ── Highlight set from role config ──
  const highlightSet = useMemo(() => new Set(roleConfig.highlightItems), [roleConfig]);
  const dimSet = useMemo(() => new Set(roleConfig.dimGroups), [roleConfig]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
      style={{ backgroundImage: 'linear-gradient(180deg, hsl(0,0%,9%) 0%, hsl(0,0%,6%) 100%)' }}
    >
      <SidebarContent className="overflow-y-auto overflow-x-hidden">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-sidebar-border/40">
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="h-9 w-9 object-contain" />
              ) : (
                <span className="font-bold text-sm text-sidebar-foreground">{companyName.charAt(0)}</span>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="h-12 w-auto object-contain" />
              ) : (
                <span className="font-bold text-base text-sidebar-foreground">{companyName}</span>
              )}
              <p className="text-[10px] text-sidebar-foreground/40 font-semibold tracking-widest uppercase">ERP</p>
            </div>
          )}
        </div>

        {/* Quick Shortcuts */}
        {!isCollapsed && quickShortcuts.length > 0 && (
          <div className="px-3 py-2 border-b border-sidebar-border/20">
            <p className="text-[10px] text-sidebar-foreground/35 font-semibold tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
              <Star className="h-3 w-3" /> Acesso rápido
            </p>
            <div className="space-y-0.5">
              {quickShortcuts.map(item => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  end
                  className="flex items-center gap-2 px-2.5 py-1 rounded-md transition-colors hover:bg-sidebar-accent/30 text-sidebar-foreground/55 hover:text-sidebar-foreground text-[12px]"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        <nav className="py-1.5">
          {visibleGroups.map((group) => {
            const globalIdx = menuGroups.indexOf(group);
            const isOpen = openGroupIndex === globalIdx;
            const isGroupActive = group.items.some(
              item => !item.comingSoon && (currentPath === item.url || currentPath.startsWith(item.url + '/'))
            );
            const isDimmed = dimSet.has(group.label);

            return (
              <div key={group.label}>
                <Collapsible open={isOpen} onOpenChange={() => handleToggleGroup(globalIdx)}>
                  <SidebarGroup className="py-0">
                    <CollapsibleTrigger className="w-full">
                      <SidebarGroupLabel className="flex items-center justify-between w-full px-4 py-1.5 cursor-pointer hover:bg-sidebar-accent/20 rounded-md mx-1 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <group.icon className={cn(
                            "h-4 w-4 flex-shrink-0 transition-colors",
                            isGroupActive ? "text-primary" : isDimmed ? "text-sidebar-foreground/25" : "text-sidebar-foreground/45"
                          )} />
                          {!isCollapsed && (
                            <span className={cn(
                              "text-[11px] font-semibold tracking-wide uppercase transition-colors",
                              isGroupActive ? "text-primary" : isDimmed ? "text-sidebar-foreground/25" : "text-sidebar-foreground/45"
                            )}>
                              {group.label}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <ChevronDown className={cn(
                            "h-3 w-3 text-sidebar-foreground/30 transition-transform duration-200",
                            isOpen && "rotate-180"
                          )} />
                        )}
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {group.items.map((item) => {
                            const isHighlighted = highlightSet.has(item.url);
                            return (
                              <SidebarMenuItem key={item.title + item.url}>
                                <SidebarMenuButton asChild={!item.comingSoon}>
                                  {item.comingSoon ? (
                                    <div className="flex items-center gap-2.5 px-3 py-1 ml-5 mr-2 rounded-md text-sidebar-foreground/30 text-[13px] cursor-default select-none">
                                      <item.icon className={cn("h-3.5 w-3.5 flex-shrink-0", isHighlighted && "text-primary/40")} />
                                      <span className={cn("truncate", isHighlighted && "text-primary/40")}>{item.title}</span>
                                      {!isCollapsed && (
                                        <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 h-4 border-sidebar-foreground/15 text-sidebar-foreground/25 font-normal">
                                          Em breve
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <NavLink
                                      to={item.url}
                                      end
                                      className={cn(
                                        "flex items-center gap-2.5 px-3 py-1 ml-5 mr-2 rounded-md transition-colors hover:bg-sidebar-accent/30 text-sidebar-foreground/60 hover:text-sidebar-foreground text-[13px]",
                                        isHighlighted && "text-sidebar-foreground/80 font-medium"
                                      )}
                                      activeClassName="bg-primary/10 text-primary font-medium"
                                    >
                                      <item.icon className={cn("h-3.5 w-3.5 flex-shrink-0", isHighlighted && "text-primary/60")} />
                                      <span className="truncate">{item.title}</span>
                                      {isHighlighted && !isCollapsed && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                                      )}
                                    </NavLink>
                                  )}
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
                {group.separator && !isCollapsed && (
                  <div className="mx-4 my-1.5 border-t border-sidebar-border/20" />
                )}
              </div>
            );
          })}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}
