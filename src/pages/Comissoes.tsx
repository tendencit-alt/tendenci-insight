import { Percent } from "lucide-react";
import ComingSoonPage from "./ComingSoonPage";

export default function Comissoes() {
  return (
    <ComingSoonPage
      title="Comissões"
      description="Apuração e gestão de comissões de vendedores e parceiros, integrada ao Plano de Contas (2.4) e Order Responsibles."
      icon={<Percent className="h-8 w-8" />}
      bullets={[
        "Regras por vendedor, produto e cost center",
        "Apuração automática a partir de pedidos liquidados",
        "Geração de contas a pagar em 'Planejados'",
      ]}
    />
  );
}
