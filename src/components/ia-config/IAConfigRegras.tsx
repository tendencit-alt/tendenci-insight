import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Plus, Trash2, GripVertical } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

interface Regra {
  regra: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

// Interface antiga para backward compatibility
interface RegraLegacy {
  titulo: string;
  descricao: string;
}

const initialForm = {
  regras_personalizadas: [] as Regra[],
  condicoes_especiais: [] as string[],
  excecoes: [] as string[],
  prioridades: [] as string[],
};

export default function IAConfigRegras({ config, onSave, saving }: Props) {
  const [form, setForm, clearPersistedData, hasRestoredData] = useFormPersistence(
    'ia_config_regras',
    initialForm,
    true
  );

  const [novaRegra, setNovaRegra] = useState("");
  const [novaPrioridadeRegra, setNovaPrioridadeRegra] = useState<'alta' | 'media' | 'baixa'>('media');
  const [novaCondicao, setNovaCondicao] = useState("");
  const [novaExcecao, setNovaExcecao] = useState("");
  const [novaPrioridade, setNovaPrioridade] = useState("");

  useEffect(() => {
    if (config && !hasRestoredData) {
      // Convert legacy format if needed
      let regras: Regra[] = [];
      const rawRegras = config.regras_personalizadas as (Regra | RegraLegacy)[] || [];
      
      rawRegras.forEach((r: any) => {
        if ('regra' in r) {
          // Novo formato
          regras.push({ regra: r.regra, prioridade: r.prioridade || 'media' });
        } else if ('titulo' in r && 'descricao' in r) {
          // Formato legado: converter
          regras.push({ 
            regra: `${r.titulo}: ${r.descricao}`, 
            prioridade: 'media' 
          });
        }
      });

      setForm({
        regras_personalizadas: regras,
        condicoes_especiais: (config.condicoes_especiais as string[]) || [],
        excecoes: (config.excecoes as string[]) || [],
        prioridades: (config.prioridades as string[]) || [],
      });
    }
  }, [config, hasRestoredData]);

  const addRegra = () => {
    if (novaRegra.trim()) {
      setForm({
        ...form,
        regras_personalizadas: [...form.regras_personalizadas, { 
          regra: novaRegra.trim(), 
          prioridade: novaPrioridadeRegra 
        }]
      });
      setNovaRegra("");
      setNovaPrioridadeRegra('media');
    }
  };

  const removeRegra = (index: number) => {
    setForm({
      ...form,
      regras_personalizadas: form.regras_personalizadas.filter((_, i) => i !== index)
    });
  };

  const addItem = (
    field: "condicoes_especiais" | "excecoes" | "prioridades",
    value: string,
    setter: (v: string) => void
  ) => {
    if (value.trim()) {
      setForm({ ...form, [field]: [...form[field], value.trim()] });
      setter("");
    }
  };

  const removeItem = (field: "condicoes_especiais" | "excecoes" | "prioridades", index: number) => {
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== index) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    clearPersistedData();
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'bg-red-500/10 border-red-500/20 text-red-700';
      case 'media': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700';
      case 'baixa': return 'bg-blue-500/10 border-blue-500/20 text-blue-700';
      default: return 'bg-muted';
    }
  };

  const getPrioridadeLabel = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return '🔴 Alta';
      case 'media': return '🟡 Média';
      case 'baixa': return '🔵 Baixa';
      default: return prioridade;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSaveIndicator hasRestoredData={hasRestoredData} />
      
      {/* Regras Personalizadas */}
      <div className="space-y-3">
        <Label>📋 Regras de Negócio Personalizadas</Label>
        <p className="text-sm text-muted-foreground">
          Regras específicas que a IA deve seguir em determinadas situações
        </p>
        
        <div className="grid gap-2 md:grid-cols-4">
          <Input
            value={novaRegra}
            onChange={(e) => setNovaRegra(e.target.value)}
            placeholder="Descrição da regra..."
            className="md:col-span-2"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addRegra())}
          />
          <Select value={novaPrioridadeRegra} onValueChange={(v) => setNovaPrioridadeRegra(v as 'alta' | 'media' | 'baixa')}>
            <SelectTrigger>
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alta">🔴 Alta - Crítica</SelectItem>
              <SelectItem value="media">🟡 Média - Importante</SelectItem>
              <SelectItem value="baixa">🔵 Baixa - Opcional</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" onClick={addRegra} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {form.regras_personalizadas.map((regra, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border ${getPrioridadeColor(regra.prioridade)}`}>
              <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{regra.regra}</p>
                <p className="text-xs mt-1">{getPrioridadeLabel(regra.prioridade)}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeRegra(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Condições Especiais */}
      <div className="space-y-3">
        <Label>⚡ Condições Especiais</Label>
        <p className="text-sm text-muted-foreground">
          Situações que ativam comportamentos especiais da IA
        </p>
        <div className="flex gap-2">
          <Input
            value={novaCondicao}
            onChange={(e) => setNovaCondicao(e.target.value)}
            placeholder="Ex: Se cliente mencionar 'concorrente X', destacar nossos diferenciais"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addItem("condicoes_especiais", novaCondicao, setNovaCondicao))}
          />
          <Button type="button" onClick={() => addItem("condicoes_especiais", novaCondicao, setNovaCondicao)} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {form.condicoes_especiais.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded text-sm">
              <span className="flex-1">⚡ {item}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem("condicoes_especiais", i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Exceções */}
      <div className="space-y-3">
        <Label>⚠️ Exceções</Label>
        <p className="text-sm text-muted-foreground">
          Situações onde regras normais não se aplicam
        </p>
        <div className="flex gap-2">
          <Input
            value={novaExcecao}
            onChange={(e) => setNovaExcecao(e.target.value)}
            placeholder="Ex: Parceiros Profissionais tier A podem ter desconto extra de 5%"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addItem("excecoes", novaExcecao, setNovaExcecao))}
          />
          <Button type="button" onClick={() => addItem("excecoes", novaExcecao, setNovaExcecao)} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {form.excecoes.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-orange-500/10 rounded text-sm">
              <span className="flex-1">⚠️ {item}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem("excecoes", i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Prioridades */}
      <div className="space-y-3">
        <Label>🎯 Prioridades de Atendimento</Label>
        <p className="text-sm text-muted-foreground">
          Ordem de prioridade para tipos de clientes ou situações
        </p>
        <div className="flex gap-2">
          <Input
            value={novaPrioridade}
            onChange={(e) => setNovaPrioridade(e.target.value)}
            placeholder="Ex: 1. Clientes existentes, 2. Leads quentes, 3. Leads frios"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addItem("prioridades", novaPrioridade, setNovaPrioridade))}
          />
          <Button type="button" onClick={() => addItem("prioridades", novaPrioridade, setNovaPrioridade)} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {form.prioridades.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-blue-500/10 rounded text-sm">
              <span className="font-bold text-primary">{i + 1}.</span>
              <span className="flex-1">{item}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem("prioridades", i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
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
