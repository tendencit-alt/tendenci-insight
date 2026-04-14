import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Zap, ChevronDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickFillTemplate {
  id: string;
  label: string;
  description?: string;
  values: Record<string, any>;
  category?: string;
  starred?: boolean;
}

interface QuickFillTemplatesProps {
  templates: QuickFillTemplate[];
  onApply: (values: Record<string, any>) => void;
  className?: string;
  label?: string;
}

export function QuickFillTemplates({
  templates,
  onApply,
  className,
  label = "Preenchimento Rápido",
}: QuickFillTemplatesProps) {
  const [open, setOpen] = useState(false);

  if (templates.length === 0) return null;

  const sorted = [...templates].sort((a, b) => {
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    return 0;
  });

  const categories = Array.from(new Set(sorted.map((t) => t.category).filter(Boolean))) as string[];

  const handleApply = (tpl: QuickFillTemplate) => {
    onApply(tpl.values);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-7 text-[10px] gap-1 rounded-lg", className)}
        >
          <Zap className="h-3 w-3 text-amber-500" />
          {label}
          <ChevronDown className="h-3 w-3 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1.5">
          Templates Disponíveis
        </p>
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {categories.length > 0
            ? categories.map((cat) => (
                <div key={cat}>
                  <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider px-2 pt-2 pb-1">
                    {cat}
                  </p>
                  {sorted
                    .filter((t) => t.category === cat)
                    .map((tpl) => (
                      <TemplateItem key={tpl.id} template={tpl} onApply={handleApply} />
                    ))}
                </div>
              ))
            : sorted.map((tpl) => (
                <TemplateItem key={tpl.id} template={tpl} onApply={handleApply} />
              ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TemplateItem({
  template,
  onApply,
}: {
  template: QuickFillTemplate;
  onApply: (t: QuickFillTemplate) => void;
}) {
  return (
    <button
      onClick={() => onApply(template)}
      className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-left"
    >
      {template.starred && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{template.label}</p>
        {template.description && (
          <p className="text-[10px] text-muted-foreground truncate">{template.description}</p>
        )}
      </div>
      <Badge variant="outline" className="text-[8px] h-4 shrink-0">
        {Object.keys(template.values).length} campos
      </Badge>
    </button>
  );
}
