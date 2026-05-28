import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, SkipForward, ArrowRight, ArrowLeft, Check } from "lucide-react";

type StepKey = "empresa" | "banco" | "time";
const STEPS: { key: StepKey; title: string; subtitle: string }[] = [
  { key: "empresa", title: "Sobre sua empresa", subtitle: "Alguns dados para personalizar o sistema" },
  { key: "banco", title: "Primeira conta bancária", subtitle: "Para começar a registrar movimentações" },
  { key: "time", title: "Convide seu time", subtitle: "Opcional — você pode fazer isso depois" },
];

export default function BoasVindas() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth() as any;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // form state
  const [empresa, setEmpresa] = useState({ phone: "", address: "", segment: "" });
  const [banco, setBanco] = useState({ nickname: "", bank_name: "", agency: "", account_number: "" });
  const [invites, setInvites] = useState<string[]>(["", "", ""]);

  const tenantId = profile?.tenant_id || profile?.current_tenant_id;

  const markCompleteAndExit = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq("id", user.id);
        await refreshProfile?.();
      }
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      if (step === 0) {
        // Empresa: save additional info if any — soft (best effort)
        if (tenantId && (empresa.phone || empresa.address || empresa.segment)) {
          // store in tenants.metadata-style is unknown; skip if no column. Save via audit_log as metadata.
          await supabase.from("audit_log").insert({
            tenant_id: tenantId,
            user_id: user?.id ?? null,
            table_name: "tenants",
            record_id: tenantId,
            event_type: "onboarding_company_info",
            event_source: "boas_vindas",
            metadata: empresa as any,
          });
        }
      } else if (step === 1) {
        if (banco.nickname && tenantId) {
          const { error } = await supabase.from("fin_bank_accounts").insert({
            tenant_id: tenantId,
            nickname: banco.nickname,
            bank_name: banco.bank_name || null,
            agency: banco.agency || null,
            account_number: banco.account_number || null,
            active: true,
          });
          if (error) throw error;
        }
      } else if (step === 2) {
        const valid = invites.map((e) => e.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
        if (valid.length && tenantId) {
          await supabase.from("audit_log").insert(
            valid.map((email) => ({
              tenant_id: tenantId,
              user_id: user?.id ?? null,
              table_name: "invites",
              record_id: email,
              event_type: "team_invite_requested",
              event_source: "boas_vindas",
              new_value: email,
            })),
          );
        }
        await markCompleteAndExit();
        return;
      }
      setStep(step + 1);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const current = STEPS[step];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Passo {step + 1} de {STEPS.length}</span>
            <Button variant="ghost" size="sm" onClick={markCompleteAndExit} disabled={loading}>
              <SkipForward className="h-4 w-4 mr-1" /> Pular para o sistema
            </Button>
          </div>
          <Progress value={progress} />
          <CardTitle>{current.title}</CardTitle>
          <CardDescription>{current.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <Label>Telefone</Label>
                <Input value={empresa.phone} onChange={(e) => setEmpresa({ ...empresa, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={empresa.address} onChange={(e) => setEmpresa({ ...empresa, address: e.target.value })} placeholder="Rua, número, cidade" />
              </div>
              <div>
                <Label>Segmento (opcional)</Label>
                <Input value={empresa.segment} onChange={(e) => setEmpresa({ ...empresa, segment: e.target.value })} placeholder="Móveis planejados, arquitetura..." />
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <Label>Nome da conta *</Label>
                <Input value={banco.nickname} onChange={(e) => setBanco({ ...banco, nickname: e.target.value })} placeholder="Conta Principal" />
              </div>
              <div>
                <Label>Banco</Label>
                <Input value={banco.bank_name} onChange={(e) => setBanco({ ...banco, bank_name: e.target.value })} placeholder="Itaú, Bradesco, Nubank..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Agência</Label>
                  <Input value={banco.agency} onChange={(e) => setBanco({ ...banco, agency: e.target.value })} />
                </div>
                <div>
                  <Label>Conta</Label>
                  <Input value={banco.account_number} onChange={(e) => setBanco({ ...banco, account_number: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Convide até 3 pessoas. Elas receberão acesso assim que você completar o cadastro delas em Usuários.</p>
              {invites.map((v, i) => (
                <Input
                  key={i}
                  type="email"
                  placeholder={`email${i + 1}@empresa.com`}
                  value={v}
                  onChange={(e) => {
                    const next = [...invites];
                    next[i] = e.target.value;
                    setInvites(next);
                  }}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0 || loading}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <Button onClick={handleNext} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {step === STEPS.length - 1 ? (
                <>Concluir <Check className="h-4 w-4 ml-1" /></>
              ) : (
                <>Continuar <ArrowRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
