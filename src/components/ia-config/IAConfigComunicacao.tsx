import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

const initialForm = {
  tamanho_max_msg: 500,
  usar_emojis: "moderado",
  usar_audios: false,
  tempo_resposta_ms: 2000,
  msg_boas_vindas: "",
  msg_despedida: "",
  msg_ausencia: "",
};

export default function IAConfigComunicacao({ config, onSave, saving }: Props) {
  const [form, setForm, clearPersistedData, hasRestoredData] = useFormPersistence(
    'ia_config_comunicacao',
    initialForm,
    true
  );

  useEffect(() => {
    if (config && !hasRestoredData) {
      setForm({
        tamanho_max_msg: (config.tamanho_max_msg as number) || 500,
        usar_emojis: (config.usar_emojis as string) || "moderado",
        usar_audios: (config.usar_audios as boolean) || false,
        tempo_resposta_ms: (config.tempo_resposta_ms as number) || 2000,
        msg_boas_vindas: (config.msg_boas_vindas as string) || "",
        msg_despedida: (config.msg_despedida as string) || "",
        msg_ausencia: (config.msg_ausencia as string) || "",
      });
    }
  }, [config, hasRestoredData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    clearPersistedData();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSaveIndicator hasRestoredData={hasRestoredData} />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tamanho Máximo de Mensagens</Label>
          <div className="space-y-4">
            <Slider
              value={[form.tamanho_max_msg]}
              onValueChange={([v]) => setForm({ ...form, tamanho_max_msg: v })}
              min={100}
              max={2000}
              step={50}
            />
            <p className="text-sm text-muted-foreground">{form.tamanho_max_msg} caracteres</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tempo de Resposta Simulado</Label>
          <div className="space-y-4">
            <Slider
              value={[form.tempo_resposta_ms]}
              onValueChange={([v]) => setForm({ ...form, tempo_resposta_ms: v })}
              min={500}
              max={5000}
              step={500}
            />
            <p className="text-sm text-muted-foreground">{form.tempo_resposta_ms / 1000}s (para parecer mais humano)</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Usar Emojis</Label>
          <Select value={form.usar_emojis} onValueChange={(v) => setForm({ ...form, usar_emojis: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nao">Não usar</SelectItem>
              <SelectItem value="moderado">Moderado (poucos emojis)</SelectItem>
              <SelectItem value="sim">Sim (bastante emojis)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Enviar Áudios</Label>
          <div className="flex items-center gap-2 pt-2">
            <Switch
              checked={form.usar_audios}
              onCheckedChange={(v) => setForm({ ...form, usar_audios: v })}
            />
            <span className="text-sm text-muted-foreground">
              {form.usar_audios ? "IA pode enviar áudios" : "Apenas mensagens de texto"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="msg_boas_vindas">Mensagem de Boas-Vindas</Label>
          <Textarea
            id="msg_boas_vindas"
            value={form.msg_boas_vindas}
            onChange={(e) => setForm({ ...form, msg_boas_vindas: e.target.value })}
            placeholder="Olá! 👋 Seja bem-vindo à Tendenci. Como posso ajudar você hoje?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="msg_despedida">Mensagem de Despedida</Label>
          <Textarea
            id="msg_despedida"
            value={form.msg_despedida}
            onChange={(e) => setForm({ ...form, msg_despedida: e.target.value })}
            placeholder="Foi um prazer atender você! Qualquer dúvida, é só chamar. 😊"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="msg_ausencia">Mensagem de Ausência (fora do horário)</Label>
          <Textarea
            id="msg_ausencia"
            value={form.msg_ausencia}
            onChange={(e) => setForm({ ...form, msg_ausencia: e.target.value })}
            placeholder="Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve!"
            rows={3}
          />
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
