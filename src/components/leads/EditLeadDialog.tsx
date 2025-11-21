import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditLeadDialogProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditLeadDialog({ lead, open, onOpenChange, onSuccess }: EditLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    source: "",
    status: "",
    responsible: ""
  });

  useEffect(() => {
    fetchResponsaveis();
  }, []);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.client?.name || "",
        phone: lead.client?.phone || "",
        email: lead.client?.email || "",
        source: lead.utm_source || "",
        status: lead.status || "novo",
        responsible: lead.architect_id || ""
      });
    }
  }, [lead]);

  const fetchResponsaveis = async () => {
    const { data, error } = await supabase
      .from('architects')
      .select('id, name')
      .order('name');
    
    if (!error && data) {
      setResponsaveis(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update client
      if (lead.client_id) {
        const { error: clientError } = await supabase
          .from("clients")
          .update({
            name: formData.name,
            phone: formData.phone,
            email: formData.email
          })
          .eq("id", lead.client_id);

        if (clientError) throw clientError;
      }

      // Update lead
      const { error: leadError } = await supabase
        .from("leads")
        .update({
          status: formData.status,
          utm_source: formData.source,
          architect_id: formData.responsible || null
        })
        .eq("id", lead.id);

      if (leadError) throw leadError;

      toast.success("Lead atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (e.target instanceof Element && e.target.closest('[role="listbox"]')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Editar Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-source">Origem</Label>
              <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp IA">WhatsApp IA</SelectItem>
                  <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Orgânico">Orgânico</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="qualificando">Qualificando</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-responsible">Responsável</Label>
              <Select value={formData.responsible} onValueChange={(v) => setFormData({ ...formData, responsible: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Não atribuído" />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis.map((resp) => (
                    <SelectItem key={resp.id} value={resp.id}>
                      {resp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.responsible && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData({ ...formData, responsible: "" })}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Remover responsável
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
