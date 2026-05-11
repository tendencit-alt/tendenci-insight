import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Plus, Trash2, Package, Calendar, DollarSign, Hash, AlertTriangle, Search, FileText, HelpCircle, MessageSquare, Zap, Target, User, Check } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

const perguntasPermitidasOptions = [
  { id: "o_que_precisa", label: "O que precisa", description: "Qual a necessidade do cliente", icon: Package },
  { id: "para_quando", label: "Para quando", description: "Prazo ou urgência", icon: Calendar },
  { id: "orcamento", label: "Orçamento", description: "Quanto pode investir", icon: DollarSign },
  { id: "quantidade", label: "Quantidade", description: "Volume ou tamanho do pedido", icon: Hash },
  { id: "urgencia", label: "Urgência", description: "Nível de prioridade", icon: AlertTriangle },
  { id: "como_conheceu", label: "Como conheceu", description: "Como chegou até nós", icon: Search },
  { id: "ja_tem_projeto", label: "Já tem projeto", description: "Se já tem projeto/parceiro profissional", icon: FileText },
];

const podeFazerPerguntasOptions = [
  { 
    id: "sim_poucas", 
    label: "Sim, poucas e objetivas", 
    description: "Pergunta apenas o essencial para ajudar",
    icon: MessageSquare
  },
  { 
    id: "apenas_essencial", 
    label: "Apenas o essencial", 
    description: "Mínimo de perguntas possível",
    icon: Target
  },
  { 
    id: "nao_responder", 
    label: "Não, só responder", 
    description: "Nunca pergunta, apenas responde",
    icon: HelpCircle
  },
];

const perguntasPorVezOptions = [
  { 
    id: "1", 
    label: "Apenas 1 por vez", 
    description: "Mais natural, uma pergunta de cada vez"
  },
  { 
    id: "2", 
    label: "Até 2", 
    description: "Pode combinar 2 perguntas relacionadas"
  },
  { 
    id: "ilimitado", 
    label: "Quantas forem necessárias", 
    description: "Não recomendado, pode parecer interrogatório"
  },
];

const clienteComPressaOptions = [
  { 
    id: "pular_qualificacao", 
    label: "Pular qualificação", 
    description: "Vai direto sem perguntar nada",
    icon: Zap
  },
  { 
    id: "ir_direto_solucao", 
    label: "Ir direto para solução", 
    description: "Oferece opção mais rápida",
    icon: Target
  },
  { 
    id: "encaminhar_humano", 
    label: "Encaminhar para humano", 
    description: "Transfere para atendente",
    icon: User
  },
];

const initialForm = {
  pode_fazer_perguntas: "sim_poucas",
  perguntas_por_vez: "1",
  perguntas_permitidas: ["o_que_precisa", "orcamento"],
  cliente_com_pressa: "ir_direto_solucao",
  perguntas_obrigatorias: [] as string[],
  criterios_lead: {
    quente: "",
    morno: "",
    frio: "",
  },
};

export default function IAConfigQualificacao({ config, onSave, saving }: Props) {
  const [form, setForm, clearPersistedData, hasRestoredData] = useFormPersistence(
    'ia_config_qualificacao',
    initialForm,
    true
  );
  const [novaPergunta, setNovaPergunta] = useState("");
  const isInitializedRef = useRef(false);

  // Garantir que arrays sempre existam (proteção contra dados do localStorage incompletos)
  const perguntasPermitidas = form.perguntas_permitidas || [];
  const perguntasObrigatorias = form.perguntas_obrigatorias || [];
  const criteriosLead = form.criterios_lead || { quente: '', morno: '', frio: '' };

  useEffect(() => {
    // Só inicializa UMA vez, e apenas se não houver dados restaurados
    if (isInitializedRef.current || hasRestoredData) return;
    
    if (config && Object.keys(config).length > 0) {
      const criterios = config.criterios_lead as Record<string, string> || {};
      setForm({
        pode_fazer_perguntas: (config.pode_fazer_perguntas as string) || "sim_poucas",
        perguntas_por_vez: (config.perguntas_por_vez as string) || "1",
        perguntas_permitidas: (config.perguntas_permitidas as string[]) || ["o_que_precisa", "orcamento"],
        cliente_com_pressa: (config.cliente_com_pressa as string) || "ir_direto_solucao",
        perguntas_obrigatorias: (config.perguntas as string[]) || (config.perguntas_obrigatorias as string[]) || [],
        criterios_lead: {
          quente: criterios.quente || "",
          morno: criterios.morno || "",
          frio: criterios.frio || "",
        },
      });
      isInitializedRef.current = true;
    }
  }, [config, hasRestoredData]);

  const addPergunta = () => {
    if (novaPergunta.trim()) {
      setForm((prev) => ({
        ...prev,
        perguntas_obrigatorias: [...(prev.perguntas_obrigatorias || []), novaPergunta.trim()]
      }));
      setNovaPergunta("");
    }
  };

  const removePergunta = (index: number) => {
    setForm((prev) => ({
      ...prev,
      perguntas_obrigatorias: (prev.perguntas_obrigatorias || []).filter((_, i) => i !== index)
    }));
  };

  const togglePerguntaPermitida = (id: string, checked: boolean) => {
    setForm((prev) => {
      const currentPerguntas = prev.perguntas_permitidas || [];
      return {
        ...prev,
        perguntas_permitidas: checked
          ? [...currentPerguntas, id]
          : currentPerguntas.filter(p => p !== id)
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Map perguntas_obrigatorias to perguntas for backward compatibility
    onSave({
      ...form,
      perguntas: form.perguntas_obrigatorias,
    });
    clearPersistedData();
  };

  const SelectCard = ({ 
    option, 
    selected, 
    onClick,
    showIcon = true
  }: { 
    option: { id: string; label: string; description: string; icon?: any }; 
    selected: boolean; 
    onClick: () => void;
    showIcon?: boolean;
  }) => {
    const Icon = option.icon;
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left w-full",
          selected 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          {showIcon && Icon && <Icon className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />}
          <span className={cn("font-medium text-sm", selected ? "text-primary" : "text-foreground")}>
            {option.label}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{option.description}</span>
      </button>
    );
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSaveIndicator hasRestoredData={hasRestoredData} />
        
        {/* O Agente Pode Fazer Perguntas? */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">O Agente Pode Fazer Perguntas?</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Defina a liberdade do agente para fazer perguntas durante a conversa.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            Defina a liberdade do agente para fazer perguntas.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {podeFazerPerguntasOptions.map((option) => (
              <SelectCard
                key={option.id}
                option={option}
                selected={form.pode_fazer_perguntas === option.id}
                onClick={() => setForm((prev) => ({ ...prev, pode_fazer_perguntas: option.id }))}
              />
            ))}
          </div>
        </div>

        {/* Perguntas por Vez */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold"># Perguntas por Vez</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Quantas perguntas seguidas o agente pode fazer em uma mensagem.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            Quantas perguntas seguidas o agente pode fazer?
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {perguntasPorVezOptions.map((option) => (
              <SelectCard
                key={option.id}
                option={option}
                selected={form.perguntas_por_vez === option.id}
                onClick={() => setForm((prev) => ({ ...prev, perguntas_por_vez: option.id }))}
                showIcon={false}
              />
            ))}
          </div>
        </div>

        {/* Perguntas Permitidas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">✨ Perguntas Permitidas</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Marque quais temas o agente pode perguntar ao cliente.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            Marque o que o agente pode perguntar:
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {perguntasPermitidasOptions.map((option) => {
              const Icon = option.icon;
              const isChecked = perguntasPermitidas.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => togglePerguntaPermitida(option.id, !isChecked)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left",
                    isChecked 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "h-4 w-4 shrink-0 rounded-sm border mt-0.5 flex items-center justify-center",
                    isChecked 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-primary"
                  )}>
                    {isChecked && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn("h-4 w-4", isChecked ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("font-medium text-sm", isChecked ? "text-primary" : "text-foreground")}>
                        {option.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cliente com Pressa */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">⚠️ Cliente com Pressa</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Como o agente deve agir quando perceber que o cliente está com pressa.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            Se o cliente estiver com pressa, o agente deve:
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {clienteComPressaOptions.map((option) => (
              <SelectCard
                key={option.id}
                option={option}
                selected={form.cliente_com_pressa === option.id}
                onClick={() => setForm((prev) => ({ ...prev, cliente_com_pressa: option.id }))}
              />
            ))}
          </div>
        </div>

        {/* Perguntas Obrigatórias */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">📋 Perguntas Obrigatórias</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Perguntas específicas que o agente deve fazer durante a conversa (opcional).</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            Perguntas específicas que o agente deve fazer (opcional).
          </p>
          
          <div className="flex gap-2">
            <Input
              value={novaPergunta}
              onChange={(e) => setNovaPergunta(e.target.value)}
              placeholder="Ex: Qual o melhor horário para entrarmos em contato?"
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPergunta())}
            />
            <Button type="button" onClick={addPergunta} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {perguntasObrigatorias.map((pergunta, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground mr-2">{index + 1}.</span>
                <span className="flex-1 text-sm">{pergunta}</span>
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
            {perguntasObrigatorias.length === 0 && (
              <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground text-center">
                  Nenhuma pergunta obrigatória configurada.<br />
                  <span className="text-xs">O agente usará apenas as perguntas permitidas acima.</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Critérios de Leads */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Critérios para Classificação de Leads</Label>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Lead Quente</span>
              </div>
              <EnhancedTextarea
                value={criteriosLead.quente}
                onChange={(value) => setForm((prev) => ({
                  ...prev,
                  criterios_lead: { ...(prev.criterios_lead || { quente: '', morno: '', frio: '' }), quente: value }
                }))}
                placeholder="Ex: Tem orçamento definido, prazo curto, já conhece a empresa..."
                rows={4}
                context="Critérios para classificar lead como quente - alta probabilidade de conversão"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium">Lead Morno</span>
              </div>
              <EnhancedTextarea
                value={criteriosLead.morno}
                onChange={(value) => setForm((prev) => ({
                  ...prev,
                  criterios_lead: { ...(prev.criterios_lead || { quente: '', morno: '', frio: '' }), morno: value }
                }))}
                placeholder="Ex: Interessado mas sem urgência, pesquisando opções..."
                rows={4}
                context="Critérios para classificar lead como morno - interesse moderado"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">Lead Frio</span>
              </div>
              <EnhancedTextarea
                value={criteriosLead.frio}
                onChange={(value) => setForm((prev) => ({
                  ...prev,
                  criterios_lead: { ...(prev.criterios_lead || { quente: '', morno: '', frio: '' }), frio: value }
                }))}
                placeholder="Ex: Apenas curiosidade, sem orçamento definido..."
                rows={4}
                context="Critérios para classificar lead como frio - baixa probabilidade imediata"
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
    </TooltipProvider>
  );
}
