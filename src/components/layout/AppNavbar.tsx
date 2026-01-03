import { useState, useEffect, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Menu, Edit2, ChevronDown, Factory, DollarSign, Database, Settings, Briefcase } from "lucide-react";
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
  category: string;
}

// Configuração das categorias para dropdowns
const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  comercial: { label: 'Comercial', icon: Briefcase },
  producao: { label: 'Produção', icon: Factory },
  financeiro: { label: 'Financeiro', icon: DollarSign },
  cadastros: { label: 'Cadastros', icon: Database },
  master: { label: 'Configurações', icon: Settings },
};

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
      setMenuItems(data as MenuItem[]);
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

  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (loading) return true;
      
      // Se o item tem um módulo associado, verificar permissão primeiro
      if (item.module) {
        const hasAccess = hasModuleAccess(item.module as any);
        // Se tem permissão específica, mostrar (mesmo que seja categoria master)
        if (hasAccess) return true;
        // Se não tem permissão, não mostrar
        return false;
      }
      
      // Itens sem módulo na categoria master só aparecem para admins
      if (item.category === 'master' && !isMaster) return false;
      
      return true;
    });
  }, [menuItems, loading, isMaster, hasModuleAccess]);

  // Agrupar itens por categoria
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, MenuItem[]> = {
      comercial: [],
      producao: [],
      financeiro: [],
      cadastros: [],
      master: [],
    };

    visibleMenuItems.forEach(item => {
      const category = item.category || 'comercial';
      if (grouped[category]) {
        grouped[category].push(item);
      } else {
        grouped.comercial.push(item);
      }
    });

    return grouped;
  }, [visibleMenuItems]);

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

  // Renderizar dropdown de categoria
  const renderCategoryDropdown = (category: string) => {
    const items = itemsByCategory[category];
    if (!items || items.length === 0) return null;

    const config = CATEGORY_CONFIG[category];
    if (!config) return null;

    const CategoryIcon = config.icon;

    return (
      <DropdownMenu key={category}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-1.5 px-3 py-1.5 h-auto text-xs rounded-md hover:bg-muted/50"
          >
            <CategoryIcon className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap font-medium">{config.label}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 bg-card border border-border shadow-lg">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            {config.label}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((item) => {
            const IconComponent = getIconComponent(item.icon);
            return (
              <DropdownMenuItem key={item.id} asChild className="cursor-pointer">
                <NavLink
                  to={item.route}
                  className="flex items-center gap-2 w-full px-2 py-2"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{item.label}</span>
                  {isMaster && (
                    <button
                      onClick={(e) => handleEditMenuItem(item, e)}
                      className="ml-auto opacity-50 hover:opacity-100 transition-opacity"
                      title="Editar"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </NavLink>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Categorias para renderizar no mobile com separadores
  const mobileCategories = [
    { key: 'comercial', label: 'Comercial' },
    { key: 'producao', label: 'Produção' },
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'cadastros', label: 'Cadastros' },
    ...(isMaster ? [{ key: 'master', label: 'Configurações' }] : []),
  ];

  // Ordem das categorias no desktop
  const desktopCategories = ['comercial', 'producao', 'financeiro', 'cadastros'];

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-border/40 bg-card/95 backdrop-blur-[12px] supports-[backdrop-filter]:bg-card/95 shadow-sm">
      <div className="flex items-center h-full px-3 max-w-[1800px] mx-auto gap-2">
        {/* Logo */}
        <img src={tendenciLogo} alt="Tendenci" className="h-7 w-auto flex-shrink-0" />
        
        {/* Desktop Menu Items */}
        <div className="hidden xl:flex items-center gap-1 flex-1 ml-4">
          {/* Dropdowns por categoria */}
          {desktopCategories.map(cat => renderCategoryDropdown(cat))}
          
          {/* Master/Configurações - só para admins */}
          {isMaster && renderCategoryDropdown('master')}
        </div>

        {/* Mobile Menu Button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="xl:hidden">
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
                {mobileCategories.map((cat) => {
                  const items = itemsByCategory[cat.key];
                  if (!items || items.length === 0) return null;

                  return (
                    <div key={cat.key} className="mb-4">
                      <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase mb-2 px-3">
                        {cat.label}
                      </p>
                      <div className="space-y-1">
                        {items.map((item) => {
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
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Spacer */}
        <div className="flex-1 xl:flex-none" />
        
        {/* Notifications + User Dropdown */}
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          
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
