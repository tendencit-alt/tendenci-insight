import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Check, Loader2 } from "lucide-react";

interface Props {
  onComplete: () => void;
  completed?: boolean;
}

export function OnboardingStepMetas({ onComplete, completed }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    metaReceita: "",
    margemMinima: "",
    saldoMinimo: "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Create revenue goal
      if (form.metaReceita) {
        await supabase.from("fin_financial_goals").insert({
          goal_type: "dre",
          metric_key: "receita_operacional",
          target_type: "absolute",
          target_amount: parseFloat(form.metaReceita),
          period_type: "monthly",
          year,
          month,
        });
      }

      // Create margin goal
      if (form.margemMinima) {
        await supabase.from("fin_financial_goals").insert({
          goal_type: "indicator",
          metric_key: "margem_contribuicao",
          target_type: "percentage",
          target_amount: parseFloat(form.margemMinima),
          period_type: "monthly",
          year,
          month,
        });
      }

      // Save min safety balance to company settings
      if (form.saldoMinimo) {
        const { data: existing } = await supabase.from("company_settings").select("id").limit(1).maybeSingle();
        if (existing) {
          await supabase.from("company_settings").update({
            min_safety_balance: parseFloat(form.saldoMinimo),
          }).eq("id", existing.id);
        }
      }

      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Metas Iniciais
          {completed && <Check className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>Defina metas básicas para acompanhamento no dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Meta Mensal de Faturamento (R$)</Label>
            <Input type="number" value={form.metaReceita} onChange={e => setForm(f => ({ ...f, metaReceita: e.target.value }))} placeholder="100000" />
            <p className="text-[10px] text-muted-foreground">Receita bruta esperada por mês</p>
          </div>
          <div className="space-y-2">
            <Label>Margem Mínima Desejada (%)</Label>
            <Input type="number" value={form.margemMinima} onChange={e => setForm(f => ({ ...f, margemMinima: e.target.value }))} placeholder="30" />
            <p className="text-[10px] text-muted-foreground">Margem de contribuição mínima aceitável</p>
          </div>
          <div className="space-y-2">
            <Label>Saldo Mínimo de Caixa (R$)</Label>
            <Input type="number" value={form.saldoMinimo} onChange={e => setForm(f => ({ ...f, saldoMinimo: e.target.value }))} placeholder="50000" />
            <p className="text-[10px] text-muted-foreground">Alerta quando caixa cair abaixo deste valor</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Salvar Metas
        </Button>
      </CardContent>
    </Card>
  );
}
