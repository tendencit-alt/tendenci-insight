import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FileSpreadsheet, X, Search, Check } from "lucide-react";

interface TemplateFicha {
  id: string;
  name: string;
  status: string;
  cmv_total: number | null;
}

interface TemplateFichaSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function TemplateFichaSelector({ value, onChange, className }: TemplateFichaSelectorProps) {
  const [open, setOpen] = useState(false);

  // Carregar fichas técnicas padrão (is_template = true)
  const { data: templateFichas = [], isLoading } = useQuery({
    queryKey: ["template-fichas-for-selector"],
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

  // Encontrar ficha selecionada
  const selectedFicha = templateFichas.find(f => f.id === value);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge variant="default" className="bg-green-500 text-xs">Aprovado</Badge>;
      case 'finalizado':
        return <Badge variant="secondary" className="text-xs">Finalizado</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Rascunho</Badge>;
    }
  };

  return (
    <div className={`border rounded-lg p-4 space-y-3 bg-muted/30 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 font-medium">
          <FileSpreadsheet className="h-4 w-4" />
          Ficha Técnica Padrão
        </Label>
        {selectedFicha && getStatusBadge(selectedFicha.status)}
      </div>
      <p className="text-xs text-muted-foreground">
        Vincule uma ficha técnica padrão para usar como modelo de produção
      </p>

      {selectedFicha ? (
        <div className="p-3 rounded-lg border bg-background">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium">{selectedFicha.name}</p>
              {selectedFicha.cmv_total && (
                <p className="text-sm text-muted-foreground">
                  CMV: R$ {selectedFicha.cmv_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-start">
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? "Carregando..." : "Vincular ficha técnica padrão..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar ficha técnica..." />
              <CommandList>
                <CommandEmpty>Nenhuma ficha técnica padrão encontrada.</CommandEmpty>
                <CommandGroup heading="Fichas Técnicas Padrão">
                  {templateFichas.map(ficha => (
                    <CommandItem
                      key={ficha.id}
                      value={ficha.name}
                      onSelect={() => {
                        onChange(ficha.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1">
                          <p className="font-medium">{ficha.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ficha.cmv_total 
                              ? `CMV: R$ ${ficha.cmv_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : 'CMV não definido'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(ficha.status)}
                          {value === ficha.id && <Check className="h-4 w-4" />}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      
      {templateFichas.length === 0 && !isLoading && (
        <p className="text-xs text-amber-600">
          Nenhuma ficha técnica padrão disponível. Crie uma em Fichas Técnicas → Padrão.
        </p>
      )}
    </div>
  );
}
