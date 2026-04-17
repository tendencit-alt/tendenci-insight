import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowRight } from "lucide-react";
import { BusinessProfileStep } from "./BusinessProfileStep";
import { AssistedChartTemplate } from "./AssistedChartTemplate";
import { ProgressiveChecklist } from "./ProgressiveChecklist";
import { useSmartOnboarding } from "@/hooks/useSmartOnboarding";
import { useOnboardingAnalytics } from "@/hooks/useOnboardingAnalytics";

export function SmartOnboardingWizard() {
  const navigate = useNavigate();
  const { onboarding } = useSmartOnboarding();
  const { track } = useOnboardingAnalytics();

  useEffect(() => {
    track("wizard", "viewed");
  }, [track]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Rocket className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Smart Onboarding</h1>
          <p className="text-sm text-muted-foreground">Implantação guiada e adaptada ao seu negócio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <BusinessProfileStep />
          <AssistedChartTemplate />
        </div>
        <div className="space-y-6">
          <ProgressiveChecklist />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              track("wizard", onboarding?.segment ? "completed" : "skipped");
              navigate("/central-navegacao");
            }}
          >
            Ir para o sistema <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
