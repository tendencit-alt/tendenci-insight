import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateFicha {
  id: string;
  name: string;
  status: string;
  cmv_total: number;
}

interface TemplateFichaSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TemplateFichaSelector({ 
  value, 
  onChange, 
  placeholder = "Selecionar ficha técnica...",
  disabled = false 
}: TemplateFichaSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["template-fichas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_products")
        .select("id, name, status, cmv_total")
        .eq("is_template", true)
        .order("name");
      
      if (error) throw error;
      return data as TemplateFicha[];
    }
  });

  const selectedTemplate = templates.find(t => t.id === value);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-xs">Aprovada</Badge>;
      case "rascunho":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200 text-xs">Rascunho</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || isLoading}
          >
            {selectedTemplate ? (
              <div className="flex items-center gap-2 truncate">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="truncate">{selectedTemplate.name}</span>
                {getStatusBadge(selectedTemplate.status)}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar ficha técnica..." />
            <CommandList>
              <CommandEmpty>Nenhuma ficha técnica encontrada.</CommandEmpty>
              <CommandGroup>
                {templates.map((template) => (
                  <CommandItem
                    key={template.id}
                    value={template.name}
                    onSelect={() => {
                      onChange(template.id === value ? null : template.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === template.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        <span>{template.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(template.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(template.cmv_total || 0)}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onChange(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
