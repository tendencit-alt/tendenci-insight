import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Check, Loader2, Plus, X } from "lucide-react";

interface Props {
  onComplete: () => void;
  completed?: boolean;
  segmento?: string;
}

const CENTROS_PADRAO = [
  "Administrativo", "Financeiro", "Comercial", "Produção",
  "Montagem", "Marketing", "Logística", "Diretoria",
];

const CENTROS_MARCENARIA = [
  "Produção Interna", "Produção Externa", "Montagem",
  "Assistência Técnica",
];

export function OnboardingStepCentroCusto({ onComplete, completed, segmento }: Props) {
  const [centros, setCentros] = useState<Array<{ name: string; enabled: boolean }>>([]);
  const [newCentro, setNewCentro] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const base = [...CENTROS_PADRAO];
    if (segmento === "Planejados / Marcenaria") {
      CENTROS_MARCENARIA.forEach(c => {
        if (!base.includes(c)) base.push(c);
      });
    }
    setCentros(base.map(name => ({ name, enabled: true })));
  }, [segmento]);

  const addCentro = () => {
    if (newCentro.trim() && !centros.find(c => c.name === newCentro.trim())) {
      setCentros(prev => [...prev, { name: newCentro.trim(), enabled: true }]);
      setNewCentro("");
    }
  };

  const handleSave = async () => {
    const enabled = centros.filter(c => c.enabled);
    if (enabled.length === 0) return;
    setSaving(true);
    try {
      const { data: tenantId } = await supabase.rpc("get_user_tenant_id");

      for (const centro of enabled) {
        await supabase.from("fin_cost_centers").upsert({
          name: centro.name,
          active: true,
          tenant_id: tenantId,
        }, { onConflict: "name,tenant_id" });
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
          <LayoutGrid className="h-5 w-5 text-primary" />
          Centros de Custo
          {completed && <Check className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Setores responsáveis pelo uso dos recursos financeiros
          {segmento === "Planejados / Marcenaria" && (
            <Badge variant="secondary" className="ml-2 text-[10px]">Adaptado para Marcenaria</Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {centros.map((c, i) => (
            <label key={c.name} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-accent/30">
              <Checkbox
                checked={c.enabled}
                onCheckedChange={(checked) =>
                  setCentros(prev => prev.map((cc, idx) => idx === i ? { ...cc, enabled: !!checked } : cc))
                }
              />
              <span className="text-sm">{c.name}</span>
              {!CENTROS_PADRAO.includes(c.name) && (
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-auto"
                  onClick={() => setCentros(prev => prev.filter((_, idx) => idx !== i))}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <Input value={newCentro} onChange={e => setNewCentro(e.target.value)} placeholder="Novo centro de custo..."
            onKeyDown={e => e.key === "Enter" && addCentro()} className="max-w-xs" />
          <Button variant="outline" size="sm" onClick={addCentro} disabled={!newCentro.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>

        <Button onClick={handleSave} disabled={saving || !centros.some(c => c.enabled)}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Salvar Centros de Custo
        </Button>
      </CardContent>
    </Card>
  );
}
