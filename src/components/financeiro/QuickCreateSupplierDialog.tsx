import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface QuickCreateSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (supplierId: string) => void;
}

export function QuickCreateSupplierDialog({
  open,
  onOpenChange,
  onCreated,
}: QuickCreateSupplierDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    cpf_cnpj: "",
    email: "",
    phone: "",
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          name: form.name.trim(),
          cpf_cnpj: form.cpf_cnpj || null,
          email: form.email || null,
          phone: form.phone || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Fornecedor criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["suppliers-list"] });
      onCreated(data.id);
      onOpenChange(false);
      setForm({ name: "", cpf_cnpj: "", email: "", phone: "" });
    } catch (error: any) {
      toast.error("Erro ao criar fornecedor: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Fornecedor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              placeholder="Nome do fornecedor..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>CPF/CNPJ</Label>
            <Input
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              value={form.cpf_cnpj}
              onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Fornecedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
