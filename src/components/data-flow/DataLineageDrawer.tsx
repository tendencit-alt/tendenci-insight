import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";
import { DataLineageTimeline } from "./DataLineageTimeline";

interface Props {
  entityType: string;
  entityId: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerSize?: "default" | "sm" | "icon";
  iconOnly?: boolean;
}

export function DataLineageDrawer({
  entityType,
  entityId,
  triggerLabel = "Ver linhagem",
  triggerVariant = "outline",
  triggerSize = "sm",
  iconOnly = false,
}: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant={triggerVariant} size={iconOnly ? "icon" : triggerSize}>
          <GitBranch className="h-4 w-4" />
          {!iconOnly && <span className="ml-2">{triggerLabel}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl w-full overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Fluxo de Dados
          </SheetTitle>
          <SheetDescription>
            De onde este registro veio, para onde foi e o histórico completo de alterações.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden mt-4">
          <DataLineageTimeline entityType={entityType} entityId={entityId} compact />
        </div>
      </SheetContent>
    </Sheet>
  );
}
