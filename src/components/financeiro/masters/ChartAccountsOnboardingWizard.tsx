import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, Sparkles, Plus, Trash2, ChevronRight, ChevronLeft, CheckCircle2, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;

type DraftRow = {
  uid: string;
  parent_id: string;
  name: string;
  nature: "RECEITA" | "DESPESA" | "ATIVO" | "PASSIVO" | "RESULTADO";
  in_dre: boolean;
  in_cashflow: boolean;
};

const COMPLETION_KEY = "fin_chart_onboarding_done";

function newDraft(parent_id = ""): DraftRow {
  return {
    uid: crypto.randomUUID(),
    parent_id,
    name: "",
    nature: "DESPESA",
    in_dre: true,
    in_cashflow: true,
  };
}

export function ChartAccountsOnboardingWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: accounts } = useQuery({
    queryKey: ["fin-chart-accounts-onboarding"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("*")
        .not("tenant_id", "is", null)
        .order("code");
      return data || [];
    },
  });

  // Reset when dialog reopens
  useEffect(() => {
    if (open) {
      setStep(1);
      setHiddenIds(new Set());
      setDrafts([]);
    }
  }, [open]);

  const stats = useMemo(() => {
    const all = accounts || [];
    return {
      total: all.length,
      core: all.filter((a) => a.is_core).length,
      custom: all.filter((a) => !a.is_core).length,
      inactive: all.filter((a) => !a.active).length,
    };
  }, [accounts]);

  // Possible parents: depth < 2 (Raiz or Grupo)
  const parentOptions = useMemo(() => {
    return (accounts || [])
      .filter((a) => (a.code.match(/\./g) || []).length < 2)
      .sort((a, b) => a.code.localeCompare(b.code, "pt-BR", { numeric: true }));
  }, [accounts]);

  // Step 2: list of CORE leaf accounts (depth >= 2 OR no children) so user can hide noise
  const coreToggleable = useMemo(() => {
    const all = accounts || [];
    const childMap = new Map<string, number>();
    all.forEach((a) => {
      if (a.parent_id) childMap.set(a.parent_id, (childMap.get(a.parent_id) || 0) + 1);
    });
    return all
      .filter((a) => a.is_core && (childMap.get(a.id) || 0) === 0)
      .sort((a, b) => a.code.localeCompare(b.code, "pt-BR", { numeric: true }));
  }, [accounts]);

  const addDraft = () => setDrafts((d) => [...d, newDraft(parentOptions[0]?.id || "")]);
  const updateDraft = (uid: string, patch: Partial<DraftRow>) =>
    setDrafts((d) => d.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  const removeDraft = (uid: string) => setDrafts((d) => d.filter((r) => r.uid !== uid));

  const validDrafts = drafts.filter((d) => d.name.trim() && d.parent_id);

  const computeNextCode = (parentId: string, alreadyAdded: Map<string, number>): string => {
    const all = accounts || [];
    const parent = all.find((a) => a.id === parentId);
    if (!parent) return "1";
    const baseCount = all.filter((a) => a.parent_id === parentId).length;
    const drafted = alreadyAdded.get(parentId) || 0;
    const next = baseCount + drafted + 1;
    alreadyAdded.set(parentId, drafted + 1);
    return `${parent.code}.${next}`;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1) Hide selected core accounts (active=false)
      if (hiddenIds.size > 0) {
        const { error } = await supabase
          .from("fin_chart_accounts")
          .update({ active: false })
          .in("id", Array.from(hiddenIds));
        if (error) throw error;
      }

      // 2) Create custom drafts
      if (validDrafts.length > 0) {
        const tally = new Map<string, number>();
        const rows = validDrafts.map((d) => ({
          code: computeNextCode(d.parent_id, tally),
          name: d.name.trim(),
          nature: d.nature,
          parent_id: d.parent_id,
          in_dre: d.in_dre,
          in_cashflow: d.in_cashflow,
          active: true,
        }));
        const { error } = await supabase.from("fin_chart_accounts").insert(rows);
        if (error) throw error;
      }

      localStorage.setItem(COMPLETION_KEY, new Date().toISOString());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["fin-chart-accounts-all"] }),
        queryClient.invalidateQueries({ queryKey: ["fin-chart-accounts-onboarding"] }),
      ]);
      toast.success(
        validDrafts.length || hiddenIds.size
          ? `Plano configurado! ${validDrafts.length} conta(s) criada(s), ${hiddenIds.size} ocultada(s).`
          : "Configuração concluída."
      );
      setStep(4);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    1: "Bem-vindo ao seu Plano de Contas",
    2: "Ocultar contas que você não usa",
    3: "Adicionar suas contas personalizadas",
    4: "Tudo pronto!",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {stepTitles[step]}
          </DialogTitle>
          <DialogDescription>
            Passo {Math.min(step, 3)} de 3 — configure seu plano financeiro em poucos cliques.
          </DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-1">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  step >= (n as Step) ? "bg-primary" : "bg-muted"
                )}
              />
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {/* STEP 1 — Welcome */}
          {step === 1 && (
            <ScrollArea className="h-[420px] pr-3">
              <div className="space-y-4 py-2">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">Seu plano já vem pronto.</p>
                      <p className="text-sm text-muted-foreground">
                        O sistema instala automaticamente uma estrutura padrão completa com{" "}
                        <strong className="text-foreground">{stats.core} contas</strong> organizadas em
                        receitas, despesas, custos diretos, comissões, ativo e passivo. Essas contas são
                        protegidas — você não pode excluí-las, mas pode ocultar e adicionar quantas quiser
                        por cima.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{stats.core}</div>
                    <div className="text-xs text-muted-foreground mt-1">Padrão do sistema</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{stats.custom}</div>
                    <div className="text-xs text-muted-foreground mt-1">Personalizadas</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{stats.inactive}</div>
                    <div className="text-xs text-muted-foreground mt-1">Inativas</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Como funciona o assistente:</p>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>
                      <strong className="text-foreground">Ocultar:</strong> marque as contas padrão que sua
                      operação não usa (ex.: se você não trabalha com importação, oculte essa categoria).
                    </li>
                    <li>
                      <strong className="text-foreground">Adicionar:</strong> cadastre rapidamente as suas
                      contas específicas (ex.: "Tráfego pago - Meta", "Software de design").
                    </li>
                    <li>
                      <strong className="text-foreground">Pronto:</strong> sua estrutura fica refinada,
                      sem mexer no padrão protegido.
                    </li>
                  </ol>
                </div>
              </div>
            </ScrollArea>
          )}

          {/* STEP 2 — Hide unused */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Marque as contas padrão que você <strong>não usa</strong>. Elas serão desativadas (não
                aparecem em relatórios), mas continuam preservadas — você pode reativar depois.
              </p>
              <div className="text-xs text-muted-foreground">
                {hiddenIds.size} de {coreToggleable.length} marcadas para ocultar.
              </div>
              <ScrollArea className="h-[340px] rounded-md border">
                <div className="divide-y">
                  {coreToggleable.map((acc) => {
                    const checked = hiddenIds.has(acc.id);
                    return (
                      <label
                        key={acc.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Switch
                            checked={checked}
                            onCheckedChange={(v) => {
                              setHiddenIds((s) => {
                                const next = new Set(s);
                                if (v) next.add(acc.id);
                                else next.delete(acc.id);
                                return next;
                              });
                            }}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              <span className="text-muted-foreground mr-2">{acc.code}</span>
                              {acc.name}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {acc.nature}
                        </Badge>
                      </label>
                    );
                  })}
                  {coreToggleable.length === 0 && (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Nenhuma conta folha do padrão para ocultar.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* STEP 3 — Add custom */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Adicione contas específicas da sua operação. O código é gerado automaticamente.
                </p>
                <Button size="sm" variant="outline" onClick={addDraft} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              <ScrollArea className="h-[340px] rounded-md border">
                <div className="p-3 space-y-3">
                  {drafts.length === 0 && (
                    <div className="py-12 text-center space-y-3">
                      <Sparkles className="h-8 w-8 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-sm font-medium">Nenhuma conta personalizada ainda</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Você pode pular esta etapa e adicionar depois pelo botão "Nova Conta".
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={addDraft} className="gap-1">
                        <Plus className="h-4 w-4" />
                        Adicionar primeira conta
                      </Button>
                    </div>
                  )}

                  {drafts.map((d, idx) => (
                    <div key={d.uid} className="rounded-md border p-3 space-y-2 bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Conta #{idx + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDraft(d.uid)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-12 sm:col-span-5">
                          <Label className="text-xs">Nome *</Label>
                          <Input
                            value={d.name}
                            onChange={(e) => updateDraft(d.uid, { name: e.target.value })}
                            placeholder="Ex.: Tráfego pago - Meta Ads"
                            className="h-8"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-4">
                          <Label className="text-xs">Conta-pai *</Label>
                          <Select
                            value={d.parent_id}
                            onValueChange={(v) => updateDraft(d.uid, { parent_id: v })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {parentOptions.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  <span className="text-muted-foreground mr-2">{p.code}</span>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-12 sm:col-span-3">
                          <Label className="text-xs">Natureza</Label>
                          <Select
                            value={d.nature}
                            onValueChange={(v: any) => updateDraft(d.uid, { nature: v })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RECEITA">Receita</SelectItem>
                              <SelectItem value="DESPESA">Despesa</SelectItem>
                              <SelectItem value="ATIVO">Ativo</SelectItem>
                              <SelectItem value="PASSIVO">Passivo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <Switch
                            checked={d.in_dre}
                            onCheckedChange={(v) => updateDraft(d.uid, { in_dre: v })}
                          />
                          Aparece no DRE
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <Switch
                            checked={d.in_cashflow}
                            onCheckedChange={(v) => updateDraft(d.uid, { in_cashflow: v })}
                          />
                          Fluxo de Caixa
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {drafts.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {validDrafts.length} de {drafts.length} prontas para criar (linhas sem nome ou pai
                  serão ignoradas).
                </p>
              )}
            </div>
          )}

          {/* STEP 4 — Done */}
          {step === 4 && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Plano configurado com sucesso!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Você pode continuar refinando a qualquer momento na aba Plano de Contas.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {step === 4 ? (
            <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Fechar
            </Button>
          ) : (
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep((s) => (s - 1) as Step)}
                    disabled={saving}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                )}
                {step < 3 && (
                  <Button onClick={() => setStep((s) => (s + 1) as Step)}>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                {step === 3 && (
                  <Button onClick={handleFinish} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        Concluir
                        <CheckCircle2 className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function shouldAutoOpenOnboarding(customCount: number) {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(COMPLETION_KEY)) return false;
  return customCount === 0;
}
