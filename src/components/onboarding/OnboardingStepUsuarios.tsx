import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Check, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  onComplete: () => void;
  completed?: boolean;
}

const PERFIS_SUGERIDOS = [
  { perfil: "Financeiro", desc: "Contas a pagar/receber, conciliação" },
  { perfil: "Comercial", desc: "Clientes, pedidos, comissões" },
  { perfil: "Operacional", desc: "Produção, montagem, entrega" },
  { perfil: "Gestor", desc: "Aprovações, dashboard, DRE" },
];

export function OnboardingStepUsuarios({ onComplete, completed }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Usuários
          {completed && <Check className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>Adicione colaboradores ao sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Você pode convidar usuários em <strong>Configurações → Gestão de Usuários</strong> a qualquer momento.
            Sugerimos começar com os perfis abaixo:
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PERFIS_SUGERIDOS.map(p => (
            <div key={p.perfil} className="border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{p.perfil}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
            </div>
          ))}
        </div>

        <Button onClick={onComplete}>
          <Check className="h-4 w-4 mr-2" /> Entendido, configurar depois
        </Button>
      </CardContent>
    </Card>
  );
}
