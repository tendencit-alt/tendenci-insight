import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  module: string;
  position: number;
  visible: boolean;
}

interface EditMenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem | null;
  onSuccess: () => void;
}

export function EditMenuItemDialog({
  open,
  onOpenChange,
  menuItem,
  onSuccess,
}: EditMenuItemDialogProps) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");
  const [route, setRoute] = useState("");
  const [loading, setLoading] = useState(false);

  // Atualizar estados quando menuItem mudar
  useEffect(() => {
    if (menuItem) {
      setLabel(menuItem.label);
      setIcon(menuItem.icon);
      setRoute(menuItem.route);
    }
  }, [menuItem]);

  const handleSave = async () => {
    if (!menuItem) return;

    if (!label.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!icon.trim()) {
      toast.error("Ícone é obrigatório");
      return;
    }

    if (!route.trim()) {
      toast.error("Rota é obrigatória");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('menu_items')
      .update({
        label: label.trim(),
        icon: icon.trim(),
        route: route.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', menuItem.id);

    if (error) {
      console.error('Erro ao atualizar item do menu:', error);
      toast.error('Erro ao atualizar item do menu');
    } else {
      toast.success('Item do menu atualizado! A mudança será aplicada para todos os usuários.');
      onSuccess();
      onOpenChange(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Item do Menu</DialogTitle>
          <DialogDescription>
            Edite o nome, ícone e rota deste item do menu. As alterações serão aplicadas para todos os usuários.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label">Nome do Item</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Dashboard, Leads, CRM..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Ícone (Lucide React)</Label>
            <Input
              id="icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Ex: LayoutDashboard, TrendingUp, Briefcase..."
            />
            <p className="text-xs text-muted-foreground">
              Use o nome do ícone do Lucide React (ex: "LayoutDashboard", "Users", "Settings")
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="route">Rota</Label>
            <Input
              id="route"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="Ex: /, /leads, /crm..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
