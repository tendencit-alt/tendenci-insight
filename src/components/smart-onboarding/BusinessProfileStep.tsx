import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Check } from "lucide-react";
import {
  SEGMENT_LABELS,
  TEAM_SIZE_LABELS,
  GOAL_LABELS,
  MATURITY_LABELS,
  type BusinessProfile,
} from "./types";
import { useSmartOnboarding } from "@/hooks/useSmartOnboarding";
import { useTenantCustomization } from "@/hooks/useTenantCustomization";
import { useOnboardingAnalytics } from "@/hooks/useOnboardingAnalytics";

interface Props {
  onComplete?: () => void;
}

export function BusinessProfileStep({ onComplete }: Props) {
  const { onboarding, upsertProfile } = useSmartOnboarding();
  const { applySegmentTemplate } = useTenantCustomization();
  const { track } = useOnboardingAnalytics();

  const [profile, setProfile] = useState<BusinessProfile>({
    segment: (onboarding?.segment as any) || null,
    team_size: (onboarding?.team_size as any) || null,
    primary_goal: (onboarding?.primary_goal as any) || null,
    financial_maturity: (onboarding?.financial_maturity as any) || null,
    chart_template: (onboarding?.chart_template as any) || null,
  });

  const ready = profile.segment && profile.team_size && profile.primary_goal && profile.financial_maturity;
  const saved = !!onboarding?.segment;

  const handleSave = async () => {
    await track("business_profile", "started");
    await upsertProfile.mutateAsync({ ...profile, chart_template: profile.chart_template ?? profile.segment });
    if (profile.segment) applySegmentTemplate(profile.segment);
    await track("business_profile", "completed", { metadata: profile });
    onComplete?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Perfil do Negócio
          {saved && <Check className="h-4 w-4 text-success" />}
        </CardTitle>
        <CardDescription>Personalizamos o sistema com base no seu perfil</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Segmento *</Label>
            <Select value={profile.segment || ""} onValueChange={v => setProfile(p => ({ ...p, segment: v as any }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {Object.entries(SEGMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tamanho da equipe *</Label>
            <Select value={profile.team_size || ""} onValueChange={v => setProfile(p => ({ ...p, team_size: v as any }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {Object.entries(TEAM_SIZE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Objetivo principal *</Label>
            <Select value={profile.primary_goal || ""} onValueChange={v => setProfile(p => ({ ...p, primary_goal: v as any }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {Object.entries(GOAL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Maturidade financeira *</Label>
            <Select value={profile.financial_maturity || ""} onValueChange={v => setProfile(p => ({ ...p, financial_maturity: v as any }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {Object.entries(MATURITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSave} disabled={!ready || upsertProfile.isPending} className="w-full md:w-auto">
          {upsertProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Salvar perfil e personalizar
        </Button>
      </CardContent>
    </Card>
  );
}
