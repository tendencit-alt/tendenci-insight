import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, ShoppingCart, Wallet, BarChart3,
  Target, PieChart, FolderOpen, Zap, Settings, Building2,
  ChevronDown, Factory, Package, BookOpen,
  ListChecks, Bell, Shield,
  History, UserCog, Layers,
  GitBranch, Inbox, CheckSquare, LineChart
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
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ── Types ──

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
  separator?: boolean;
  /** Which profile types can see this group. Empty = all profiles. */
  profiles?: string[];
}

// ── Profile → Group visibility map ──
// If a group has no `profiles` array, it's visible to all.
// "system_owner" / "tenant_owner" / "tenant_admin" are resolved from userLevel.

const P = {
  ALL_TENANT: ["tenant_owner", "tenant_admin", "financeiro", "comercial", "operacional", "producao", "contador", "auditor"],
  EXEC: ["tenant_owner", "tenant_admin"],
  FIN: ["tenant_owner", "tenant_admin", "financeiro", "contador"],
  COM: ["tenant_owner", "tenant_admin", "comercial"],
  OPS: ["tenant_owner", "tenant_admin", "operacional", "producao"],
  AUD: ["tenant_owner", "tenant_admin", "auditor"],
  ADM: ["tenant_owner", "tenant_admin"],
};

// ── Menu definition ──

const menuGroups: MenuGroup[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    profiles: [...P.EXEC, "financeiro", "comercial", "contador"],
    items: [
      { title: "Visão Geral", url: "/bi-dashboard", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    label: "Central Operacional",
    icon: Inbox,
    separator: true,
    // visible to all tenant profiles
    items: [
      { title: "Minhas Tarefas", url: "/tarefas", icon: CheckSquare },
      { title: "Aprovações", url: "/aprovacoes", icon: GitBranch },
      { title: "Notificações", url: "/atividades", icon: Bell, module: null, masterOnly: true },
    ],
  },
  {
    label: "Comercial",
    icon: ShoppingCart,
    profiles: [...P.COM, "operacional", "producao"],
    items: [
      { title: "Pedidos", url: "/pedidos", icon: ShoppingCart, module: "pedidos" },
      { title: "Documentos", url: "/documentos", icon: FolderOpen },
    ],
  },
  {
    label: "Operações",
    icon: Factory,
    profiles: P.OPS,
    items: [
      { title: "Produção", url: "/producao", icon: Factory, module: "producao" },
    ],
  },
  {
    label: "Compras",
    icon: Package,
    profiles: [...P.EXEC, "financeiro", "operacional"],
    items: [
      { title: "Fornecedores", url: "/fornecedores", icon: Package, module: "fornecedores" },
      { title: "Materiais", url: "/estoque", icon: Layers, module: "estoque" },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    separator: true,
    profiles: P.FIN,
    items: [
      { title: "Movimento", url: "/financeiro", icon: Wallet, module: "financeiro" },
    ],
  },
  {
    label: "Resultados e Análises",
    icon: LineChart,
    profiles: [...P.FIN, "auditor"],
    items: [
      { title: "Controladoria", url: "/cadastros-financeiros", icon: BookOpen, module: "cadastros_financeiros" },
    ],
  },
  {
    label: "Planejamento",
    icon: Target,
    profiles: P.EXEC,
    items: [
      { title: "Metas", url: "/metas", icon: Target, module: "metas" },
    ],
  },
  {
    label: "BI e Indicadores",
    icon: PieChart,
    separator: true,
    profiles: [...P.EXEC, "contador", "auditor"],
    items: [
      { title: "Análise BI", url: "/bi-dashboard", icon: PieChart, module: "dashboard" },
      { title: "Dashboards", url: "/dashboards", icon: BarChart3, module: null, masterOnly: true },
    ],
  },
  {
    label: "Cadastros",
    icon: Users,
    profiles: [...P.EXEC, "comercial", "financeiro"],
    items: [
      { title: "Clientes", url: "/pedidos", icon: Users, module: "pedidos" },
      { title: "Fornecedores", url: "/fornecedores", icon: Package, module: "fornecedores" },
      { title: "Materiais", url: "/estoque", icon: Layers, module: "estoque" },
    ],
  },
  {
    label: "Regras e Auditoria",
    icon: Shield,
    separator: true,
    profiles: [...P.ADM, "auditor"],
    items: [
      { title: "Regras Automáticas", url: "/automacoes", icon: Zap, module: null, masterOnly: true },
      { title: "Auditoria", url: "/auditoria", icon: History },
    ],
  },
  {
    label: "Sistema",
    icon: Settings,
    profiles: P.ADM,
    items: [
      { title: "Configurações", url: "/settings", icon: Settings, module: "configuracoes" },
      { title: "Usuários", url: "/settings/users", icon: UserCog, module: "configuracoes" },
    ],
  },
  {
    label: "Owner",
    icon: Building2,
    profiles: ["system_owner"],
    items: [
      { title: "Painel Owner", url: "/super-admin", icon: Building2, module: null, ownerOnly: true },
    ],
  },
];

// ── Component ──

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { hasModuleAccess, loading, isOwner, userLevel } = usePermissions();
  const { profile, user } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const companyLogo = companySettings?.logo_url;
  const companyName = companySettings?.trade_name || companySettings?.company_name || 'Sistema';
  const location = useLocation();
  const currentPath = location.pathname;
  const isMaster = profile?.role === 'admin';

  // Fetch profile type name for adaptive menu
  const [profileTypeName, setProfileTypeName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setProfileTypeName(null); return; }
    const fetchProfileType = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('profile_type_id, profile_types(name)')
        .eq('id', user.id)
        .single();
      const ptName = (data as any)?.profile_types?.name as string | null;
      setProfileTypeName(ptName || null);
    };
    fetchProfileType();
  }, [user]);

  // Resolve effective profile key for menu filtering
  const effectiveProfile = (): string => {
    if (userLevel === 'system_owner') return 'system_owner';
    if (userLevel === 'tenant_owner') return 'tenant_owner';
    if (userLevel === 'tenant_admin') return 'tenant_admin';
    // Map profile_type name to our keys
    if (profileTypeName) {
      const normalized = profileTypeName.toLowerCase().replace(/\s+/g, '_');
      const knownProfiles = ['financeiro', 'comercial', 'operacional', 'producao', 'contador', 'auditor'];
      // Try exact match
      if (knownProfiles.includes(normalized)) return normalized;
      // Try partial match
      const match = knownProfiles.find(p => normalized.includes(p));
      if (match) return match;
    }
    // Fallback: tenant_admin for admin role, otherwise show everything
    if (isMaster) return 'tenant_admin';
    return 'tenant_admin'; // default: show all tenant items
  };

  const currentProfile = effectiveProfile();

  const isGroupVisibleForProfile = (group: MenuGroup): boolean => {
    // No profile restriction = visible to everyone
    if (!group.profiles || group.profiles.length === 0) return true;
    return group.profiles.includes(currentProfile);
  };

  const isItemVisible = (item: MenuItem) => {
    if (loading) return !(item as any).ownerOnly;
    if (item.ownerOnly && !isOwner) return false;
    if (item.masterOnly && !isMaster) return false;
    if (item.module) return hasModuleAccess(item.module);
    return true;
  };

  const visibleGroups = menuGroups
    .filter(isGroupVisibleForProfile)
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
