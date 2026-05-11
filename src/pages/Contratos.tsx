import { FileSignature } from "lucide-react";
import ComingSoonPage from "./ComingSoonPage";

export default function Contratos() {
  return (
    <ComingSoonPage
      title="Contratos"
      description="Gestão de contratos vinculados a pedidos e clientes, com cláusulas, vigência, aditivos e assinatura eletrônica."
      icon={<FileSignature className="h-8 w-8" />}
      bullets={[
        "Modelos por tipo de serviço/projeto",
        "Vigência, aditivos e renovação",
        "Assinatura eletrônica integrada",
      ]}
    />
  );
}
