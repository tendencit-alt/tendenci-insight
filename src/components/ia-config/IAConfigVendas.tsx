import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

const initialForm = {
  tecnicas: [] as string[],
  gatilhos_urgencia: [] as string[],
  objecoes: [] as { objecao: string; resposta: string }[],
  quando_transferir: "",
  script_followup: "",
  promocoes: [] as string[],
};

export default function IAConfigVendas({ config, onSave, saving }: Props) {
  const [form, setForm, clearPersistedData, hasRestoredData] = useFormPersistence(
    'ia_config_vendas',
    initialForm,
    true
  );

  const [novaTecnica, setNovaTecnica] = useState("");
  const [novoGatilho, setNovoGatilho] = useState("");
  const [novaObjecao, setNovaObjecao] = useState({ objecao: "", resposta: "" });
  const [novaPromocao, setNovaPromocao] = useState("");

  useEffect(() => {
    if (config && !hasRestoredData) {
      setForm({
        tecnicas: (config.tecnicas as string[]) || [],
        gatilhos_urgencia: (config.gatilhos_urgencia as string[]) || [],
        objecoes: (config.objecoes as { objecao: string; resposta: string }[]) || [],
        quando_transferir: (config.quando_transferir as string) || "",
        script_followup: (config.script_followup as string) || "",
        promocoes: (config.promocoes as string[]) || [],
      });
    }
  }, [config, hasRestoredData]);

  const addItem = (field: "tecnicas" | "gatilhos_urgencia" | "promocoes", value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      setForm({ ...form, [field]: [...form[field], value.trim()] });
      setter("");
    }
  };

  const removeItem = (field: "tecnicas" | "gatilhos_urgencia" | "promocoes", index: number) => {
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== index) });
  };

  const addObjecao = () => {
    if (novaObjecao.objecao.trim() && novaObjecao.resposta.trim()) {
      setForm({ ...form, objecoes: [...form.objecoes, novaObjecao] });
      setNovaObjecao({ objecao: "", resposta: "" });
    }
  };

  const removeObjecao = (index: number) => {
    setForm({ ...form, objecoes: form.objecoes.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    clearPersistedData();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSaveIndicator hasRestoredData={hasRestoredData} />
      {/* Técnicas de Vendas */}
      <div className="space-y-3">
        <Label>Técnicas de Vendas a Usar</Label>
        <div className="flex gap-2">
          <Input
            value={novaTecnica}
            onChange={(e) => setNovaTecnica(e.target.value)}
            placeholder="Ex: SPIN Selling, Rapport, Escuta Ativa..."
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addItem("tecnicas", novaTecnica, setNovaTecnica))}
          />
          <Button type="button" onClick={() => addItem("tecnicas", novaTecnica, setNovaTecnica)} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.tecnicas.map((item, i) => (
            <div key={i} className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-sm">
              {item}
              <button type="button" onClick={() => removeItem("tecnicas", i)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Gatilhos de Urgência */}
      <div className="space-y-3">
        <Label>Gatilhos de Urgência</Label>
        <div className="flex gap-2">
          <Input
            value={novoGatilho}
            onChange={(e) => setNovoGatilho(e.target.value)}
            placeholder="Ex: Última unidade, Promoção termina em 24h..."
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addItem("gatilhos_urgencia", novoGatilho, setNovoGatilho))}
          />
          <Button type="button" onClick={() => addItem("gatilhos_urgencia", novoGatilho, setNovoGatilho)} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.gatilhos_urgencia.map((item, i) => (
            <div key={i} className="flex items-center gap-1 px-3 py-1 bg-orange-500/10 text-orange-700 dark:text-orange-300 rounded-full text-sm">
              {item}
              <button type="button" onClick={() => removeItem("gatilhos_urgencia", i)}>
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Objeções e Respostas */}
      <div className="space-y-3">
        <Label>Como Lidar com Objeções</Label>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            value={novaObjecao.objecao}
            onChange={(e) => setNovaObjecao({ ...novaObjecao, objecao: e.target.value })}
            placeholder="Objeção: Ex: Está muito caro"
          />
          <div className="flex gap-2">
            <Input
              value={novaObjecao.resposta}
              onChange={(e) => setNovaObjecao({ ...novaObjecao, resposta: e.target.value })}
              placeholder="Resposta: Ex: Entendo, vamos ver as opções..."
            />
            <Button type="button" onClick={addObjecao} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {form.objecoes.map((item, i) => (
            <div key={i} className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">❌ {item.objecao}</p>
                  <p className="text-sm text-muted-foreground mt-1">✅ {item.resposta}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeObjecao(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quando Transferir */}
      <div className="space-y-2">
        <Label htmlFor="quando_transferir">Quando Transferir para Humano</Label>
        <Textarea
          id="quando_transferir"
          value={form.quando_transferir}
          onChange={(e) => setForm({ ...form, quando_transferir: e.target.value })}
          placeholder="Ex: Quando o cliente pedir para falar com alguém, reclamações, valores acima de X..."
          rows={3}
        />
      </div>

      {/* Script de Follow-up */}
      <div className="space-y-2">
        <Label htmlFor="script_followup">Script de Follow-up</Label>
        <Textarea
          id="script_followup"
          value={form.script_followup}
          onChange={(e) => setForm({ ...form, script_followup: e.target.value })}
          placeholder="Modelo de mensagem para follow-up após alguns dias sem resposta..."
          rows={3}
        />
      </div>

      {/* Promoções Ativas */}
      <div className="space-y-3">
        <Label>Promoções Ativas</Label>
        <div className="flex gap-2">
          <Input
            value={novaPromocao}
            onChange={(e) => setNovaPromocao(e.target.value)}
            placeholder="Ex: 10% de desconto até sexta-feira"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addItem("promocoes", novaPromocao, setNovaPromocao))}
          />
          <Button type="button" onClick={() => addItem("promocoes", novaPromocao, setNovaPromocao)} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.promocoes.map((item, i) => (
            <div key={i} className="flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-700 dark:text-green-300 rounded-full text-sm">
              🏷️ {item}
              <button type="button" onClick={() => removeItem("promocoes", i)}>
                <Trash2 className="h-3 w-3" />
              </button>
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
