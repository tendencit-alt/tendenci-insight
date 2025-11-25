import { useState } from "react";
import { 
  LayoutDashboard, 
  TrendingUp, 
  MessageSquare,
  Settings,
  Package,
  Target,
  UserSearch,
  PanelTop,
  Menu,
  X
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User } from "lucide-react";
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
import tendenciLogo from "@/assets/tendenci-logo-new.png";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard" },
  { title: "Leads", url: "/leads", icon: TrendingUp, module: "leads" },
  { title: "Projetos", url: "/projects", icon: Package, module: "projetos" },
  { title: "Prospecção", url: "/prospeccao", icon: UserSearch, module: "arquitetos" },
  { title: "CRM", url: "/kanban", icon: MessageSquare, module: "crm" },
  { title: "Metas", url: "/metas", icon: Target, module: "metas" },
  { title: "Dashboards", url: "/dashboards", icon: PanelTop, module: null, masterOnly: true },
  { title: "Configurações", url: "/settings", icon: Settings, module: "configuracoes" },
];

export function AppNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasModuleAccess, loading } = usePermissions();
  const { profile } = useAuth();
  const { user, signOut } = useAuth();

  const isMaster = profile?.role === 'admin';

  const visibleMenuItems = menuItems.filter((item) => {
    if (loading) return true;
    if (item.masterOnly && !isMaster) return false;
    if (item.module) {
      return hasModuleAccess(item.module);
    }
    return true;
  });

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500',
      vendedor: 'bg-blue-500',
      arquiteto: 'bg-green-500'
    };
    return colors[role] || 'bg-gray-500';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      vendedor: 'Vendedor',
      arquiteto: 'Arquiteto'
    };
    return labels[role] || role;
  };

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-border/40 bg-card/95 backdrop-blur-[12px] supports-[backdrop-filter]:bg-card/95 shadow-sm">
      <div className="flex items-center h-full px-4 max-w-[1800px] mx-auto gap-4">
        {/* Logo */}
        <img src={tendenciLogo} alt="Tendenci" className="h-8 w-auto flex-shrink-0" />
        
        {/* Desktop Menu Items */}
        <div className="hidden lg:flex items-center gap-1 flex-1">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-300 hover:bg-muted/50"
              activeClassName="bg-primary text-primary-foreground font-semibold shadow-[0_0_8px_rgba(212,30,30,0.4)]"
            >
              <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="whitespace-nowrap">{item.title}</span>
            </NavLink>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-border/50">
                <img src={tendenciLogo} alt="Tendenci" className="h-12 w-auto" />
                <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase mt-2">
                  System
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {visibleMenuItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      end={item.url === "/"}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 hover:bg-muted"
                      activeClassName="bg-primary text-primary-foreground font-semibold shadow-[0_0_12px_rgba(212,30,30,0.6)]"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Spacer */}
        <div className="flex-1 lg:flex-none" />
        
        {/* Notifications + User Dropdown */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-auto py-1.5 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className={`${getRoleColor(profile?.role)} text-white text-xs`}>
                    {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-xs font-medium leading-tight">{profile?.full_name || user?.email}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {getRoleLabel(profile?.role)}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
