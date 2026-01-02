import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, User, MessageSquare, Target, ShoppingCart, Package, Brain, Shield, BookOpen, Loader2, Check, ExternalLink, Workflow } from "lucide-react";
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

export default function IAConfiguracao() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<Record<string, IAConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("negocio");

  useEffect(() => {
    loadConfigs();
  }, []);

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
    { id: "produtos", label: "Produtos", icon: Package, description: "Catálogo de produtos" },
    { id: "conhecimento", label: "Conhecimento", icon: BookOpen, description: "Base de conhecimento" },
    { id: "comportamento", label: "Comportamento", icon: Brain, description: "Regras de comportamento" },
    { id: "regras", label: "Regras", icon: Shield, description: "Regras de negócio" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Configuração da IA de Atendimento</h1>
              <p className="text-muted-foreground">Instância: Matheus</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Card de Integração n8n */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Workflow className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Integração com n8n</h3>
                <p className="text-sm text-muted-foreground">
                  Configure seu workflow n8n para usar as configurações e dados cadastrados aqui
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/n8n-conversa")} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Ver Documentação
            </Button>
          </CardContent>
        </Card>

        <MasterPromptPreview />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isSaving = saving === tab.id;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg border"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {tab.label}
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
