import { useState } from "react";
import { useWorkspace, TEMPORARY_TEMPLATES } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Plus, Trash2, Pencil, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AVAILABLE_GROUPS = [
  "Home", "Comercial", "Operações", "Financeiro", "Controladoria",
  "Planejamento", "Cadastros", "Relatórios & BI",
];

export function WorkspaceSelector() {
  const {
    activeWorkspace,
    allWorkspaces,
    setActiveWorkspace,
    createWorkspace,
    deleteWorkspace,
    createFromTemplate,
  } = useWorkspace();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroups, setNewGroups] = useState<string[]>([]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createWorkspace({
      name: newName,
      icon: "📁",
      groups: newGroups.length > 0 ? newGroups : [],
      description: `Workspace personalizado: ${newName}`,
    });
    toast.success(`Workspace "${newName}" criado`);
    setCreateOpen(false);
    setNewName("");
    setNewGroups([]);
  };

  const handleTemplate = (template: typeof TEMPORARY_TEMPLATES[0]) => {
    createFromTemplate(template);
    toast.success(`Workspace "${template.name}" criado`);
  };

  const handleDelete = (id: string, name: string) => {
    deleteWorkspace(id);
    toast.info(`Workspace "${name}" removido`);
  };

  const toggleGroup = (group: string) => {
    setNewGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-medium px-2.5">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{activeWorkspace.icon} {activeWorkspace.name}</span>
            <span className="sm:hidden">{activeWorkspace.icon}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>

          {allWorkspaces.map(ws => (
            <DropdownMenuItem
              key={ws.id}
              className={cn(
                "flex items-center justify-between gap-2 cursor-pointer",
                ws.id === activeWorkspace.id && "bg-accent"
              )}
              onClick={() => setActiveWorkspace(ws.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{ws.icon}</span>
                <div className="min-w-0">
                  <span className="text-sm truncate block">{ws.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate block">{ws.description}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {ws.isTemporary && (
                  <Badge variant="outline" className="text-[9px] h-4">temp</Badge>
                )}
                {ws.id === activeWorkspace.id && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
                {!ws.isDefault && ws.id.startsWith("custom-") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(ws.id, ws.name);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Templates */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              <Plus className="h-3 w-3 mr-2" />
              Workspace Temporário
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TEMPORARY_TEMPLATES.map(t => (
                <DropdownMenuItem
                  key={t.name}
                  onClick={() => handleTemplate(t)}
                  className="text-xs"
                >
                  <span className="mr-2">{t.icon}</span>
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="text-xs">
            <Pencil className="h-3 w-3 mr-2" />
            Criar Personalizado
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Fechamento Trimestral"
              />
            </div>
            <div>
              <Label className="mb-2 block">Módulos visíveis</Label>
              <p className="text-xs text-muted-foreground mb-2">Deixe vazio para mostrar todos</p>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_GROUPS.map(g => (
                  <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={newGroups.includes(g)}
                      onCheckedChange={() => toggleGroup(g)}
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
