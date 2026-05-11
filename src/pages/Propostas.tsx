import { FileText } from "lucide-react";
import ComingSoonPage from "./ComingSoonPage";

export default function Propostas() {
  return (
    <ComingSoonPage
      title="Orçamentos / Propostas"
      description="Geração, versionamento e envio de propostas comerciais com aprovação do cliente e conversão automática em pedido."
      icon={<FileText className="h-8 w-8" />}
      bullets={[
        "Templates de proposta com itens do catálogo",
        "Versões e histórico de negociação",
        "Aceite digital e conversão em pedido",
      ]}
    />
  );
}
