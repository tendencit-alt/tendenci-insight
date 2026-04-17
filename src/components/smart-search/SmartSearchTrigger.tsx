import { useEffect, useState } from "react";
import { Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartSearchDialog } from "./SmartSearchDialog";

export function SmartSearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground hover:text-foreground w-full max-w-xs justify-start"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs flex-1 text-left">Buscar...</span>
        <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0 h-4">
          <Command className="h-2.5 w-2.5" /> K
        </Badge>
      </Button>
      <SmartSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
