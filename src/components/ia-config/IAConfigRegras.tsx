import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Plus, Trash2, GripVertical } from "lucide-react";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

interface Regra {
  titulo: string;
  descricao: string;
}

export default function IAConfigRegras({ config, onSave, saving }: Props) {
  const [form, setForm] = useState({
    regras_personalizadas: [] as Regra[],
    condicoes_especiais: [] as string[],
    excecoes: [] as string[],
    prioridades: [] as string[],
  });

  const [novaRegra, setNovaRegra] = useState({ titulo: "", descricao: "" });
  const [novaCondicao, setNovaCondicao] = useState("");
  const [novaExcecao, setNovaExcecao] = useState("");
  const [novaPrioridade, setNovaPrioridade] = useState("");

  useEffect(() => {
    if (config) {
      setForm({
        regras_personalizadas: (config.regras_personalizadas as Regra[]) || [],
        condicoes_especiais: (config.condicoes_especiais as string[]) || [],
        excecoes: (config.excecoes as string[]) || [],
        prioridades: (config.prioridades as string[]) || [],
      });
    }
  }, [config]);

  const addRegra = () => {
    if (novaRegra.titulo.trim() && novaRegra.descricao.trim()) {
      setForm({
        ...form,
        regras_personalizadas: [...form.regras_personalizadas, novaRegra]
      });
      setNovaRegra({ titulo: "", descricao: "" });
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Regras Personalizadas */}
      <div className="space-y-3">
        <Label>📋 Regras de Negócio Personalizadas</Label>
        <p className="text-sm text-muted-foreground">
          Regras específicas que a IA deve seguir em determinadas situações
        </p>
        
        <div className="grid gap-2 md:grid-cols-3">
          <Input
            value={novaRegra.titulo}
            onChange={(e) => setNovaRegra({ ...novaRegra, titulo: e.target.value })}
            placeholder="Título da regra"
          />
          <Input
            value={novaRegra.descricao}
            onChange={(e) => setNovaRegra({ ...novaRegra, descricao: e.target.value })}
            placeholder="Descrição / quando aplicar"
            className="md:col-span-1"
          />
          <Button type="button" onClick={addRegra} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {form.regras_personalizadas.map((regra, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{regra.titulo}</p>
                <p className="text-sm text-muted-foreground">{regra.descricao}</p>
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
            placeholder="Ex: Arquitetos tier A podem ter desconto extra de 5%"
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
