import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronLeft, ChevronRight, SkipForward, Rocket, Building2, BookOpen, Landmark, LayoutGrid, Target, Users, ShoppingCart, Receipt, BarChart3 } from "lucide-react";
import { OnboardingStepEmpresa } from "@/components/onboarding/OnboardingStepEmpresa";
import { OnboardingStepPlanoContas } from "@/components/onboarding/OnboardingStepPlanoContas";
import { OnboardingStepContaBancaria } from "@/components/onboarding/OnboardingStepContaBancaria";
import { OnboardingStepCentroCusto } from "@/components/onboarding/OnboardingStepCentroCusto";
import { OnboardingStepMetas } from "@/components/onboarding/OnboardingStepMetas";
import { OnboardingStepUsuarios } from "@/components/onboarding/OnboardingStepUsuarios";
import { OnboardingStepPedido } from "@/components/onboarding/OnboardingStepPedido";
import { OnboardingStepLancamento } from "@/components/onboarding/OnboardingStepLancamento";
import { OnboardingStepDashboard } from "@/components/onboarding/OnboardingStepDashboard";

const STEPS = [
  { key: "empresa", label: "Empresa", icon: Building2 },
  { key: "plano_contas", label: "Plano de Contas", icon: BookOpen },
  { key: "conta_bancaria", label: "Conta Bancária", icon: Landmark },
  { key: "centro_custo", label: "Centro de Custo", icon: LayoutGrid },
  { key: "metas", label: "Metas", icon: Target },
  { key: "usuarios", label: "Usuários", icon: Users },
  { key: "pedido", label: "Primeiro Pedido", icon: ShoppingCart },
  { key: "lancamento", label: "Lançamento", icon: Receipt },
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
] as const;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [skippedSteps, setSkippedSteps] = useState<Record<string, boolean>>({});
  const [segmento, setSegmento] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("onboarding_progress")
        .select("step_key, completed, skipped, data");

      const completed: Record<string, boolean> = {};
      const skipped: Record<string, boolean> = {};
      data?.forEach((row: any) => {
        if (row.completed) completed[row.step_key] = true;
        if (row.skipped) skipped[row.step_key] = true;
        if (row.step_key === "empresa" && row.data?.segmento) {
          setSegmento(row.data.segmento);
        }
      });
      setCompletedSteps(completed);
      setSkippedSteps(skipped);

      // Find first incomplete step
      const firstIncomplete = STEPS.findIndex(s => !completed[s.key] && !skipped[s.key]);
      if (firstIncomplete >= 0) setCurrentStep(firstIncomplete);
    } catch (err) {
      console.error("Error loading onboarding progress:", err);
    } finally {
      setLoading(false);
    }
  };

  const markStepCompleted = async (stepKey: string, data?: Record<string, any>) => {
    try {
      const { data: tenantData } = await supabase.rpc("get_user_tenant_id");
      
      await supabase.from("onboarding_progress").upsert({
        tenant_id: tenantData,
        step_key: stepKey,
        completed: true,
        completed_at: new Date().toISOString(),
        skipped: false,
        data: data || {},
      }, { onConflict: "tenant_id,step_key" });

      setCompletedSteps(prev => ({ ...prev, [stepKey]: true }));
      setSkippedSteps(prev => ({ ...prev, [stepKey]: false }));

      if (stepKey === "empresa" && data?.segmento) {
        setSegmento(data.segmento);
      }

      toast({ title: "Etapa concluída!", description: `${STEPS.find(s => s.key === stepKey)?.label} configurado com sucesso.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const skipStep = async (stepKey: string) => {
    try {
      const { data: tenantData } = await supabase.rpc("get_user_tenant_id");
      
      await supabase.from("onboarding_progress").upsert({
        tenant_id: tenantData,
        step_key: stepKey,
        completed: false,
        skipped: true,
        data: {},
      }, { onConflict: "tenant_id,step_key" });

      setSkippedSteps(prev => ({ ...prev, [stepKey]: true }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSkip = async () => {
    await skipStep(STEPS[currentStep].key);
    handleNext();
  };

  const handleFinish = async () => {
    try {
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("company_settings")
          .update({ onboarding_completed: true })
          .eq("id", existing.id);
      }

      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast({ title: "🎉 Onboarding concluído!", description: "Seu ERP está pronto para uso." });
      navigate("/bi-dashboard");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = (completedCount / STEPS.length) * 100;
  const currentStepData = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  // Pending alerts
  const pendingSteps = STEPS.filter(s => !completedSteps[s.key] && !skippedSteps[s.key] && s.key !== currentStepData.key);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Rocket className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Configuração Inicial do ERP</h1>
                <p className="text-sm text-muted-foreground">Configure seu sistema em poucos minutos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                {completedCount}/{STEPS.length} etapas
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => navigate("/bi-dashboard")}>
                Pular tudo e ir ao Dashboard
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <Progress value={progressPercent} className="h-2 mb-3" />

          {/* Step indicators */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isCompleted = completedSteps[step.key];
              const isSkipped = skippedSteps[step.key];
              const isCurrent = i === currentStep;

              return (
                <button
                  key={step.key}
                  onClick={() => setCurrentStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-primary/10 text-primary"
                      : isSkipped
                      ? "bg-muted text-muted-foreground line-through"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Pending alerts */}
        {pendingSteps.length > 0 && completedCount > 0 && (
          <div className="mb-6 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Etapas pendentes:</strong>{" "}
              {pendingSteps.map(s => s.label).join(", ")}
            </p>
          </div>
        )}

        {/* Step content */}
        <div className="min-h-[400px]">
          {currentStepData.key === "empresa" && (
            <OnboardingStepEmpresa onComplete={(data) => markStepCompleted("empresa", data)} completed={completedSteps["empresa"]} />
          )}
          {currentStepData.key === "plano_contas" && (
            <OnboardingStepPlanoContas onComplete={() => markStepCompleted("plano_contas")} completed={completedSteps["plano_contas"]} />
          )}
          {currentStepData.key === "conta_bancaria" && (
            <OnboardingStepContaBancaria onComplete={() => markStepCompleted("conta_bancaria")} completed={completedSteps["conta_bancaria"]} />
          )}
          {currentStepData.key === "centro_custo" && (
            <OnboardingStepCentroCusto onComplete={() => markStepCompleted("centro_custo")} segmento={segmento} completed={completedSteps["centro_custo"]} />
          )}
          {currentStepData.key === "metas" && (
            <OnboardingStepMetas onComplete={() => markStepCompleted("metas")} completed={completedSteps["metas"]} />
          )}
          {currentStepData.key === "usuarios" && (
            <OnboardingStepUsuarios onComplete={() => markStepCompleted("usuarios")} completed={completedSteps["usuarios"]} />
          )}
          {currentStepData.key === "pedido" && (
            <OnboardingStepPedido onComplete={() => markStepCompleted("pedido")} completed={completedSteps["pedido"]} />
          )}
          {currentStepData.key === "lancamento" && (
            <OnboardingStepLancamento onComplete={() => markStepCompleted("lancamento")} completed={completedSteps["lancamento"]} />
          )}
          {currentStepData.key === "dashboard" && (
            <OnboardingStepDashboard onComplete={handleFinish} completed={completedSteps["dashboard"]} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handlePrev} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>

          <div className="flex items-center gap-2">
            {!isLastStep && !completedSteps[currentStepData.key] && (
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                <SkipForward className="h-4 w-4 mr-1" /> Pular etapa
              </Button>
            )}
            {!isLastStep && (
              <Button onClick={handleNext}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {isLastStep && (
              <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                <Rocket className="h-4 w-4 mr-1" /> Concluir e Acessar ERP
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
