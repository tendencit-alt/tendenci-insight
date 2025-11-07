import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ManagePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPipeline: string;
  onSuccess: () => void;
}

export function ManagePipelineDialog({
  open,
  onOpenChange,
  selectedPipeline,
  onSuccess,
}: ManagePipelineDialogProps) {
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Funis e Etapas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="text-center text-muted-foreground">
            <p>Funcionalidade de gerenciamento de funis e etapas</p>
            <p className="text-sm">Em desenvolvimento...</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
