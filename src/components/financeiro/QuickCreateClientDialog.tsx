import { useQueryClient } from "@tanstack/react-query";
import { CreateClientDialog } from "@/components/crm/CreateClientDialog";

interface QuickCreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (clientId: string) => void;
}

/**
 * Padronizado: usa o formulário completo de cliente (mesmo do Pedido/CRM),
 * com endereço, CEP, CPF/CNPJ, status de boleto e observações.
 */
export function QuickCreateClientDialog({
  open,
  onOpenChange,
  onCreated,
}: QuickCreateClientDialogProps) {
  const queryClient = useQueryClient();

  return (
    <CreateClientDialog
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={(clientId) => {
        queryClient.invalidateQueries({ queryKey: ["clients-list"] });
        onCreated(clientId);
      }}
    />
  );
}
