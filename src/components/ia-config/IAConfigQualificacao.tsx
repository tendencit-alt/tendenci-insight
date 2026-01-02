import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

const camposDisponiveis = [
  { id: "nome", label: "Nome" },
  { id: "telefone", label: "Telefone" },
  { id: "email", label: "E-mail" },
  { id: "cidade", label: "Cidade" },
  { id: "empresa", label: "Empresa" },
  { id: "orcamento", label: "Orçamento" },
  { id: "prazo", label: "Prazo" },
];

const initialForm = {
  perguntas: [] as string[],
  criterios_lead: {
    quente: "",
    morno: "",
    frio: "",
  },
  campos_obrigatorios: ["nome", "telefone"],
};

export default function IAConfigQualificacao({ config, onSave, saving }: Props) {
  const [form, setForm, clearPersistedData, hasRestoredData] = useFormPersistence(
    'ia_config_qualificacao',
    initialForm,
    true
  );
  const [novaPergunta, setNovaPergunta] = useState("");

  useEffect(() => {
    if (config && !hasRestoredData) {
      const criterios = config.criterios_lead as Record<string, string> || {};
      setForm({
        perguntas: (config.perguntas as string[]) || [],
        criterios_lead: {
          quente: criterios.quente || "",
          morno: criterios.morno || "",
          frio: criterios.frio || "",
        },
        campos_obrigatorios: (config.campos_obrigatorios as string[]) || ["nome", "telefone"],
      });
    }
  }, [config, hasRestoredData]);

  const addPergunta = () => {
    if (novaPergunta.trim()) {
      setForm({ ...form, perguntas: [...form.perguntas, novaPergunta.trim()] });
      setNovaPergunta("");
    }
  };

  const removePergunta = (index: number) => {
    setForm({ ...form, perguntas: form.perguntas.filter((_, i) => i !== index) });
  };

  const toggleCampo = (campo: string, checked: boolean) => {
    if (checked) {
      setForm({ ...form, campos_obrigatorios: [...form.campos_obrigatorios, campo] });
    } else {
      setForm({ ...form, campos_obrigatorios: form.campos_obrigatorios.filter(c => c !== campo) });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    clearPersistedData();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSaveIndicator hasRestoredData={hasRestoredData} />
      <div className="space-y-4">
        <Label>Campos Obrigatórios a Coletar</Label>
        <div className="flex flex-wrap gap-4">
          {camposDisponiveis.map((campo) => (
            <div key={campo.id} className="flex items-center gap-2">
              <Checkbox
                id={campo.id}
                checked={form.campos_obrigatorios.includes(campo.id)}
                onCheckedChange={(checked) => toggleCampo(campo.id, checked as boolean)}
              />
              <label htmlFor={campo.id} className="text-sm">{campo.label}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Perguntas de Qualificação</Label>
        <p className="text-sm text-muted-foreground">
          Adicione perguntas que a IA deve fazer para qualificar o lead
        </p>
        
        <div className="flex gap-2">
          <Input
            value={novaPergunta}
            onChange={(e) => setNovaPergunta(e.target.value)}
            placeholder="Ex: Qual é o seu orçamento disponível?"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPergunta())}
          />
          <Button type="button" onClick={addPergunta} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {form.perguntas.map((pergunta, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="flex-1">{pergunta}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePergunta(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {form.perguntas.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Nenhuma pergunta adicionada ainda
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Critérios para Classificação de Leads</Label>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Lead Quente</span>
            </div>
            <EnhancedTextarea
              value={form.criterios_lead.quente}
              onChange={(value) => setForm({
                ...form,
                criterios_lead: { ...form.criterios_lead, quente: value }
              })}
              placeholder="Ex: Tem orçamento definido, prazo curto, já conhece a empresa..."
              rows={4}
              context="Critérios para classificar lead como quente"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium">Lead Morno</span>
            </div>
            <EnhancedTextarea
              value={form.criterios_lead.morno}
              onChange={(value) => setForm({
                ...form,
                criterios_lead: { ...form.criterios_lead, morno: value }
              })}
              placeholder="Ex: Interessado mas sem urgência, pesquisando opções..."
              rows={4}
              context="Critérios para classificar lead como morno"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">Lead Frio</span>
            </div>
            <EnhancedTextarea
              value={form.criterios_lead.frio}
              onChange={(value) => setForm({
                ...form,
                criterios_lead: { ...form.criterios_lead, frio: value }
              })}
              placeholder="Ex: Apenas curiosidade, sem orçamento definido..."
              rows={4}
              context="Critérios para classificar lead como frio"
            />
          </div>
        </div>
      </div>

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
