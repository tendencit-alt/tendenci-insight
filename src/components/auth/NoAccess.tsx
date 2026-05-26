import { useNavigate } from "react-router-dom";
import { ShieldOff, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoAccessProps {
  module?: string;
  reason?: string;
}

export function NoAccess({ module, reason }: NoAccessProps) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/30 p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Você não tem acesso a este módulo</h1>
          <p className="text-muted-foreground text-sm">
            {reason ??
              `Seu perfil atual não permite visualizar${
                module ? ` o módulo "${module}"` : " este módulo"
              }. Solicite acesso ao administrador da sua conta.`}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Voltar
          </Button>
          <Button onClick={() => navigate("/", { replace: true })}>
            <Home className="w-4 h-4 mr-2" /> Ir para a Home
          </Button>
        </div>
      </div>
    </div>
  );
}
