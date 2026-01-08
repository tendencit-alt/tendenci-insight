import { ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { AppModule } from '@/contexts/PermissionsContext';
import { routeMap, getFirstAllowedRoute } from '@/hooks/useFirstAllowedRoute';

interface PermissionGuardProps {
  children: ReactNode;
  module: AppModule;
  redirectTo?: string;
}

export function PermissionGuard({ children, module }: PermissionGuardProps) {
  const { hasModuleAccess, loading, permissions, isMaster } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasRedirected = useRef(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Reset flag quando módulo muda
  useEffect(() => {
    hasRedirected.current = false;
    setAccessChecked(false);
    setHasAccess(false);
  }, [module]);

  useEffect(() => {
    // Só verificar após o loading terminar
    if (loading) return;
    
    // Evitar múltiplos redirects
    if (hasRedirected.current) return;

    const access = hasModuleAccess(module);
    setHasAccess(access);
    setAccessChecked(true);
    
    if (!access) {
      hasRedirected.current = true;
      
      toast({
        title: '⛔ Acesso Negado',
        description: 'Você não tem permissão para acessar este módulo.',
        variant: 'destructive',
      });
      
      // Encontrar primeira rota permitida usando a função helper
      const targetRoute = getFirstAllowedRoute(permissions?.permissions, isMaster);
      navigate(targetRoute, { replace: true });
    }
  }, [loading, hasModuleAccess, module, navigate, toast, permissions, isMaster]);

  // Mostrar loading enquanto permissões estão sendo carregadas
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/30">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Aguardar verificação de acesso
  if (!accessChecked) {
    return null;
  }

  // Se não tem acesso, retornar null (o useEffect já redirecionou)
  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
