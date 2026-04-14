import { useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import {
  Home, ShoppingCart, Factory, Wallet, BookOpen, Target,
  Database, BarChart3, Settings, Building2, ChevronDown,
  Users, FileText, Briefcase, DollarSign, HardHat, Truck,
  Package, Layers, CreditCard, ArrowLeftRight, BarChart,
  TrendingUp, Calculator, Clock, History, Zap, Shield,
  LineChart, PieChart, UserCog, Link2, Globe, Receipt,
  Landmark, ClipboardList, FolderOpen, Wrench, Bell,
  CheckSquare, GitBranch, Inbox, Mail
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
const STORAGE_KEY_PATH = "erp_sidebar_last_path";

// ── Menu definition (nova hierarquia) ──
const menuGroups: MenuGroup[] = [
  // 1. HOME
  {
    label: "Home",
    icon: Home,
    items: [
      { title: "Central de Navegação", url: "/central-navegacao", icon: Home },
    ],
  },

  // 2. COMERCIAL
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

  // 3. OPERAÇÕES
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

  // 4. FINANCEIRO (Execução Financeira)
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

  // 5. CONTROLADORIA (Inteligência Financeira)
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

  // 6. PLANEJAMENTO
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

  // 7. CADASTROS
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

  // 8. RELATÓRIOS & BI
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

  // 9. CONFIGURAÇÕES
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

  // 10. OWNER
  {
    label: "Owner",
    icon: Building2,
    profiles: ["system_owner"],
    items: [
      { title: "Painel Owner", url: "/super-admin", icon: Building2 },
    ],
  },
];

// ── Helper: find group index by current path ──
function findActiveGroupIndex(path: string): number | null {
  for (let i = 0; i < menuGroups.length; i++) {
    const group = menuGroups[i];
    if (group.items.some(item => !item.comingSoon && (path === item.url || path.startsWith(item.url + '/')))) {
      return i;
    }
  }
  return null;
}

// ── Component ──
export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { userLevel } = usePermissions();
  const { profile, user } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const companyLogo = companySettings?.logo_url;
  const companyName = companySettings?.trade_name || companySettings?.company_name || 'Tendenci';
  const location = useLocation();
  const currentPath = location.pathname;

  // ── Accordion: only one group open at a time ──
  const [openGroupIndex, setOpenGroupIndex] = useState<number | null>(() => {
    // Restore from localStorage or detect from current path
    const saved = localStorage.getItem(STORAGE_KEY_GROUP);
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < menuGroups.length) return idx;
    }
    return findActiveGroupIndex(currentPath) ?? 0;
  });

  // Auto-expand group when route changes
  useEffect(() => {
    const activeIdx = findActiveGroupIndex(currentPath);
    if (activeIdx !== null && activeIdx !== openGroupIndex) {
      setOpenGroupIndex(activeIdx);
    }
    // Save last path
    localStorage.setItem(STORAGE_KEY_PATH, currentPath);
  }, [currentPath]);

  // Persist open group
  useEffect(() => {
    if (openGroupIndex !== null) {
      localStorage.setItem(STORAGE_KEY_GROUP, String(openGroupIndex));
    }
  }, [openGroupIndex]);

  const handleToggleGroup = useCallback((idx: number) => {
    setOpenGroupIndex(prev => prev === idx ? null : idx);
  }, []);

  // Profile-based visibility
  const effectiveProfile = (): string => {
    if (userLevel === 'system_owner') return 'system_owner';
    if (userLevel === 'tenant_owner') return 'tenant_owner';
    if (userLevel === 'tenant_admin') return 'tenant_admin';
    return 'tenant_admin';
  };

  const currentProfile = effectiveProfile();

  const visibleGroups = menuGroups.filter(group => {
    if (!group.profiles || group.profiles.length === 0) return true;
    return group.profiles.includes(currentProfile);
  });

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

        {/* Menu */}
        <nav className="py-1.5">
          {visibleGroups.map((group) => {
            const globalIdx = menuGroups.indexOf(group);
            const isOpen = openGroupIndex === globalIdx;
            const isGroupActive = group.items.some(
              item => !item.comingSoon && (currentPath === item.url || currentPath.startsWith(item.url + '/'))
            );

            return (
              <div key={group.label}>
                <Collapsible open={isOpen} onOpenChange={() => handleToggleGroup(globalIdx)}>
                  <SidebarGroup className="py-0">
                    <CollapsibleTrigger className="w-full">
                      <SidebarGroupLabel className="flex items-center justify-between w-full px-4 py-1.5 cursor-pointer hover:bg-sidebar-accent/20 rounded-md mx-1 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <group.icon className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isGroupActive ? "text-primary" : "text-sidebar-foreground/45"
                          )} />
                          {!isCollapsed && (
                            <span className={cn(
                              "text-[11px] font-semibold tracking-wide uppercase",
                              isGroupActive ? "text-primary" : "text-sidebar-foreground/45"
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
                          {group.items.map((item) => (
                            <SidebarMenuItem key={item.title + item.url}>
                              <SidebarMenuButton asChild={!item.comingSoon}>
                                {item.comingSoon ? (
                                  <div className="flex items-center gap-2.5 px-3 py-1 ml-5 mr-2 rounded-md text-sidebar-foreground/30 text-[13px] cursor-default select-none">
                                    <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="truncate">{item.title}</span>
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
                                    className="flex items-center gap-2.5 px-3 py-1 ml-5 mr-2 rounded-md transition-colors hover:bg-sidebar-accent/30 text-sidebar-foreground/60 hover:text-sidebar-foreground text-[13px]"
                                    activeClassName="bg-primary/10 text-primary font-medium"
                                  >
                                    <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="truncate">{item.title}</span>
                                  </NavLink>
                                )}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
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
