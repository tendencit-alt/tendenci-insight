import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRightLeft } from "lucide-react";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { useNavigate } from "react-router-dom";

export const MASTER_OWNER_TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

interface Props {
  entity: string; // "clientes", "fornecedores", etc.
}

/**
 * Empty state shown when an Owner is sitting on the Master Owner tenant
 * (structure/templates only). Operational data cannot exist there, so we
 * guide the user to enter (impersonate) a real tenant.
 */
export function OwnerTenantEmptyState({ entity }: Props) {
  const { isOwner, activeTenantId, homeTenantId } = useActiveTenant();
  const navigate = useNavigate();

  const onMasterOwner =
    isOwner &&
    (activeTenantId === MASTER_OWNER_TENANT_ID ||
      activeTenantId === homeTenantId);

  if (!onMasterOwner) return null;

  return (
    <Card className="p-8 border-dashed">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="rounded-full bg-muted p-3">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">
          Você está no tenant Master Owner
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          O Master Owner contém apenas estrutura e templates do sistema.
          Cadastros de <strong>{entity}</strong> são isolados por tenant —
          entre em uma organização para visualizar ou criar registros.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate("/control-tower")}
          className="mt-2"
        >
          <ArrowRightLeft className="h-4 w-4 mr-1.5" />
          Trocar de tenant
        </Button>
      </div>
    </Card>
  );
}
