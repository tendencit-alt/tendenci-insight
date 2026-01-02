import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

const initialForm = {
  nunca_fazer: [] as string[],
  limites_negociacao: "",
  pedir_ajuda_quando: "",
  clientes_dificeis: "",
  nivel_insistencia: "moderado",
};

export default function IAConfigComportamento({ config, onSave, saving }: Props) {
  const [form, setForm, clearPersistedData, hasRestoredData] = useFormPersistence(
    'ia_config_comportamento',
    initialForm,
    true
  );
  const [novoItem, setNovoItem] = useState("");

  useEffect(() => {
    if (config && !hasRestoredData) {
      setForm({
        nunca_fazer: (config.nunca_fazer as string[]) || [],
        limites_negociacao: (config.limites_negociacao as string) || "",
        pedir_ajuda_quando: (config.pedir_ajuda_quando as string) || "",
        clientes_dificeis: (config.clientes_dificeis as string) || "",
        nivel_insistencia: (config.nivel_insistencia as string) || "moderado",
      });
    }
  }, [config, hasRestoredData]);

  const addNuncaFazer = () => {
    if (novoItem.trim()) {
      setForm({ ...form, nunca_fazer: [...form.nunca_fazer, novoItem.trim()] });
      setNovoItem("");
    }
  };

  const removeNuncaFazer = (index: number) => {
    setForm({ ...form, nunca_fazer: form.nunca_fazer.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    clearPersistedData();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSaveIndicator hasRestoredData={hasRestoredData} />
      {/* O que NUNCA fazer */}
      <div className="space-y-3">
        <Label className="text-destructive">🚫 O que a IA NUNCA deve fazer</Label>
        <p className="text-sm text-muted-foreground">
          Comportamentos proibidos que a IA deve evitar a todo custo
        </p>
        <div className="flex gap-2">
          <Input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            placeholder="Ex: Nunca falar mal de concorrentes"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addNuncaFazer())}
          />
          <Button type="button" onClick={addNuncaFazer} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {form.nunca_fazer.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <span className="flex-1 text-sm">❌ {item}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeNuncaFazer(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Nível de Insistência */}
      <div className="space-y-2">
        <Label>Nível de Insistência nas Vendas</Label>
        <Select value={form.nivel_insistencia} onValueChange={(v) => setForm({ ...form, nivel_insistencia: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="baixo">Baixo (1-2 tentativas, desiste fácil)</SelectItem>
            <SelectItem value="moderado">Moderado (3-4 tentativas com intervalos)</SelectItem>
            <SelectItem value="alto">Alto (5+ tentativas, muito persistente)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Limites de Negociação */}
      <EnhancedTextarea
        label="Limites de Negociação"
        value={form.limites_negociacao}
        onChange={(value) => setForm({ ...form, limites_negociacao: value })}
        placeholder="Ex: Desconto máximo de 10%, não parcelar em mais de 12x, não incluir frete grátis para pedidos abaixo de R$500..."
        rows={4}
        context="Limites de negociação para vendas"
      />

      {/* Quando pedir ajuda */}
      <EnhancedTextarea
        label="Quando Pedir Ajuda de um Humano"
        value={form.pedir_ajuda_quando}
        onChange={(value) => setForm({ ...form, pedir_ajuda_quando: value })}
        placeholder="Ex: Reclamações graves, solicitação de reembolso, dúvidas técnicas complexas, cliente muito insatisfeito..."
        rows={4}
        context="Situações para pedir ajuda humana"
      />

      {/* Clientes difíceis */}
      <EnhancedTextarea
        label="Como Lidar com Clientes Difíceis"
        value={form.clientes_dificeis}
        onChange={(value) => setForm({ ...form, clientes_dificeis: value })}
        placeholder="Ex: Manter a calma, não discutir, validar sentimentos, oferecer soluções, escalar se necessário..."
        rows={4}
        context="Estratégias para lidar com clientes difíceis"
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>
    </form>
  );
}
