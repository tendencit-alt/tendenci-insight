import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, User, MessageSquare, Target, ShoppingCart, Package, Brain, Shield, BookOpen, Loader2, CheckCircle2, AlertCircle, Circle, Activity, History, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import IAConfigNegocio from "@/components/ia-config/IAConfigNegocio";
import IAConfigIdentidade from "@/components/ia-config/IAConfigIdentidade";
import IAConfigComunicacao from "@/components/ia-config/IAConfigComunicacao";
import IAConfigQualificacao from "@/components/ia-config/IAConfigQualificacao";
import IAConfigVendas from "@/components/ia-config/IAConfigVendas";
import IAConfigProdutos from "@/components/ia-config/IAConfigProdutos";
import IAConfigConhecimento from "@/components/ia-config/IAConfigConhecimento";
import IAConfigComportamento from "@/components/ia-config/IAConfigComportamento";
import IAConfigRegras from "@/components/ia-config/IAConfigRegras";
import MasterPromptPreview from "@/components/ia-config/MasterPromptPreview";
import { IAAgentTester } from "@/components/ia-config/IAAgentTester";
import { IAProgressIndicator } from "@/components/ia-config/IAProgressIndicator";
import { IAConfigOverview } from "@/components/ia-config/IAConfigOverview";
import { IAActivityMonitor } from "@/components/ia-config/IAActivityMonitor";
import { IAWhatsAppConnection } from "@/components/ia-config/IAWhatsAppConnection";
import { Progress } from "@/components/ui/progress";

interface IAConfig {
  id: string;
  secao: string;
  config: Json;
  ativa: boolean;
  versao: number;
}

type IAConfigRow = {
  id: string;
  secao: string;
  config: unknown;
  ativa: boolean | null;
  versao: number | null;
  created_at: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

// Campos obrigatórios por seção para calcular progresso
const REQUIRED_FIELDS: Record<string, string[]> = {
  negocio: ['nome_empresa', 'ramo'],
  identidade: ['nome_ia'],
  comunicacao: ['msg_boas_vindas'],
  qualificacao: ['perguntas'],
  vendas: ['tecnicas'],
  comportamento: ['comportamentos'],
  regras: ['regras']
};

export default function IAConfiguracao() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<Record<string, IAConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("negocio");
  const [produtosCount, setProdutosCount] = useState(0);
  const [conhecimentoCount, setConhecimentoCount] = useState(0);

  useEffect(() => {
    loadConfigs();
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const [produtosRes, conhecimentoRes] = await Promise.all([
        supabase.from("tendenci_ia_produtos").select("id", { count: 'exact', head: true }),
        supabase.from("tendenci_ia_conhecimento").select("id", { count: 'exact', head: true })
      ]);
      setProdutosCount(produtosRes.count || 0);
      setConhecimentoCount(conhecimentoRes.count || 0);
    } catch (error) {
      console.error("Erro ao carregar contadores:", error);
    }
  };

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("tendenci_ia_config")
        .select("*");

      if (error) throw error;

      const configMap: Record<string, IAConfig> = {};
      (data as IAConfigRow[] | null)?.forEach((item) => {
        configMap[item.secao] = {
          id: item.id,
          secao: item.secao,
          config: (item.config as Json) || {},
          ativa: item.ativa ?? true,
          versao: item.versao ?? 1
        };
      });
      setConfigs(configMap);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (secao: string, config: Json) => {
    setSaving(secao);
    try {
      const { error } = await supabase
        .from("tendenci_ia_config")
        .update({ 
          config,
          versao: (configs[secao]?.versao || 1) + 1
        })
        .eq("secao", secao);

      if (error) throw error;

      setConfigs(prev => ({
        ...prev,
        [secao]: { ...prev[secao], config, versao: (prev[secao]?.versao || 1) + 1 } as IAConfig
      }));

      toast.success("Configuração salva!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(null);
    }
  };

  const tabs = [
    { id: "negocio", label: "Negócio", icon: Building2, description: "Informações da empresa" },
    { id: "identidade", label: "Identidade", icon: User, description: "Personalidade da IA" },
    { id: "comunicacao", label: "Comunicação", icon: MessageSquare, description: "Como a IA se comunica" },
    { id: "qualificacao", label: "Qualificação", icon: Target, description: "Perguntas e critérios" },
    { id: "vendas", label: "Vendas", icon: ShoppingCart, description: "Técnicas e scripts" },
    { id: "produtos", label: "Produtos", icon: Package, description: "Catálogo de produtos", count: produtosCount },
    { id: "conhecimento", label: "Conhecimento", icon: BookOpen, description: "Base de conhecimento", count: conhecimentoCount },
    { id: "comportamento", label: "Comportamento", icon: Brain, description: "Regras de comportamento" },
    { id: "regras", label: "Regras", icon: Shield, description: "Regras de negócio" },
  ];

  // Calcular status de cada seção
  const getSectionStatus = (secao: string): 'complete' | 'partial' | 'empty' => {
    // Produtos e conhecimento são especiais - baseados em contagem
    if (secao === 'produtos') return produtosCount > 0 ? 'complete' : 'empty';
    if (secao === 'conhecimento') return conhecimentoCount > 0 ? 'complete' : 'empty';

    const config = configs[secao]?.config as Record<string, unknown> | undefined;
    if (!config) return 'empty';

    const requiredFields = REQUIRED_FIELDS[secao] || [];
    const filledFields = Object.entries(config).filter(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    });

    if (filledFields.length === 0) return 'empty';
    
    const hasAllRequired = requiredFields.every(field => {
      const value = config[field];
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    });

    return hasAllRequired ? 'complete' : 'partial';
  };

  // Calcular progresso geral
  const progressData = useMemo(() => {
    const sections = tabs.map(tab => ({
      key: tab.id,
      label: tab.label,
      status: getSectionStatus(tab.id),
      icon: tab.icon
    }));

    const completed = sections.filter(s => s.status === 'complete').length;
    return { sections, completed, total: sections.length };
  }, [configs, produtosCount, conhecimentoCount]);

  // Contar regras e técnicas
  const regrasCount = useMemo(() => {
    const regrasConfig = configs.regras?.config as Record<string, unknown> | undefined;
    const regras = regrasConfig?.regras as unknown[] | undefined;
    return Array.isArray(regras) ? regras.length : 0;
  }, [configs]);

  const tecnicasCount = useMemo(() => {
    const vendasConfig = configs.vendas?.config as Record<string, unknown> | undefined;
    const tecnicas = vendasConfig?.tecnicas as unknown[] | undefined;
    return Array.isArray(tecnicas) ? tecnicas.length : 0;
  }, [configs]);

  const getStatusIcon = (status: 'complete' | 'partial' | 'empty') => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'partial': return <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />;
      case 'empty': return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const percentage = progressData.total > 0 ? Math.round((progressData.completed / progressData.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Configuração da IA de Atendimento</h1>
                <p className="text-sm text-muted-foreground">
                  {progressData.completed} de {progressData.total} seções configuradas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">{percentage}%</span>
                <p className="text-xs text-muted-foreground">Progresso</p>
              </div>
              <div className="w-24">
                <Progress value={percentage} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Cards de Resumo */}
        <IAConfigOverview 
          produtosCount={produtosCount}
          conhecimentoCount={conhecimentoCount}
          regrasCount={regrasCount}
          tecnicasCount={tecnicasCount}
        />

        {/* Conexão WhatsApp */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Conexão WhatsApp
            </CardTitle>
            <CardDescription>
              Gerencie a conexão do WhatsApp para atendimento por IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IAWhatsAppConnection />
          </CardContent>
        </Card>

        {/* Ação Rápida - Histórico */}
        <Card className="border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/ia-conversas")}>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <History className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Histórico de Conversas</h3>
              <p className="text-sm text-muted-foreground">
                Ver todas as conversas da IA
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Monitor de Atividade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitor de Atividade
            </CardTitle>
            <CardDescription>
              Acompanhe as mensagens processadas pela IA em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IAActivityMonitor />
          </CardContent>
        </Card>

        <MasterPromptPreview />

              <IAAgentTester 
                isConfigComplete={['negocio', 'identidade', 'comunicacao'].every(
                  secao => getSectionStatus(secao) !== 'empty'
                )}
                completedSections={progressData.completed}
                totalSections={progressData.total}
              />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isSaving = saving === tab.id;
              const status = getSectionStatus(tab.id);
              const tabCount = 'count' in tab ? tab.count : undefined;
              
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg border relative"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span>{tab.label}</span>
                  {tabCount !== undefined && tabCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded-full">
                      {tabCount}
                    </span>
                  )}
                  <span className="ml-1">{getStatusIcon(status)}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {tabs.find(t => t.id === activeTab)?.icon && (
                  (() => {
                    const Icon = tabs.find(t => t.id === activeTab)!.icon;
                    return <Icon className="h-5 w-5" />;
                  })()
                )}
                {tabs.find(t => t.id === activeTab)?.label}
              </CardTitle>
              <CardDescription>
                {tabs.find(t => t.id === activeTab)?.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabsContent value="negocio" className="mt-0">
                <IAConfigNegocio 
                  config={(configs.negocio?.config as Record<string, unknown>) || {}} 
                  onSave={(config) => saveConfig("negocio", config as Json)}
                  saving={saving === "negocio"}
                />
              </TabsContent>

              <TabsContent value="identidade" className="mt-0">
                <IAConfigIdentidade 
                  config={(configs.identidade?.config as Record<string, unknown>) || {}} 
                  onSave={(config) => saveConfig("identidade", config as Json)}
                  saving={saving === "identidade"}
                />
              </TabsContent>

              <TabsContent value="comunicacao" className="mt-0">
                <IAConfigComunicacao 
                  config={(configs.comunicacao?.config as Record<string, unknown>) || {}} 
                  onSave={(config) => saveConfig("comunicacao", config as Json)}
                  saving={saving === "comunicacao"}
                />
              </TabsContent>

              <TabsContent value="qualificacao" className="mt-0">
                <IAConfigQualificacao 
                  config={(configs.qualificacao?.config as Record<string, unknown>) || {}} 
                  onSave={(config) => saveConfig("qualificacao", config as Json)}
                  saving={saving === "qualificacao"}
                />
              </TabsContent>

              <TabsContent value="vendas" className="mt-0">
                <IAConfigVendas 
                  config={(configs.vendas?.config as Record<string, unknown>) || {}} 
                  onSave={(config) => saveConfig("vendas", config as Json)}
                  saving={saving === "vendas"}
                />
              </TabsContent>

              <TabsContent value="produtos" className="mt-0">
                <IAConfigProdutos />
              </TabsContent>

              <TabsContent value="conhecimento" className="mt-0">
                <IAConfigConhecimento />
              </TabsContent>

              <TabsContent value="comportamento" className="mt-0">
                <IAConfigComportamento 
                  config={(configs.comportamento?.config as Record<string, unknown>) || {}} 
                  onSave={(config) => saveConfig("comportamento", config as Json)}
                  saving={saving === "comportamento"}
                />
              </TabsContent>

              <TabsContent value="regras" className="mt-0">
                <IAConfigRegras 
                  config={(configs.regras?.config as Record<string, unknown>) || {}} 
                  onSave={(config) => saveConfig("regras", config as Json)}
                  saving={saving === "regras"}
                />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}
