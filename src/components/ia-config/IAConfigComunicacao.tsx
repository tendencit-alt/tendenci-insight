import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, MessageSquare } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

const initialForm = {
  tamanho_mensagem: "media",
  max_mensagens_sequencia: "2-3",
  modo_resposta: "consultivo",
  linguagem_tecnica: "moderado",
  estilo_digitacao: "natural",
  usar_formatacao: "leve",
  usar_emojis: "moderado",
  usar_audios: false,
  tempo_resposta_ms: 2000,
  msg_boas_vindas: "",
  msg_despedida: "",
  msg_ausencia: "",
  exemplos_respostas: "",
};

const tamanhoOptions = [
  { value: "curta", label: "Curta", desc: "1-2 frases diretas, vai ao ponto rapidamente" },
  { value: "media", label: "Média", desc: "3-5 frases, equilibra informação e objetividade" },
  { value: "longa", label: "Longa", desc: "Parágrafos detalhados com explicações completas" },
  { value: "adaptativa", label: "Adaptativa", desc: "Varia conforme contexto - curta para confirmações, longa para explicações" },
];

const sequenciaOptions = [
  { value: "1", label: "Uma por vez", desc: "Mais formal, uma mensagem completa" },
  { value: "2-3", label: "2-3 mensagens", desc: "Divide em partes menores, mais dinâmico" },
  { value: "ilimitado", label: "Sem limite", desc: "Envia quantas forem necessárias" },
];

const modoRespostaOptions = [
  { value: "responder", label: "Responder Direto", desc: "Responde objetivamente às perguntas feitas" },
  { value: "explicar", label: "Explicar", desc: "Contextualiza e fundamenta antes de responder" },
  { value: "guiar", label: "Guiar", desc: "Faz perguntas para entender melhor antes de responder" },
  { value: "consultivo", label: "Consultivo", desc: "Combina explicação com direcionamento estratégico" },
];

const linguagemTecnicaOptions = [
  { value: "evitar", label: "Evitar", desc: "Simplifica tudo, usa analogias do dia-a-dia" },
  { value: "moderado", label: "Moderado", desc: "Usa termos técnicos quando necessário, sempre explica" },
  { value: "necessario", label: "Usar Normalmente", desc: "Usa terminologia correta do setor" },
  { value: "especialista", label: "Especialista", desc: "Fala como profissional com cliente que entende" },
];

const estiloDigitacaoOptions = [
  { value: "perfeito", label: "Perfeito", desc: "Gramática impecável, totalmente formal" },
  { value: "natural", label: "Natural", desc: "Pequenas variações que parecem mais humanas" },
  { value: "casual", label: "Casual", desc: "Mais descontraído, como conversa informal" },
];

const formatacaoOptions = [
  { value: "nao", label: "Não usar", desc: "Texto corrido apenas, sem formatação" },
  { value: "leve", label: "Leve", desc: "Negrito e emojis pontuais para destaque" },
  { value: "moderado", label: "Moderado", desc: "Listas, negrito, organização visual clara" },
  { value: "rico", label: "Rico", desc: "Usa todos recursos de formatação disponíveis" },
];

const emojiOptions = [
  { value: "nao", label: "Não usar", desc: "Comunicação totalmente sem emojis" },
  { value: "minimo", label: "Mínimo", desc: "Apenas 1-2 emojis por conversa" },
  { value: "moderado", label: "Moderado", desc: "Emojis pontuais para dar leveza" },
  { value: "frequente", label: "Frequente", desc: "Usa emojis com frequência" },
];

function SelectWithDescription({ 
  label, 
  value, 
  onChange, 
  options 
}: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  options: { value: string; label: string; desc: string }[];
}) {
  const selected = options.find(o => o.value === value);
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{opt.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && (
        <p className="text-xs text-muted-foreground">{selected.desc}</p>
      )}
    </div>
  );
}

export default function IAConfigComunicacao({ config, onSave, saving }: Props) {
  const [form, setForm, clearPersistedData, hasRestoredData] = useFormPersistence(
    'ia_config_comunicacao',
    initialForm,
    true
  );

  useEffect(() => {
    if (config && !hasRestoredData) {
      setForm({
        tamanho_mensagem: (config.tamanho_mensagem as string) || "media",
        max_mensagens_sequencia: (config.max_mensagens_sequencia as string) || "2-3",
        modo_resposta: (config.modo_resposta as string) || "consultivo",
        linguagem_tecnica: (config.linguagem_tecnica as string) || "moderado",
        estilo_digitacao: (config.estilo_digitacao as string) || "natural",
        usar_formatacao: (config.usar_formatacao as string) || "leve",
        usar_emojis: (config.usar_emojis as string) || "moderado",
        usar_audios: (config.usar_audios as boolean) || false,
        tempo_resposta_ms: (config.tempo_resposta_ms as number) || 2000,
        msg_boas_vindas: (config.msg_boas_vindas as string) || "",
        msg_despedida: (config.msg_despedida as string) || "",
        msg_ausencia: (config.msg_ausencia as string) || "",
        exemplos_respostas: (config.exemplos_respostas as string) || "",
      });
    }
  }, [config, hasRestoredData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    clearPersistedData();
  };

  const getPreviewText = () => {
    const tamanho = tamanhoOptions.find(o => o.value === form.tamanho_mensagem)?.label || "Média";
    const modo = modoRespostaOptions.find(o => o.value === form.modo_resposta)?.label || "Consultivo";
    const linguagem = linguagemTecnicaOptions.find(o => o.value === form.linguagem_tecnica)?.label || "Moderado";
    const estilo = estiloDigitacaoOptions.find(o => o.value === form.estilo_digitacao)?.label || "Natural";

    let exemplo = "";
    
    if (form.modo_resposta === "responder") {
      exemplo = "Temos sim! O prazo de entrega é de 45 dias úteis após aprovação do projeto.";
    } else if (form.modo_resposta === "explicar") {
      exemplo = "Ótima pergunta! O prazo de entrega varia conforme a complexidade do projeto. Em média, trabalhamos com 45 dias úteis após a aprovação, mas projetos maiores podem levar até 60 dias. Isso garante a qualidade que você merece.";
    } else if (form.modo_resposta === "guiar") {
      exemplo = "Claro! Para te dar uma estimativa precisa, me conta: você já tem o projeto definido ou ainda está na fase de planejamento?";
    } else {
      exemplo = "Entendo sua preocupação com prazos! Normalmente trabalhamos com 45 dias úteis, mas isso pode variar. Me conta um pouco mais sobre seu projeto - qual ambiente você está planejando? Assim consigo te dar uma estimativa mais precisa.";
    }

    if (form.usar_emojis === "moderado" || form.usar_emojis === "frequente") {
      exemplo = exemplo.replace("!", "! 😊");
    }

    return { exemplo, tamanho, modo, linguagem, estilo };
  };

  const preview = getPreviewText();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSaveIndicator hasRestoredData={hasRestoredData} />
      
      {/* Grid de configurações principais */}
      <div className="grid gap-6 md:grid-cols-2">
        <SelectWithDescription
          label="Tamanho das Mensagens"
          value={form.tamanho_mensagem}
          onChange={(v) => setForm({ ...form, tamanho_mensagem: v })}
          options={tamanhoOptions}
        />

        <SelectWithDescription
          label="Mensagens em Sequência"
          value={form.max_mensagens_sequencia}
          onChange={(v) => setForm({ ...form, max_mensagens_sequencia: v })}
          options={sequenciaOptions}
        />

        <SelectWithDescription
          label="Modo de Resposta"
          value={form.modo_resposta}
          onChange={(v) => setForm({ ...form, modo_resposta: v })}
          options={modoRespostaOptions}
        />

        <SelectWithDescription
          label="Linguagem Técnica"
          value={form.linguagem_tecnica}
          onChange={(v) => setForm({ ...form, linguagem_tecnica: v })}
          options={linguagemTecnicaOptions}
        />

        <SelectWithDescription
          label="Estilo de Digitação"
          value={form.estilo_digitacao}
          onChange={(v) => setForm({ ...form, estilo_digitacao: v })}
          options={estiloDigitacaoOptions}
        />

        <SelectWithDescription
          label="Uso de Formatação"
          value={form.usar_formatacao}
          onChange={(v) => setForm({ ...form, usar_formatacao: v })}
          options={formatacaoOptions}
        />

        <SelectWithDescription
          label="Uso de Emojis"
          value={form.usar_emojis}
          onChange={(v) => setForm({ ...form, usar_emojis: v })}
          options={emojiOptions}
        />

        <div className="space-y-2">
          <Label>Enviar Áudios</Label>
          <div className="flex items-center gap-2 pt-2">
            <Switch
              checked={form.usar_audios}
              onCheckedChange={(v) => setForm({ ...form, usar_audios: v })}
            />
            <span className="text-sm text-muted-foreground">
              {form.usar_audios ? "IA pode enviar áudios curtos" : "Apenas mensagens de texto"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Áudios podem humanizar a conversa em momentos estratégicos
          </p>
        </div>
      </div>

      {/* Tempo de resposta */}
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
          <p className="text-sm text-muted-foreground">
            {form.tempo_resposta_ms / 1000}s de delay (para parecer mais humano e não instantâneo)
          </p>
        </div>
      </div>

      {/* Mensagens padrão */}
      <div className="space-y-4">
        <EnhancedTextarea
          label="Mensagem de Boas-Vindas"
          value={form.msg_boas_vindas}
          onChange={(value) => setForm({ ...form, msg_boas_vindas: value })}
          placeholder="Olá! Que bom receber seu contato. Sou especialista em móveis planejados e estou aqui para te ajudar a transformar seu ambiente. Como posso te ajudar hoje?"
          rows={3}
          context="Mensagem de boas-vindas de agente senior de vendas - deve demonstrar profissionalismo, experiência e disponibilidade genuína para ajudar"
        />

        <EnhancedTextarea
          label="Mensagem de Despedida"
          value={form.msg_despedida}
          onChange={(value) => setForm({ ...form, msg_despedida: value })}
          placeholder="Foi um prazer conversar com você! Fico à disposição para qualquer dúvida. Pode me chamar quando precisar. Até breve!"
          rows={3}
          context="Mensagem de despedida de agente senior - deve deixar porta aberta para futuro contato e reforçar o relacionamento construído"
        />

        <EnhancedTextarea
          label="Mensagem de Ausência (fora do horário)"
          value={form.msg_ausencia}
          onChange={(value) => setForm({ ...form, msg_ausencia: value })}
          placeholder="Olá! Obrigado pelo seu contato. No momento estamos fora do horário de atendimento, mas não se preocupe - amanhã logo cedo retornaremos sua mensagem. Se preferir, deixe sua dúvida que já respondo assim que voltar!"
          rows={3}
          context="Mensagem de ausência de agente senior - deve ser acolhedora, explicar a situação e indicar próximos passos claros"
        />

        <EnhancedTextarea
          label="Exemplos de Respostas Ideais"
          value={form.exemplos_respostas}
          onChange={(value) => setForm({ ...form, exemplos_respostas: value })}
          placeholder="Cole aqui exemplos de respostas que você considera ideais para seu negócio. O agente usará como referência de estilo e tom..."
          rows={5}
          context="Exemplos de respostas ideais para treinamento do agente - mantenha o estilo e melhore a clareza"
        />
      </div>

      {/* Preview */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Preview: Como o agente responderia</span>
          </div>
          <div className="bg-background rounded-lg p-4 border">
            <p className="text-sm italic">"{preview.exemplo}"</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs bg-background px-2 py-1 rounded border">{preview.tamanho}</span>
            <span className="text-xs bg-background px-2 py-1 rounded border">{preview.modo}</span>
            <span className="text-xs bg-background px-2 py-1 rounded border">Linguagem {preview.linguagem}</span>
            <span className="text-xs bg-background px-2 py-1 rounded border">Estilo {preview.estilo}</span>
          </div>
        </CardContent>
      </Card>

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
