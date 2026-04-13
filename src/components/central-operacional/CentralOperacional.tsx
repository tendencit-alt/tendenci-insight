import { useCriticalAlerts, useTodayAgenda, useRecentEvents, useQuickIndicators } from "@/hooks/useCentralOperacional";
import { IndicatorsHeader } from "./IndicatorsHeader";
import { CriticalAlertsBlock } from "./CriticalAlertsBlock";
import { MyTasksBlock } from "./MyTasksBlock";
import { ApprovalsBlock } from "./ApprovalsBlock";
import { AgendaBlock } from "./AgendaBlock";
import { RecentEventsBlock } from "./RecentEventsBlock";
import { QuickActionsBlock } from "./QuickActionsBlock";

export function CentralOperacional() {
  const { data: alerts = [], isLoading: loadingAlerts } = useCriticalAlerts();
  const { data: agenda = [], isLoading: loadingAgenda } = useTodayAgenda();
  const { data: events = [], isLoading: loadingEvents } = useRecentEvents();
  const { data: indicators = [], isLoading: loadingIndicators } = useQuickIndicators();

  return (
    <div className="space-y-4">
      {/* Header Indicators */}
      <IndicatorsHeader indicators={indicators} loading={loadingIndicators} />

      {/* Critical Alerts - Full Width */}
      <CriticalAlertsBlock alerts={alerts} loading={loadingAlerts} />

      {/* Main Grid - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MyTasksBlock />
        <ApprovalsBlock />
      </div>

      {/* Secondary Grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AgendaBlock items={agenda} loading={loadingAgenda} />
        <RecentEventsBlock events={events} loading={loadingEvents} />
        <QuickActionsBlock />
      </div>
    </div>
  );
}
