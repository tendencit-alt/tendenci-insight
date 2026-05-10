import { Building2, Check, Home, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveTenant } from "@/hooks/useActiveTenant";

export default function Empresas() {
  const { memberships, activeTenantId, loading, switching, switchTenant } = useActiveTenant();

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Empresas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione a empresa ativa. Todos os dados exibidos no sistema serão filtrados pelo tenant escolhido.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando empresas...
          </div>
        ) : memberships.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Você não tem acesso a nenhuma empresa.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberships.map((m) => {
              const isActive = m.tenant_id === activeTenantId;
              return (
                <Card key={m.tenant_id} className={isActive ? "border-primary ring-1 ring-primary" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                      <span className="truncate">{m.name}</span>
                      {isActive && (
                        <Badge variant="default" className="text-[10px] gap-1">
                          <Check className="h-3 w-3" /> Ativa
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="capitalize text-[10px]">{m.role}</Badge>
                      {m.is_home && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Home className="h-3 w-3" /> Principal
                        </Badge>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      size="sm"
                      disabled={isActive || switching}
                      onClick={() => switchTenant(m.tenant_id)}
                    >
                      {switching ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Trocando...</>
                      ) : isActive ? (
                        "Empresa atual"
                      ) : (
                        "Entrar"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
