import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";

interface DealArchitectIndicationProps {
  dealId: string;
  dealCategoria?: string;
  dealCentroCusto?: string;
  dealTipoProduto?: string;
}

interface Indication {
  id: string;
  architect_id: string;
  product_type: string;
  categoria: string | null;
  centro_custo: string | null;
  value: number;
  notes: string | null;
  created_at: string;
  architects: {
    name: string;
  };
}

export function DealArchitectIndication({
  dealId,
  dealCategoria,
  dealCentroCusto,
  dealTipoProduto,
}: DealArchitectIndicationProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [architects, setArchitects] = useState<any[]>([]);
  const [indications, setIndications] = useState<Indication[]>([]);
  const [formData, setFormData, clearPersistedData, hasRestoredData] = useFormPersistence(
    `deal-architect-indication-${dealId}`,
    {
      architect_id: "",
      product_type: dealTipoProduto || "",
      categoria: dealCategoria || "",
      centro_custo: dealCentroCusto || "",
      value: "",
      notes: "",
    },
    true
  );

  useEffect(() => {
    fetchArchitects();
    fetchIndications();
  }, [dealId]);

  const fetchArchitects = async () => {
    const { data } = await supabase
      .from("architects")
      .select("id, name")
      .eq("active", true)
      .order("name");
    
    if (data) setArchitects(data);
  };

  const fetchIndications = async () => {
    const { data } = await supabase
      .from("architect_indications")
      .select(`
        id,
        architect_id,
        product_type,
        categoria,
        centro_custo,
        value,
        notes,
        created_at,
        architects (name)
      `)
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    
    if (data) setIndications(data as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.architect_id) {
      toast.error("Selecione um profissional parceiro");
      return;
    }

    if (!formData.product_type) {
      toast.error("Tipo de produto é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("architect_indications").insert({
        deal_id: dealId,
        architect_id: formData.architect_id,
        product_type: formData.product_type,
        categoria: formData.categoria || null,
        centro_custo: formData.centro_custo || null,
        value: formData.value ? parseFloat(formData.value) : 0,
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Indicação registrada com sucesso!");
      clearPersistedData();
      setShowForm(false);
      setFormData({
        architect_id: "",
        product_type: dealTipoProduto || "",
        categoria: dealCategoria || "",
        centro_custo: dealCentroCusto || "",
        value: "",
        notes: "",
      });
      fetchIndications();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar indicação");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (indicationId: string) => {
    if (!confirm("Tem certeza que deseja remover esta indicação?")) return;

    try {
      const { error } = await supabase
        .from("architect_indications")
        .delete()
        .eq("id", indicationId);

      if (error) throw error;

      toast.success("Indicação removida");
      fetchIndications();
    } catch (error: any) {
      toast.error("Erro ao remover indicação");
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Indicação de Profissional Parceiro</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 border-t pt-3">
          <FormSaveIndicator hasRestoredData={hasRestoredData} className="mb-2" />
          
          <div>
            <Label>Profissional Parceiro *</Label>
            <Select
              value={formData.architect_id}
              onValueChange={(v) => setFormData({ ...formData, architect_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional parceiro" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {architects.map((arch) => (
                  <SelectItem key={arch.id} value={arch.id}>
                    {arch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Produto *</Label>
              <Input
                value={formData.product_type}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                placeholder="Ex: Sofá, Mesa"
              />
            </div>

            <div>
              <Label>Valor Estimado</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Detalhes sobre a indicação..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      )}

      {indications.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm text-muted-foreground">
            {indications.length} indicaç{indications.length === 1 ? "ão" : "ões"} registrada{indications.length === 1 ? "" : "s"}
          </p>
          {indications.map((indication) => (
            <Card key={indication.id} className="p-3 flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{indication.architects.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {indication.product_type}
                  </Badge>
                </div>
                {indication.value > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Valor estimado: R$ {indication.value.toFixed(2)}
                  </p>
                )}
                {indication.notes && (
                  <p className="text-xs text-muted-foreground italic">{indication.notes}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(indication.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(indication.id)}
                className="h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {indications.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma indicação registrada
        </p>
      )}
    </Card>
  );
}
