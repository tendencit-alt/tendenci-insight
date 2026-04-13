import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, ShoppingCart, Wallet, BarChart3,
  Target, PieChart, FolderOpen, Zap, Settings, Building2,
  ChevronDown, Factory, Package, BookOpen,
  ClipboardList, Truck, ListChecks, Bell, Shield,
  History, UserCog, Layers,
  Activity, GitBranch, Inbox, CheckSquare, AlertCircle,
  TrendingUp, DollarSign, ArrowLeftRight, Landmark, LineChart
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

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  module?: string | null;
  masterOnly?: boolean;
  ownerOnly?: boolean;
}

interface MenuGroup {
  label: string;
  icon: any;
  items: MenuItem[];
  separator?: boolean; // visual separator after group
}

const menuGroups: MenuGroup[] = [
  // ── Visão Geral ──
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { title: "Visão Geral", url: "/bi-dashboard", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  // ── Centro de Trabalho ──
  {
    label: "Central Operacional",
    icon: Inbox,
    separator: true,
    items: [
      { title: "Minhas Tarefas", url: "/tarefas", icon: CheckSquare },
      { title: "Aprovações", url: "/aprovacoes", icon: GitBranch },
      { title: "Notificações", url: "/atividades", icon: Bell, module: null, masterOnly: true },
    ],
  },
  // ── Execução ──
  {
    label: "Comercial",
    icon: ShoppingCart,
    items: [
      { title: "Pedidos", url: "/pedidos", icon: ShoppingCart, module: "pedidos" },
      { title: "Documentos", url: "/documentos", icon: FolderOpen },
    ],
  },
  {
    label: "Operações",
    icon: Factory,
    items: [
      { title: "Produção", url: "/producao", icon: Factory, module: "producao" },
    ],
  },
  {
    label: "Compras",
    icon: Package,
    items: [
      { title: "Fornecedores", url: "/fornecedores", icon: Package, module: "fornecedores" },
      { title: "Materiais", url: "/estoque", icon: Layers, module: "estoque" },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    separator: true,
    items: [
      { title: "Movimento", url: "/financeiro", icon: Wallet, module: "financeiro" },
    ],
  },
  // ── Análise ──
  {
    label: "Resultados e Análises",
    icon: LineChart,
    items: [
      { title: "Controladoria", url: "/cadastros-financeiros", icon: BookOpen, module: "cadastros_financeiros" },
    ],
  },
  {
    label: "Planejamento",
    icon: Target,
    items: [
      { title: "Metas", url: "/metas", icon: Target, module: "metas" },
    ],
  },
  {
    label: "BI e Indicadores",
    icon: PieChart,
    separator: true,
    items: [
      { title: "Análise BI", url: "/bi-dashboard", icon: PieChart, module: "dashboard" },
      { title: "Dashboards", url: "/dashboards", icon: BarChart3, module: null, masterOnly: true },
    ],
  },
  // ── Cadastros ──
  {
    label: "Cadastros",
    icon: Users,
    items: [
      { title: "Clientes", url: "/pedidos", icon: Users, module: "pedidos" },
      { title: "Fornecedores", url: "/fornecedores", icon: Package, module: "fornecedores" },
      { title: "Materiais", url: "/estoque", icon: Layers, module: "estoque" },
    ],
  },
  // ── Governança ──
  {
    label: "Regras e Auditoria",
    icon: Shield,
    separator: true,
    items: [
      { title: "Regras Automáticas", url: "/automacoes", icon: Zap, module: null, masterOnly: true },
      { title: "Auditoria", url: "/auditoria", icon: History },
    ],
  },
  // ── Administração ──
  {
    label: "Sistema",
    icon: Settings,
    items: [
      { title: "Configurações", url: "/settings", icon: Settings, module: "configuracoes" },
      { title: "Usuários", url: "/settings/users", icon: UserCog, module: "configuracoes" },
    ],
  },
  {
    label: "Owner",
    icon: Building2,
    items: [
      { title: "Painel Owner", url: "/super-admin", icon: Building2, module: null, ownerOnly: true },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { hasModuleAccess, loading, isOwner } = usePermissions();
  const { profile } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const companyLogo = companySettings?.logo_url;
  const companyName = companySettings?.trade_name || companySettings?.company_name || 'Sistema';
  const location = useLocation();
  const currentPath = location.pathname;
  const isMaster = profile?.role === 'admin';

  const isItemVisible = (item: MenuItem) => {
    if (loading) return !(item as any).ownerOnly;
    if (item.ownerOnly && !isOwner) return false;
    if (item.masterOnly && !isMaster) return false;
    if (item.module) return hasModuleAccess(item.module);
    return true;
  };

  const visibleGroups = menuGroups
    .map(group => ({ ...group, items: group.items.filter(isItemVisible) }))
    .filter(group => group.items.length > 0);

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
            const isGroupActive = group.items.some(
              item => currentPath === item.url || currentPath.startsWith(item.url + '/')
            );
            const isSingleItem = group.items.length === 1;

            const content = isSingleItem ? (
              <SidebarGroup key={group.label} className="py-0">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={group.items[0].url}
                          end={group.items[0].url === "/bi-dashboard"}
                          className="flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-colors hover:bg-sidebar-accent/50 text-sidebar-foreground/75 hover:text-sidebar-foreground"
                          activeClassName="bg-primary/15 text-primary font-medium"
                        >
                          <group.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate text-[13px]">{group.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : (
              <Collapsible key={group.label} defaultOpen={isGroupActive}>
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
                        <ChevronDown className="h-3 w-3 text-sidebar-foreground/30 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.title + item.url}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end
                                className="flex items-center gap-2.5 px-3 py-1 ml-5 mr-2 rounded-md transition-colors hover:bg-sidebar-accent/30 text-sidebar-foreground/60 hover:text-sidebar-foreground text-[13px]"
                                activeClassName="bg-primary/10 text-primary font-medium"
                              >
                                <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{item.title}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );

            return (
              <div key={group.label}>
                {content}
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
