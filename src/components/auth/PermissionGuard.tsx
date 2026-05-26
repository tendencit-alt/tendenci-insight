import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import type { AppModule } from "@/contexts/PermissionsContext";
import { NoAccess } from "@/components/auth/NoAccess";

interface PermissionGuardProps {
  children: ReactNode;
  module: AppModule;
}

export function PermissionGuard({ children, module }: PermissionGuardProps) {
  const { hasModuleAccess, loading, isMaster } = usePermissions();

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

  // Owner real (sem simulação) tem acesso total
  if (isMaster) return <>{children}</>;

  if (!hasModuleAccess(module, "view")) {
    return <NoAccess module={module} />;
  }

  return <>{children}</>;
}
