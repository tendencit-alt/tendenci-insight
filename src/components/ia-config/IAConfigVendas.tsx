import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, Save, Plus, Trash2, MessageSquare, ClipboardList, 
  ShoppingCart, Calendar, Headphones, ArrowRight, Target, CheckCircle,
  DollarSign, Gift, FileText, Ban, List, Table, Package, HelpCircle, X,
  Coins, User, Percent, CheckSquare, XCircle, Link, Flame, Thermometer, Snowflake,
  Lightbulb
} from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

const initialForm = {
  // Objetivos principais
  objetivos_principais: [] as string[],
  
  // Seleções únicas
  conducao_conversa: "moderado",
  apresentacao_precos: "valor_direto",
  tabela_precos: "apenas_resumo",
  sugestao_pacotes: "sim",
  cliente_orcamento_baixo: "explicar_valor",
  oferecer_desconto: "se_configurado",
  pedido_fora_regra: "chamar_humano",
  
  // CTAs
  ctas_disponiveis: [] as string[],
  
  // Perguntas obrigatórias para vendas
  perguntas_vendas: [] as string[],
  
  // Textos
  promocoes: "",
  objecoes_texto: "",
  tecnicas: "",
  
  // Estratégias por temperatura
  estrategia_lead_quente: "",
  estrategia_lead_morno: "",
  estrategia_lead_frio: "",
  
  // Objeções estruturadas
  objecoes: [] as { objecao: string; resposta: string }[],
  
  // Links de direcionamento
  links_direcionamento: [] as { nome: string; url: string }[],
  
  // Campos antigos para backward compatibility
  gatilhos_urgencia: [] as string[],
  quando_transferir: "",
  script_followup: "",
};

// Options configurations
const objetivosOptions = [
  { id: "informar", label: "Informar", icon: MessageSquare, desc: "Esclarecer dúvidas e informar" },
  { id: "qualificar", label: "Qualificar", icon: ClipboardList, desc: "Coletar informações e qualificar" },
  { id: "vender", label: "Vender", icon: ShoppingCart, desc: "Fechar vendas diretamente" },
  { id: "agendar", label: "Agendar", icon: Calendar, desc: "Marcar reuniões ou consultas" },
  { id: "suporte", label: "Suporte", icon: Headphones, desc: "Resolver dúvidas e problemas" },
];

const conducaoOptions = [
  { id: "sutil", label: "Sutil", icon: ArrowRight, desc: "Avança de forma suave e natural" },
  { id: "moderado", label: "Moderado", icon: Target, desc: "Equilíbrio entre informar e conduzir" },
  { id: "sempre_fechar", label: "Sempre Fechar", icon: CheckCircle, desc: "Sempre tenta fechar o negócio" },
];

const apresentacaoPrecosOptions = [
  { id: "valor_direto", label: "Valor Direto", icon: DollarSign, desc: "Informa o preço objetivamente" },
  { id: "valor_beneficios", label: "Valor + Benefícios", icon: Gift, desc: "Preço junto com os benefícios" },
  { id: "explica_antes", label: "Explica Antes", icon: FileText, desc: "Contextualiza antes de informar preço" },
];

const tabelaPrecosOptions = [
  { id: "nunca_enviar", label: "Nunca Enviar", icon: Ban, desc: "Não envia tabela de preços" },
  { id: "apenas_resumo", label: "Apenas Resumo", icon: List, desc: "Envia resumo simplificado" },
  { id: "tabela_completa", label: "Tabela Completa", icon: Table, desc: "Pode enviar tabela completa" },
];

const sugestaoPacotesOptions = [
  { id: "sim", label: "Sim", icon: Package, desc: "Sugere planos e pacotes" },
  { id: "se_pedir", label: "Se Pedir", icon: HelpCircle, desc: "Apenas se cliente perguntar" },
  { id: "nao", label: "Não", icon: X, desc: "Não sugere pacotes" },
];

const clienteOrcamentoBaixoOptions = [
  { id: "explicar_valor", label: "Explicar Valor", icon: Gift, desc: "Justifica o preço com benefícios" },
  { id: "alternativa_barata", label: "Alternativa", icon: Coins, desc: "Sugere opção mais acessível" },
  { id: "chamar_humano", label: "Chamar Humano", icon: User, desc: "Encaminha para atendente" },
];

const oferecerDescontoOptions = [
  { id: "nunca", label: "Nunca", icon: X, desc: "Não oferece descontos" },
  { id: "se_configurado", label: "Se Configurado", icon: Percent, desc: "Só ofertas pré-definidas" },
  { id: "com_aprovacao", label: "Com Aprovação", icon: CheckSquare, desc: "Apenas com aprovação" },
];

const pedidoForaRegraOptions = [
  { id: "negar_educadamente", label: "Negar", icon: XCircle, desc: "Recusa de forma gentil" },
  { id: "explicar_politica", label: "Explicar", icon: FileText, desc: "Explica a política de preços" },
  { id: "chamar_humano", label: "Chamar Humano", icon: User, desc: "Encaminha para análise" },
];

const ctasOptions = [
  { id: "posso_explicar", label: "Posso explicar melhor?", desc: "Oferece mais detalhes" },
  { id: "vejo_disponibilidade", label: "Vejo disponibilidade?", desc: "Verifica estoque ou agenda" },
  { id: "vamos_avancar", label: "Vamos avançar?", desc: "Convida para próximo passo" },
  { id: "gerar_orcamento", label: "Gerar orçamento?", desc: "Oferece proposta formal" },
];

const perguntasSugeridas = ["nome", "telefone", "e-mail", "cidade", "orçamento", "prazo"];
const objecoesComuns = ["Está caro", "Preciso pensar", "Vou pesquisar outros"];

// Reusable components
interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  description: string;
}

function SelectCard({ selected, onClick, icon: Icon, label, description }: SelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center p-3 rounded-lg border-2 transition-all text-left w-full min-h-[80px]",
        selected 
          ? "border-primary bg-primary/10 text-primary" 
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <Icon className={cn("h-5 w-5 mb-1", selected ? "text-primary" : "text-muted-foreground")} />
      <span className={cn("font-medium text-sm", selected && "text-primary")}>{label}</span>
      <span className="text-xs text-muted-foreground text-center mt-0.5 line-clamp-2">{description}</span>
    </button>
  );
}

interface CheckboxCardProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ElementType;
  label: string;
  description?: string;
}

function CheckboxCard({ checked, onChange, icon: Icon, label, description }: CheckboxCardProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left w-full",
        checked 
          ? "border-primary bg-primary/10" 
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
        checked ? "border-primary bg-primary" : "border-muted-foreground"
      )}>
        {checked && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
      </div>
      {Icon && <Icon className={cn("h-5 w-5 flex-shrink-0", checked ? "text-primary" : "text-muted-foreground")} />}
      <div className="flex-1 min-w-0">
        <span className={cn("font-medium text-sm", checked && "text-primary")}>{label}</span>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </button>
  );
}

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  tooltip?: string;
}

function SectionHeader({ icon: Icon, title, tooltip }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      <Label className="text-base font-semibold">{title}</Label>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export default function IAConfigVendas({ config, onSave, saving }: Props) {
  const [form, setForm, clearPersistedData, hasRestoredData] = useFormPersistence(
    'ia_config_vendas_v2',
    initialForm,
    true
  );

  const [novaPergunta, setNovaPergunta] = useState("");
  const [novaObjecao, setNovaObjecao] = useState({ objecao: "", resposta: "" });
  const [novoLink, setNovoLink] = useState({ nome: "", url: "" });

  useEffect(() => {
    if (config && !hasRestoredData) {
      setForm({
        objetivos_principais: (config.objetivos_principais as string[]) || [],
        conducao_conversa: (config.conducao_conversa as string) || "moderado",
        apresentacao_precos: (config.apresentacao_precos as string) || "valor_direto",
        tabela_precos: (config.tabela_precos as string) || "apenas_resumo",
        sugestao_pacotes: (config.sugestao_pacotes as string) || "sim",
        cliente_orcamento_baixo: (config.cliente_orcamento_baixo as string) || "explicar_valor",
        oferecer_desconto: (config.oferecer_desconto as string) || "se_configurado",
        pedido_fora_regra: (config.pedido_fora_regra as string) || "chamar_humano",
        ctas_disponiveis: (config.ctas_disponiveis as string[]) || [],
        perguntas_vendas: (config.perguntas_vendas as string[]) || [],
        promocoes: (config.promocoes as string) || "",
        objecoes_texto: (config.objecoes_texto as string) || "",
        tecnicas: (config.tecnicas as string) || "",
        estrategia_lead_quente: (config.estrategia_lead_quente as string) || "",
        estrategia_lead_morno: (config.estrategia_lead_morno as string) || "",
        estrategia_lead_frio: (config.estrategia_lead_frio as string) || "",
        objecoes: (config.objecoes as { objecao: string; resposta: string }[]) || [],
        links_direcionamento: (config.links_direcionamento as { nome: string; url: string }[]) || [],
        gatilhos_urgencia: (config.gatilhos_urgencia as string[]) || [],
        quando_transferir: (config.quando_transferir as string) || "",
        script_followup: (config.script_followup as string) || "",
      });
    }
  }, [config, hasRestoredData]);

  const toggleObjetivo = (id: string) => {
    const newObjetivos = form.objetivos_principais.includes(id)
      ? form.objetivos_principais.filter(o => o !== id)
      : [...form.objetivos_principais, id];
    setForm({ ...form, objetivos_principais: newObjetivos });
  };

  const toggleCTA = (id: string) => {
    const newCTAs = form.ctas_disponiveis.includes(id)
      ? form.ctas_disponiveis.filter(c => c !== id)
      : [...form.ctas_disponiveis, id];
    setForm({ ...form, ctas_disponiveis: newCTAs });
  };

  const addPergunta = (pergunta: string) => {
    if (pergunta.trim() && !form.perguntas_vendas.includes(pergunta.trim())) {
      setForm({ ...form, perguntas_vendas: [...form.perguntas_vendas, pergunta.trim()] });
      setNovaPergunta("");
    }
  };

  const removePergunta = (index: number) => {
    setForm({ ...form, perguntas_vendas: form.perguntas_vendas.filter((_, i) => i !== index) });
  };

  const addObjecaoRapida = (objecao: string) => {
    if (!form.objecoes.some(o => o.objecao === objecao)) {
      setNovaObjecao({ objecao, resposta: "" });
    }
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

  const addLink = () => {
    if (novoLink.nome.trim() && novoLink.url.trim()) {
      setForm({ ...form, links_direcionamento: [...form.links_direcionamento, novoLink] });
      setNovoLink({ nome: "", url: "" });
    }
  };

  const removeLink = (index: number) => {
    setForm({ ...form, links_direcionamento: form.links_direcionamento.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    clearPersistedData();
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSaveIndicator hasRestoredData={hasRestoredData} />

        {/* Objetivos Principais */}
        <div className="space-y-4">
          <SectionHeader 
            icon={Target} 
            title="Objetivos Principais" 
            tooltip="Quais resultados você espera das conversas? O agente vai balancear esses objetivos durante o atendimento."
          />
          <p className="text-sm text-muted-foreground">Selecione um ou mais objetivos que o agente deve perseguir:</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {objetivosOptions.map((opt) => (
              <CheckboxCard
                key={opt.id}
                checked={form.objetivos_principais.includes(opt.id)}
                onChange={() => toggleObjetivo(opt.id)}
                icon={opt.icon}
                label={opt.label}
                description={opt.desc}
              />
            ))}
          </div>
          {form.objetivos_principais.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              <Lightbulb className="h-4 w-4" />
              <span>O agente vai balancear {form.objetivos_principais.length} objetivo{form.objetivos_principais.length > 1 ? 's' : ''} durante a conversa.</span>
            </div>
          )}
        </div>

        {/* Condução da Conversa */}
        <div className="space-y-4">
          <SectionHeader 
            icon={ArrowRight} 
            title="Condução da Conversa" 
            tooltip="Como o agente deve avançar a conversa em direção ao objetivo?"
          />
          <div className="grid grid-cols-3 gap-3">
            {conducaoOptions.map((opt) => (
              <SelectCard
                key={opt.id}
                selected={form.conducao_conversa === opt.id}
                onClick={() => setForm({ ...form, conducao_conversa: opt.id })}
                icon={opt.icon}
                label={opt.label}
                description={opt.desc}
              />
            ))}
          </div>
        </div>

        {/* Preços e Pacotes */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <SectionHeader 
              icon={DollarSign} 
              title="Apresentação de Preços" 
              tooltip="Como o agente deve apresentar os preços ao cliente?"
            />
            <div className="grid gap-2">
              {apresentacaoPrecosOptions.map((opt) => (
                <SelectCard
                  key={opt.id}
                  selected={form.apresentacao_precos === opt.id}
                  onClick={() => setForm({ ...form, apresentacao_precos: opt.id })}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.desc}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeader 
              icon={Table} 
              title="Tabela de Preços" 
              tooltip="O agente pode enviar tabela de preços?"
            />
            <div className="grid gap-2">
              {tabelaPrecosOptions.map((opt) => (
                <SelectCard
                  key={opt.id}
                  selected={form.tabela_precos === opt.id}
                  onClick={() => setForm({ ...form, tabela_precos: opt.id })}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.desc}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Pacotes e Orçamento */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <SectionHeader 
              icon={Package} 
              title="Sugestão de Pacotes" 
              tooltip="O agente deve sugerir planos e pacotes proativamente?"
            />
            <div className="grid grid-cols-3 gap-2">
              {sugestaoPacotesOptions.map((opt) => (
                <SelectCard
                  key={opt.id}
                  selected={form.sugestao_pacotes === opt.id}
                  onClick={() => setForm({ ...form, sugestao_pacotes: opt.id })}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.desc}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeader 
              icon={Coins} 
              title="Cliente com Orçamento Baixo" 
              tooltip="Como agir quando o cliente demonstra que o preço está fora do orçamento?"
            />
            <div className="grid grid-cols-3 gap-2">
              {clienteOrcamentoBaixoOptions.map((opt) => (
                <SelectCard
                  key={opt.id}
                  selected={form.cliente_orcamento_baixo === opt.id}
                  onClick={() => setForm({ ...form, cliente_orcamento_baixo: opt.id })}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.desc}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Desconto e Exceções */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <SectionHeader 
              icon={Percent} 
              title="Oferecer Desconto" 
              tooltip="O agente pode oferecer descontos?"
            />
            <div className="grid grid-cols-3 gap-2">
              {oferecerDescontoOptions.map((opt) => (
                <SelectCard
                  key={opt.id}
                  selected={form.oferecer_desconto === opt.id}
                  onClick={() => setForm({ ...form, oferecer_desconto: opt.id })}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.desc}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeader 
              icon={XCircle} 
              title="Pedido Fora da Regra" 
              tooltip="Como agir quando o cliente pede algo fora das políticas?"
            />
            <div className="grid grid-cols-3 gap-2">
              {pedidoForaRegraOptions.map((opt) => (
                <SelectCard
                  key={opt.id}
                  selected={form.pedido_fora_regra === opt.id}
                  onClick={() => setForm({ ...form, pedido_fora_regra: opt.id })}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.desc}
                />
              ))}
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-4">
          <SectionHeader 
            icon={MessageSquare} 
            title="Chamadas para Ação (CTAs)" 
            tooltip="Quais CTAs o agente pode usar durante a conversa?"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ctasOptions.map((opt) => (
              <CheckboxCard
                key={opt.id}
                checked={form.ctas_disponiveis.includes(opt.id)}
                onChange={() => toggleCTA(opt.id)}
                label={opt.label}
                description={opt.desc}
              />
            ))}
          </div>
        </div>

        {/* Perguntas Obrigatórias */}
        <div className="space-y-4">
          <SectionHeader 
            icon={ClipboardList} 
            title="Perguntas Obrigatórias para Vendas" 
            tooltip="Informações que o agente DEVE coletar durante a conversa de vendas."
          />
          <div className="flex gap-2">
            <Input
              value={novaPergunta}
              onChange={(e) => setNovaPergunta(e.target.value)}
              placeholder="Ex: Qual seu nome completo?"
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPergunta(novaPergunta))}
            />
            <Button type="button" onClick={() => addPergunta(novaPergunta)} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Sugestões:</span>
            {perguntasSugeridas.map((sug) => (
              <Button
                key={sug}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addPergunta(`Qual seu ${sug}?`)}
                className="text-xs"
              >
                {sug}
              </Button>
            ))}
          </div>
          {form.perguntas_vendas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.perguntas_vendas.map((pergunta, i) => (
                <div key={i} className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-sm">
                  {pergunta}
                  <button type="button" onClick={() => removePergunta(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ofertas Especiais */}
        <EnhancedTextarea
          label="🏷️ Ofertas Especiais"
          value={form.promocoes}
          onChange={(value) => setForm({ ...form, promocoes: value })}
          placeholder="Ex: 10% desconto primeira compra código BEMVINDO10. Frete grátis acima de R$500..."
          rows={3}
          context="Promoções e ofertas especiais ativas que o agente pode mencionar durante vendas - manter como lista de ofertas"
          helperText="Promoções que o agente pode mencionar durante a conversa"
        />

        {/* Lidar com Objeções - Texto */}
        <EnhancedTextarea
          label="💬 Lidar com Objeções"
          value={form.objecoes_texto}
          onChange={(value) => setForm({ ...form, objecoes_texto: value })}
          placeholder="Ex: Se 'está caro' → destacar qualidade e benefícios. Se 'vou pensar' → criar urgência com oferta limitada..."
          rows={4}
          context="Instruções gerais de como o agente deve lidar com objeções comuns de vendas - transformar em diretrizes claras"
          helperText="Como responder a hesitações comuns dos clientes"
        />

        {/* Técnicas de Fechamento */}
        <EnhancedTextarea
          label="🎯 Técnicas de Fechamento"
          value={form.tecnicas}
          onChange={(value) => setForm({ ...form, tecnicas: value })}
          placeholder="Ex: Use a técnica SPIN Selling - faça perguntas de Situação, Problema, Implicação e Necessidade. Crie urgência mostrando benefícios de decidir agora..."
          rows={4}
          context="Técnicas de fechamento de vendas que o agente deve usar - transformar em instruções claras e imperativas"
          helperText="Estratégias para conduzir ao fechamento"
        />

        {/* Estratégias por Temperatura */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            <SectionHeader 
              icon={Thermometer} 
              title="Estratégia por Temperatura do Lead" 
              tooltip="Configure abordagens diferentes para cada tipo de lead com base no interesse demonstrado."
            />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" />
                <Label className="text-base font-medium">Lead Quente</Label>
              </div>
              <EnhancedTextarea
                value={form.estrategia_lead_quente}
                onChange={(value) => setForm({ ...form, estrategia_lead_quente: value })}
                placeholder="Ex: Seja mais direto, ofereça CTA de compra imediata, destaque urgência e disponibilidade limitada..."
                rows={2}
                context="Estratégia de vendas para leads quentes (prontos para comprar) - instruções diretas e imperativas"
                helperText="Leads muito interessados, prontos para decidir."
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-orange-500" />
                <Label className="text-base font-medium">Lead Morno</Label>
              </div>
              <EnhancedTextarea
                value={form.estrategia_lead_morno}
                onChange={(value) => setForm({ ...form, estrategia_lead_morno: value })}
                placeholder="Ex: Forneça mais informações, tire dúvidas com paciência, destaque benefícios e diferenciais..."
                rows={2}
                context="Estratégia de vendas para leads mornos (interessados mas avaliando) - instruções diretas e imperativas"
                helperText="Leads interessados mas ainda avaliando opções."
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Snowflake className="h-5 w-5 text-blue-500" />
                <Label className="text-base font-medium">Lead Frio</Label>
              </div>
              <EnhancedTextarea
                value={form.estrategia_lead_frio}
                onChange={(value) => setForm({ ...form, estrategia_lead_frio: value })}
                placeholder="Ex: Eduque sobre o problema antes de vender, não pressione, ofereça conteúdo de valor..."
                rows={2}
                context="Estratégia de vendas para leads frios (apenas pesquisando) - instruções diretas e imperativas"
                helperText="Leads apenas pesquisando ou com baixo interesse."
              />
            </div>
          </CardContent>
        </Card>

        {/* Objeções Estruturadas */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <SectionHeader 
              icon={MessageSquare} 
              title="Objeções Estruturadas" 
              tooltip="Cadastre as objeções mais comuns e como o agente deve responder a cada uma."
            />
            
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Lightbulb className="h-4 w-4" /> Objeções comuns:
              </span>
              {objecoesComuns.map((obj) => (
                <Button
                  key={obj}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addObjecaoRapida(obj)}
                  className="text-xs"
                  disabled={form.objecoes.some(o => o.objecao === obj)}
                >
                  {obj}
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm">Objeção do Cliente</Label>
                <Input
                  value={novaObjecao.objecao}
                  onChange={(e) => setNovaObjecao({ ...novaObjecao, objecao: e.target.value })}
                  placeholder='Ex: "Está caro", "Preciso pensar", "Vou pesquisar"'
                />
              </div>
              <div>
                <Label className="text-sm">Resposta do Agente</Label>
                <EnhancedTextarea
                  value={novaObjecao.resposta}
                  onChange={(value) => setNovaObjecao({ ...novaObjecao, resposta: value })}
                  placeholder="Como o agente deve contornar essa objeção?"
                  rows={2}
                  context="Resposta do agente para contornar objeção de vendas - manter como fala do agente, consultiva e persuasiva"
                />
              </div>
              <Button type="button" onClick={addObjecao} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Adicionar Objeção
              </Button>
            </div>

            {form.objecoes.length > 0 && (
              <div className="space-y-2 pt-2">
                {form.objecoes.map((item, i) => (
                  <div key={i} className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm">❌ "{item.objecao}"</p>
                        <p className="text-sm text-muted-foreground mt-1">✅ {item.resposta}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeObjecao(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Objeções bem mapeadas aumentam significativamente a taxa de conversão.
            </p>
          </CardContent>
        </Card>

        {/* Links de Direcionamento */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <SectionHeader 
              icon={Link} 
              title="Links de Direcionamento" 
              tooltip="Cadastre os links reais do seu negócio para o agente direcionar os clientes."
            />
            
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Nome do Link</Label>
                <Input
                  value={novoLink.nome}
                  onChange={(e) => setNovoLink({ ...novoLink, nome: e.target.value })}
                  placeholder="Ex: Plano Starter, Agendar Consulta"
                />
              </div>
              <div>
                <Label className="text-sm">URL Completa</Label>
                <Input
                  value={novoLink.url}
                  onChange={(e) => setNovoLink({ ...novoLink, url: e.target.value })}
                  placeholder="https://seusite.com/checkout"
                />
              </div>
            </div>
            <Button type="button" onClick={addLink} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Link
            </Button>

            {form.links_direcionamento.length > 0 && (
              <div className="space-y-2">
                {form.links_direcionamento.map((link, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-medium text-sm truncate">{link.nome}</span>
                      <span className="text-xs text-muted-foreground truncate">{link.url}</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
    </TooltipProvider>
  );
}
