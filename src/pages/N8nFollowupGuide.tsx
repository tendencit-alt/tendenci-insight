import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { N8nFollowupGuide as GuideContent } from "@/components/settings/N8nFollowupGuide";

export default function N8nFollowupGuide() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-5xl">
        <GuideContent />
      </div>
    </DashboardLayout>
  );
}