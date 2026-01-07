import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CostCenterTag {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

interface CostCenterTagsSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function CostCenterTagsSelector({ selectedIds, onChange, disabled }: CostCenterTagsSelectorProps) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["cost-center-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_center_tags")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as CostCenterTag[];
    }
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const colors = [
        "bg-purple-100 text-purple-800",
        "bg-blue-100 text-blue-800",
        "bg-amber-100 text-amber-800",
        "bg-green-100 text-green-800",
        "bg-pink-100 text-pink-800",
        "bg-yellow-100 text-yellow-800",
        "bg-emerald-100 text-emerald-800",
        "bg-red-100 text-red-800",
        "bg-indigo-100 text-indigo-800",
        "bg-cyan-100 text-cyan-800"
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const { data, error } = await supabase
        .from("cost_center_tags")
        .insert({ name: name.trim(), color: randomColor })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["cost-center-tags"] });
      onChange([...selectedIds, newTag.id]);
      setNewTagName("");
      setShowNewTagInput(false);
      toast({ title: "Tag criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tag",
        description: error.message?.includes("duplicate") ? "Já existe uma tag com esse nome" : error.message,
        variant: "destructive"
      });
    }
  });

  const selectedTags = tags.filter(t => selectedIds.includes(t.id));

  const toggleTag = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedIds, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    onChange(selectedIds.filter(id => id !== tagId));
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      createTagMutation.mutate(newTagName);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10"
            disabled={disabled}
          >
            {selectedTags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedTags.map(tag => (
                  <Badge key={tag.id} className={cn(tag.color, "text-xs")}>
                    {tag.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Selecionar centros de custo...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar centro de custo..." />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Carregando..." : "Nenhum centro de custo encontrado."}
              </CommandEmpty>
              <CommandGroup>
                {tags.map(tag => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => toggleTag(tag.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.includes(tag.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Badge className={cn(tag.color, "text-xs")}>{tag.name}</Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            
            <div className="border-t p-2">
              {showNewTagInput ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome da nova tag..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateTag();
                      }
                    }}
                    className="h-8 text-sm"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || createTagMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setShowNewTagInput(false);
                      setNewTagName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setShowNewTagInput(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar nova tag
                </Button>
              )}
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map(tag => (
            <Badge key={tag.id} className={cn(tag.color, "text-xs pr-1")}>
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
