import { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Menu, Edit2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { EditMenuItemDialog } from "./EditMenuItemDialog";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  module: string;
  position: number;
  visible: boolean;
}

export function AppNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { hasModuleAccess, loading } = usePermissions();
  const { profile } = useAuth();
  const { user, signOut } = useAuth();

  const isMaster = profile?.role === 'admin';

  useEffect(() => {
    fetchMenuItems();

    // Realtime subscription
    const channel = supabase
      .channel('menu_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items'
        },
        () => {
          fetchMenuItems();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('visible', true)
      .order('position', { ascending: true });

    if (!error && data) {
      setMenuItems(data);
    }
  };

  const handleEditMenuItem = (item: MenuItem, e: React.MouseEvent) => {
    if (!isMaster) return;
    e.preventDefault();
    e.stopPropagation();
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.HelpCircle;
  };

  const visibleMenuItems = menuItems.filter((item) => {
    if (loading) return true;
    if (item.module) {
      return hasModuleAccess(item.module as any);
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
          {visibleMenuItems.map((item) => {
            const IconComponent = getIconComponent(item.icon);
            return (
              <div key={item.id} className="relative group">
                <NavLink
                  to={item.route}
                  end={item.route === "/"}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-300 hover:bg-muted/50"
                  activeClassName="bg-primary text-primary-foreground font-semibold shadow-[0_0_8px_rgba(212,30,30,0.4)]"
                >
                  <IconComponent className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
                {isMaster && (
                  <button
                    onClick={(e) => handleEditMenuItem(item, e)}
                    className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground rounded-full p-0.5 shadow-lg hover:scale-110"
                    title="Editar item do menu"
                  >
                    <Edit2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}
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
                  {visibleMenuItems.map((item) => {
                    const IconComponent = getIconComponent(item.icon);
                    return (
                      <NavLink
                        key={item.id}
                        to={item.route}
                        end={item.route === "/"}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 hover:bg-muted"
                        activeClassName="bg-primary text-primary-foreground font-semibold shadow-[0_0_12px_rgba(212,30,30,0.6)]"
                      >
                        <IconComponent className="h-5 w-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
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

      {/* Dialog de Edição */}
      <EditMenuItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        menuItem={editingItem}
        onSuccess={fetchMenuItems}
      />
    </nav>
  );
}
