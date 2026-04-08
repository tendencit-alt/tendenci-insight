import { 
  LayoutDashboard, 
  TrendingUp, 
  MessageSquare,
  Settings,
  Package,
  Target,
  UserSearch,
  PanelTop,
  Activity,
  Zap,
  Bot,
  Wallet
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard" },
  { title: "Leads", url: "/leads", icon: TrendingUp, module: "leads" },
  { title: "Projetos", url: "/projects", icon: Package, module: "projetos" },
  { title: "Prospecção Arquitetos", url: "/prospeccao", icon: UserSearch, module: "arquitetos" },
  { title: "CRM CLIENTES", url: "/kanban", icon: MessageSquare, module: "crm" },
  { title: "Metas", url: "/metas", icon: Target, module: "metas" },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, module: "financeiro" },
  { title: "Configuração IA", url: "/ia-configuracao", icon: Bot, module: "ia_configuracao" },
  { title: "Central de Atividades", url: "/atividades", icon: Activity, module: null, masterOnly: true },
  { title: "Central de Automações", url: "/automacoes", icon: Zap, module: null, masterOnly: true },
  { title: "Dashboards Personalizados", url: "/dashboards", icon: PanelTop, module: null, masterOnly: true },
  { title: "Configurações", url: "/settings", icon: Settings, module: "configuracoes" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { hasModuleAccess, loading, isOwner } = usePermissions();
  const { profile } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const companyLogo = companySettings?.logo_url;
  const companyName = companySettings?.trade_name || companySettings?.company_name || 'Sistema';

  const isMaster = profile?.role === 'admin';

  const visibleMenuItems = menuItems.filter((item) => {
    if (loading) return !(item as any).ownerOnly;
    
    // Owner only items
    if ((item as any).ownerOnly && !isOwner) return false;
    
    // Para itens masterOnly, verificar se é admin
    if ((item as any).masterOnly && !isMaster) return false;
    
    // Se tem módulo definido, verificar permissão
    if (item.module) {
      return hasModuleAccess(item.module);
    }
    
    // Itens sem módulo e sem masterOnly são sempre visíveis
    return true;
  });

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-sidebar-border bg-gradient-to-b from-sidebar-background to-[hsl(0,0%,6%)]"
      style={{
        backgroundImage: 'linear-gradient(180deg, hsl(0, 0%, 9%) 0%, hsl(0, 0%, 6%) 100%)'
      }}
    >
      <SidebarContent>
        <div className="px-4 py-6 border-b border-sidebar-border/50">
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="h-12 w-12 object-contain" />
              ) : (
                <span className="font-bold text-sm text-sidebar-foreground">{companyName.charAt(0)}</span>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="h-16 w-auto object-contain" />
              ) : (
                <span className="font-bold text-lg text-sidebar-foreground">{companyName}</span>
              )}
              <p className="text-xs text-sidebar-foreground/60 font-semibold tracking-wider uppercase">
                System
              </p>
            </div>
          )}
        </div>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-xs font-semibold tracking-wider">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 hover:bg-sidebar-accent group"
                      activeClassName="bg-primary text-primary-foreground font-semibold shadow-[0_0_12px_rgba(212,30,30,0.6)]"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}