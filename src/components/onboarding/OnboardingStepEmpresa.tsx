import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Check, Loader2 } from "lucide-react";

const SEGMENTOS = [
  "Serviços",
  "Indústria",
  "Comércio",
  "Construção",
  "Planejados / Marcenaria",
  "Arquitetura",
];

const REGIMES = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
  { value: "mei", label: "MEI" },
];

interface Props {
  onComplete: (data: Record<string, any>) => void;
  completed?: boolean;
}

export function OnboardingStepEmpresa({ onComplete, completed }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    cnpj: "",
    segmento: "",
    tax_regime: "simples_nacional",
  });

  useEffect(() => {
    loadExisting();
  }, []);

  const loadExisting = async () => {
    const { data } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
    if (data) {
      setForm({
        company_name: data.company_name || "",
        cnpj: data.cnpj || "",
        segmento: "",
        tax_regime: data.tax_regime || "simples_nacional",
      });
    }
  };

  const handleSave = async () => {
    if (!form.company_name) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("company_settings").select("id").limit(1).maybeSingle();

      const payload = {
        company_name: form.company_name,
        cnpj: form.cnpj,
        tax_regime: form.tax_regime,
      };

      if (existing) {
        await supabase.from("company_settings").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("company_settings").insert(payload);
      }

      onComplete({ segmento: form.segmento, tax_regime: form.tax_regime });
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
          <Building2 className="h-5 w-5 text-primary" />
          Dados da Empresa
          {completed && <Check className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>Informações básicas para personalizar seu ERP</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome da Empresa *</Label>
            <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Minha Empresa Ltda" />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
          </div>
          <div className="space-y-2">
            <Label>Segmento *</Label>
            <Select value={form.segmento} onValueChange={v => setForm(f => ({ ...f, segmento: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
              <SelectContent>
                {SEGMENTOS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Regime Tributário</Label>
            <Select value={form.tax_regime} onValueChange={v => setForm(f => ({ ...f, tax_regime: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGIMES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || !form.company_name || !form.segmento} className="w-full md:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Salvar e Continuar
        </Button>
      </CardContent>
    </Card>
  );
}
