import { BillingUsageTab } from "@/components/billing/BillingUsageTab";

export function UsageTrackingTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Usage Tracking Engine</h2>
      <p className="text-sm text-muted-foreground">Monitora consumo por empresa com alertas automáticos a partir de 80%.</p>
      <BillingUsageTab />
    </div>
  );
}
