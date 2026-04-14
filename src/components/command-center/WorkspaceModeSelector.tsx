import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Monitor, Wallet, ShoppingCart, Factory, LayoutGrid } from "lucide-react";

const MODES = [
  { id: "all", label: "Completo", icon: LayoutGrid },
  { id: "executivo", label: "Executivo", icon: Monitor },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "comercial", label: "Comercial", icon: ShoppingCart },
  { id: "operacional", label: "Operacional", icon: Factory },
] as const;

export function WorkspaceModeSelector() {
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();

  return (
    <div className="flex items-center gap-1">
      {MODES.map((mode) => {
        const isActive = activeWorkspace.id === mode.id;
        return (
          <Button
            key={mode.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px] gap-1 rounded-lg"
            onClick={() => setActiveWorkspace(mode.id)}
          >
            <mode.icon className="h-3 w-3" />
            {mode.label}
          </Button>
        );
      })}
    </div>
  );
}
