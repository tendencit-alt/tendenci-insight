import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

const avatarOptions = ["🤖", "👩‍💼", "👨‍💼", "🧑‍💻", "💁‍♀️", "💁‍♂️", "🤵", "👩‍🔧", "👨‍🔧", "🎯"];

const initialForm = {
  nome_ia: "Assistente Tendenci",
  genero: "neutro",
  personalidade: "profissional",
  tom_voz: "consultivo",
  avatar: "🤖",
};

export default function IAConfigIdentidade({ config, onSave, saving }: Props) {
  const [form, setForm, clearPersistedData, hasRestoredData] = useFormPersistence(
    'ia_config_identidade',
    initialForm,
    true
  );

  useEffect(() => {
    if (config && !hasRestoredData) {
      setForm({
        nome_ia: (config.nome_ia as string) || "Assistente Tendenci",
        genero: (config.genero as string) || "neutro",
        personalidade: (config.personalidade as string) || "profissional",
        tom_voz: (config.tom_voz as string) || "consultivo",
        avatar: (config.avatar as string) || "🤖",
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome_ia">Nome da IA</Label>
          <Input
            id="nome_ia"
            value={form.nome_ia}
            onChange={(e) => setForm({ ...form, nome_ia: e.target.value })}
            placeholder="Ex: Matheus, Assistente Virtual"
          />
        </div>

        <div className="space-y-2">
          <Label>Avatar / Emoji</Label>
          <div className="flex gap-2 flex-wrap">
            {avatarOptions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setForm({ ...form, avatar: emoji })}
                className={`text-2xl p-2 rounded-lg border-2 transition-all ${
                  form.avatar === emoji 
                    ? "border-primary bg-primary/10" 
                    : "border-transparent hover:border-muted-foreground/30"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Gênero</Label>
          <Select value={form.genero} onValueChange={(v) => setForm({ ...form, genero: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="neutro">Neutro</SelectItem>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Personalidade</Label>
          <Select value={form.personalidade} onValueChange={(v) => setForm({ ...form, personalidade: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profissional">Profissional</SelectItem>
              <SelectItem value="amigavel">Amigável</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
              <SelectItem value="descontraido">Descontraído</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Tom de Voz</Label>
          <Select value={form.tom_voz} onValueChange={(v) => setForm({ ...form, tom_voz: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="consultivo">Consultivo (foca em entender e orientar)</SelectItem>
              <SelectItem value="vendedor">Vendedor (foca em fechar negócio)</SelectItem>
              <SelectItem value="suporte">Suporte (foca em resolver problemas)</SelectItem>
              <SelectItem value="informativo">Informativo (foca em educar)</SelectItem>
              <SelectItem value="persuasivo">Persuasivo (foca em convencer)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground mb-2">Preview:</p>
        <p className="font-medium">
          {form.avatar} Olá! Eu sou {form.genero === "feminino" ? "a" : form.genero === "masculino" ? "o" : ""} <strong>{form.nome_ia}</strong>. 
          Como posso ajudar você hoje?
        </p>
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
