import { Sparkles } from "lucide-react";
import { SuggestionsPanel, AutomationAnalyticsCard } from "@/components/smart-automations";

export default function SmartAutomations() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Automações Inteligentes</h1>
          <p className="text-sm text-muted-foreground">Padrões detectados e sugestões prontas para ativar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SuggestionsPanel limit={20} />
        </div>
        <div>
          <AutomationAnalyticsCard />
        </div>
      </div>
    </div>
  );
}
