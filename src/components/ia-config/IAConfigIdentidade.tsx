import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea";
import { Card } from "@/components/ui/card";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

const initialForm = {
  nome_ia: "Assistente",
  genero: "neutro",
  nivel_experiencia: "senior",
  personalidade_principal: "consultivo",
  personalidade_secundaria: "analitico",
  estilo_comunicacao: "explicativo",
  nivel_formalidade: "profissional_amigavel",
  velocidade_resposta: "equilibrado",
  nivel_empatia: "alto",
  abordagem_vendas: "consultivo",
  tom_emocional: "confiante",
  descricao_personalidade: "",
};

const nivelExperienciaOptions = [
  { value: "junior", label: "Junior", desc: "Segue scripts, respostas padronizadas, escala dúvidas complexas" },
  { value: "pleno", label: "Pleno", desc: "Adapta respostas ao contexto, resolve objeções simples" },
  { value: "senior", label: "Senior", desc: "Consultivo, antecipa necessidades, fecha negócios complexos" },
  { value: "especialista", label: "Especialista", desc: "Autoridade no assunto, educa o cliente, cria urgência natural" },
];

const personalidadePrincipalOptions = [
  { value: "analitico", label: "Analítico", desc: "Foca em dados, especificações técnicas e comparações objetivas" },
  { value: "relacional", label: "Relacional", desc: "Prioriza conexão pessoal, confiança e entender a pessoa" },
  { value: "pragmatico", label: "Pragmático", desc: "Foca em soluções rápidas, objetividade e resultados concretos" },
  { value: "consultivo", label: "Consultivo", desc: "Orienta, aconselha e guia o cliente na melhor decisão" },
  { value: "mentor", label: "Mentor", desc: "Educa enquanto vende, compartilha conhecimento profundo" },
];

const personalidadeSecundariaOptions = [
  { value: "analitico", label: "Analítico", desc: "Complementa com dados quando necessário" },
  { value: "relacional", label: "Relacional", desc: "Adiciona toque humano e conexão" },
  { value: "pragmatico", label: "Pragmático", desc: "Mantém foco em resultados" },
  { value: "criativo", label: "Criativo", desc: "Sugere possibilidades e personalizações" },
  { value: "paciente", label: "Paciente", desc: "Dedica tempo extra para explicações" },
];

const estiloComunicacaoOptions = [
  { value: "direto", label: "Direto ao Ponto", desc: "Respostas curtas e objetivas, sem rodeios" },
  { value: "explicativo", label: "Explicativo", desc: "Contextualiza, dá exemplos e justifica" },
  { value: "storytelling", label: "Storytelling", desc: "Usa cases reais e histórias de clientes" },
  { value: "didatico", label: "Didático", desc: "Ensina e educa enquanto conversa" },
  { value: "conversacional", label: "Conversacional", desc: "Flui como um papo natural e leve" },
];

const nivelFormalidadeOptions = [
  { value: "muito_formal", label: "Muito Formal", desc: "Tratamento cerimonioso, linguagem rebuscada" },
  { value: "formal", label: "Formal", desc: "Profissional e respeitoso, sem intimidade" },
  { value: "profissional_amigavel", label: "Profissional-Amigável", desc: "Respeito com simpatia, equilíbrio ideal" },
  { value: "informal", label: "Informal", desc: "Descontraído mas profissional" },
  { value: "casual", label: "Casual", desc: "Bem à vontade, como um amigo" },
];

const velocidadeRespostaOptions = [
  { value: "rapido", label: "Rápido e Objetivo", desc: "Vai direto ao ponto, respostas curtas" },
  { value: "equilibrado", label: "Equilibrado", desc: "Completo mas sem excessos" },
  { value: "detalhado", label: "Detalhado e Completo", desc: "Explica tudo, não deixa dúvidas" },
];

const nivelEmpatiaOptions = [
  { value: "baixo", label: "Focado em Resultados", desc: "Prioriza eficiência sobre emoção" },
  { value: "medio", label: "Equilibrado", desc: "Reconhece emoções mas mantém foco" },
  { value: "alto", label: "Altamente Empático", desc: "Prioriza entender sentimentos e contexto" },
];

const abordagemVendasOptions = [
  { value: "passivo", label: "Passivo", desc: "Responde quando perguntado, não oferece ativamente" },
  { value: "consultivo", label: "Consultivo", desc: "Entende necessidade profundamente antes de oferecer" },
  { value: "ativo", label: "Ativo", desc: "Sugere produtos e soluções proativamente" },
  { value: "persuasivo", label: "Persuasivo", desc: "Usa gatilhos, cria urgência, foca em fechamento" },
];

const tomEmocionalOptions = [
  { value: "serio", label: "Sério", desc: "Postura executiva, sem brincadeiras" },
  { value: "neutro", label: "Neutro", desc: "Profissional sem emoção marcante" },
  { value: "confiante", label: "Confiante", desc: "Seguro, transmite autoridade" },
  { value: "acolhedor", label: "Acolhedor", desc: "Caloroso, faz o cliente se sentir bem-vindo" },
  { value: "entusiasmado", label: "Entusiasmado", desc: "Animado, transmite energia positiva" },
];

export default function IAConfigIdentidade({ config, onSave, saving }: Props) {
  const [form, setForm, clearPersistedData, hasRestoredData] = useFormPersistence(
    'ia_config_identidade',
    initialForm,
    true
  );

  useEffect(() => {
    if (config && !hasRestoredData) {
      setForm({
        nome_ia: (config.nome_ia as string) || "Assistente",
        genero: (config.genero as string) || "neutro",
        nivel_experiencia: (config.nivel_experiencia as string) || "senior",
        personalidade_principal: (config.personalidade_principal as string) || "consultivo",
        personalidade_secundaria: (config.personalidade_secundaria as string) || "analitico",
        estilo_comunicacao: (config.estilo_comunicacao as string) || "explicativo",
        nivel_formalidade: (config.nivel_formalidade as string) || "profissional_amigavel",
        velocidade_resposta: (config.velocidade_resposta as string) || "equilibrado",
        nivel_empatia: (config.nivel_empatia as string) || "alto",
        abordagem_vendas: (config.abordagem_vendas as string) || "consultivo",
        tom_emocional: (config.tom_emocional as string) || "confiante",
        descricao_personalidade: (config.descricao_personalidade as string) || "",
      });
    }
  }, [config, hasRestoredData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    clearPersistedData();
  };

  const getSelectedLabel = (options: { value: string; label: string }[], value: string) => {
    return options.find(o => o.value === value)?.label || value;
  };

  const generatePreview = () => {
    const generoArtigo = form.genero === "feminino" ? "a" : form.genero === "masculino" ? "o" : "";
    const nivelLabel = getSelectedLabel(nivelExperienciaOptions, form.nivel_experiencia);
    const persLabel = getSelectedLabel(personalidadePrincipalOptions, form.personalidade_principal);
    const tomLabel = getSelectedLabel(tomEmocionalOptions, form.tom_emocional);
    
    return {
      mensagem: `Olá! Sou ${generoArtigo} ${form.nome_ia}, especialista em atendimento. Estou aqui para entender suas necessidades e encontrar a melhor solução para você. Como posso ajudar?`,
      perfil: `${nivelLabel} | ${persLabel} | ${tomLabel}`
    };
  };

  const preview = generatePreview();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSaveIndicator hasRestoredData={hasRestoredData} />
      
      {/* Identificação Básica */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome_ia">Nome do Agente</Label>
          <Input
            id="nome_ia"
            value={form.nome_ia}
            onChange={(e) => setForm({ ...form, nome_ia: e.target.value })}
            placeholder="Ex: Marina, Carlos, Assistente"
          />
        </div>

        <div className="space-y-2">
          <Label>Gênero</Label>
          <Select value={form.genero} onValueChange={(v) => setForm({ ...form, genero: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="neutro">Neutro - Linguagem sem marcação de gênero</SelectItem>
              <SelectItem value="masculino">Masculino - Usa artigos e pronomes masculinos</SelectItem>
              <SelectItem value="feminino">Feminino - Usa artigos e pronomes femininos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Nível e Personalidade */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nível de Experiência</Label>
          <Select value={form.nivel_experiencia} onValueChange={(v) => setForm({ ...form, nivel_experiencia: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nivelExperienciaOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Personalidade Principal</Label>
          <Select value={form.personalidade_principal} onValueChange={(v) => setForm({ ...form, personalidade_principal: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {personalidadePrincipalOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Personalidade Secundária</Label>
          <Select value={form.personalidade_secundaria} onValueChange={(v) => setForm({ ...form, personalidade_secundaria: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {personalidadeSecundariaOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Estilo de Comunicação</Label>
          <Select value={form.estilo_comunicacao} onValueChange={(v) => setForm({ ...form, estilo_comunicacao: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {estiloComunicacaoOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Formalidade e Velocidade */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nível de Formalidade</Label>
          <Select value={form.nivel_formalidade} onValueChange={(v) => setForm({ ...form, nivel_formalidade: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nivelFormalidadeOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Velocidade de Resposta</Label>
          <Select value={form.velocidade_resposta} onValueChange={(v) => setForm({ ...form, velocidade_resposta: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {velocidadeRespostaOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Empatia e Vendas */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nível de Empatia</Label>
          <Select value={form.nivel_empatia} onValueChange={(v) => setForm({ ...form, nivel_empatia: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nivelEmpatiaOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Abordagem de Vendas</Label>
          <Select value={form.abordagem_vendas} onValueChange={(v) => setForm({ ...form, abordagem_vendas: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {abordagemVendasOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tom Emocional */}
      <div className="space-y-2">
        <Label>Tom Emocional</Label>
        <Select value={form.tom_emocional} onValueChange={(v) => setForm({ ...form, tom_emocional: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tomEmocionalOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Descrição Adicional */}
      <EnhancedTextarea
        label="Descrição Adicional da Personalidade"
        value={form.descricao_personalidade}
        onChange={(value) => setForm({ ...form, descricao_personalidade: value })}
        placeholder="Detalhes específicos sobre como o agente deve se comportar, maneirismos, expressões que usa, como lida com situações difíceis..."
        rows={4}
        context="Instruções detalhadas de personalidade para agente de atendimento senior"
      />

      {/* Preview */}
      <Card className="p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground mb-2 font-medium">Preview da Personalidade:</p>
        <p className="text-sm italic mb-3">"{preview.mensagem}"</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Perfil:</span> {preview.perfil}
        </p>
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
