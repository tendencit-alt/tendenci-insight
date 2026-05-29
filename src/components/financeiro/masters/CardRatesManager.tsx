import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Pencil, X, CreditCard, Link2, Building2, Plus, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { QuickCreateSupplierDialog } from "@/components/financeiro/QuickCreateSupplierDialog";
import { useActiveTenant } from "@/hooks/useActiveTenant";

interface RateRow {
  id: string;
  installments: number;
  rate_percent: number;
  active: boolean;
  carencia_dias?: number;
}

interface FeeSupplierConfig {
  id: string;
  fee_type: string;
  supplier_id: string | null;
  chart_account_id: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
}

function useEditableRate(tableName: string, queryKey: string, tenantId: string | null | undefined, hasCarencia = false) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: rates, isLoading } = useQuery({
    queryKey: [queryKey, tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order(hasCarencia ? "carencia_dias" : "installments");
      if (error) throw error;
      return (data || []) as unknown as RateRow[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey, tenantId] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, rate_percent }: { id: string; rate_percent: number }) => {
      const { error } = await supabase
        .from(tableName as any)
        .update({ rate_percent, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Taxa atualizada com sucesso!");
      setEditingId(null);
    },
    onError: (e: any) => toast.error("Erro ao atualizar taxa: " + (e?.message || "")),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { installments: number; rate_percent: number; carencia_dias?: number }) => {
      if (!tenantId) throw new Error("Tenant não selecionado");
      const row: any = { ...payload, active: true, tenant_id: tenantId };
      const { error } = await supabase.from(tableName as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Taxa adicionada!");
    },
    onError: (e: any) => toast.error("Erro ao adicionar: " + (e?.message || "")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Taxa removida!");
    },
    onError: (e: any) => toast.error("Erro ao remover: " + (e?.message || "")),
  });

  const startEdit = (rate: RateRow) => {
    setEditingId(rate.id);
    setEditValue(String(rate.rate_percent).replace(".", ","));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = (id: string) => {
    const parsed = parseFloat(editValue.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Informe uma taxa válida");
      return;
    }
    updateMutation.mutate({ id, rate_percent: parsed });
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") saveEdit(id);
    if (e.key === "Escape") cancelEdit();
  };

  return { rates, isLoading, editingId, editValue, setEditValue, startEdit, cancelEdit, saveEdit, handleKeyDown, createMutation, updateMutation, deleteMutation };
}

function FeeSupplierSelector({ feeType, label, configs, suppliers, chartAccounts, onUpdate, onUpdateChartAccount, onRefreshSuppliers }: {
  feeType: string;
  label: string;
  configs: FeeSupplierConfig[];
  suppliers: Supplier[];
  chartAccounts: ChartAccount[];
  onUpdate: (feeType: string, supplierId: string | null) => void;
  onUpdateChartAccount: (feeType: string, chartAccountId: string | null) => void;
  onRefreshSuppliers: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const config = configs.find(c => c.fee_type === feeType);
  const currentSupplier = config?.supplier_id || "";
  const currentChartAccount = config?.chart_account_id || "";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 py-2 px-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{label}:</span>
          <Select
            value={currentSupplier || "none"}
            onValueChange={(v) => onUpdate(feeType, v === "none" ? null : v)}
          >
            <SelectTrigger className="h-8 flex-1 max-w-[260px]">
              <SelectValue placeholder="Selecionar fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum fornecedor</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 shrink-0"
            onClick={() => setShowCreate(true)}
            title="Criar novo fornecedor"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">Plano de Contas:</span>
          <Select
            value={currentChartAccount || "none"}
            onValueChange={(v) => onUpdateChartAccount(feeType, v === "none" ? null : v)}
          >
            <SelectTrigger className="h-8 flex-1 max-w-[320px]">
              <SelectValue placeholder="Selecionar plano de contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum plano de contas</SelectItem>
              {chartAccounts.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <QuickCreateSupplierDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(supplierId) => {
          onRefreshSuppliers();
          onUpdate(feeType, supplierId);
        }}
      />
    </>
  );
}

function RatesTable({
  rates,
  editingId,
  editValue,
  setEditValue,
  startEdit,
  cancelEdit,
  saveEdit,
  handleKeyDown,
  emptyMessage,
  onDelete,
  onCreate,
  hasCarencia = false,
  installmentsLabel = "Parcelas",
}: {
  rates: RateRow[];
  editingId: string | null;
  editValue: string;
  setEditValue: (v: string) => void;
  startEdit: (r: RateRow) => void;
  cancelEdit: () => void;
  saveEdit: (id: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, id: string) => void;
  emptyMessage: string;
  onDelete?: (id: string) => void;
  onCreate?: (payload: { installments: number; rate_percent: number; carencia_dias?: number }) => void;
  hasCarencia?: boolean;
  installmentsLabel?: string;
}) {
  const [newInstallments, setNewInstallments] = useState("");
  const [newCarencia, setNewCarencia] = useState("");
  const [newRate, setNewRate] = useState("");

  const handleAdd = () => {
    const inst = parseInt(newInstallments, 10);
    const rate = parseFloat(newRate.replace(",", "."));
    const carencia = hasCarencia ? parseInt(newCarencia, 10) : undefined;
    if (isNaN(inst) || inst < 0) return toast.error("Informe parcelas válidas");
    if (isNaN(rate) || rate < 0) return toast.error("Informe taxa válida");
    if (hasCarencia && (isNaN(carencia!) || carencia! < 0)) return toast.error("Informe carência válida");
    onCreate?.({ installments: inst, rate_percent: rate, ...(hasCarencia ? { carencia_dias: carencia } : {}) });
    setNewInstallments(""); setNewCarencia(""); setNewRate("");
  };

  const colCount = (hasCarencia ? 1 : 0) + 3;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {hasCarencia && <TableHead className="w-[140px]">Carência (dias)</TableHead>}
          <TableHead className="w-[180px]">{installmentsLabel}</TableHead>
          <TableHead>Taxa (%)</TableHead>
          <TableHead className="w-[120px] text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rates.map((rate) => (
          <TableRow key={rate.id}>
            {hasCarencia && <TableCell className="font-medium">{rate.carencia_dias ?? 0}</TableCell>}
            <TableCell className="font-medium">
              {rate.installments === 1 ? "À vista (1x)" : `${rate.installments}x`}
            </TableCell>
            <TableCell>
              {editingId === rate.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, rate.id)}
                    className="w-24 h-8 text-sm"
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              ) : (
                <span className="font-mono">{rate.rate_percent.toFixed(2).replace(".", ",")}%</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              {editingId === rate.id ? (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(rate.id)}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(rate)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {onDelete && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(rate.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
        {rates.length === 0 && (
          <TableRow>
            <TableCell colSpan={colCount} className="text-center text-muted-foreground py-6">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
        {onCreate && (
          <TableRow className="bg-muted/30">
            {hasCarencia && (
              <TableCell>
                <Input placeholder="Ex: 30" value={newCarencia} onChange={(e) => setNewCarencia(e.target.value)} className="h-8 text-sm" />
              </TableCell>
            )}
            <TableCell>
              <Input placeholder="Ex: 1" value={newInstallments} onChange={(e) => setNewInstallments(e.target.value)} className="h-8 text-sm" />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ex: 2,99"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="w-28 h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="outline" className="h-8" onClick={handleAdd}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function DebitCreator({ onCreate }: { onCreate: (rate: number) => void }) {
  const [val, setVal] = useState("");
  const submit = () => {
    const parsed = parseFloat(val.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) return toast.error("Informe taxa válida");
    onCreate(parsed);
    setVal("");
  };
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Ex: 1,99"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-28 h-8 text-sm"
      />
      <span className="text-sm text-muted-foreground">%</span>
      <Button size="sm" variant="outline" className="h-8" onClick={submit}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
      </Button>
    </div>
  );
}

function InstallmentGrid({
  rates,
  maxInstallments = 18,
  onSave,
  onDelete,
}: {
  rates: RateRow[];
  maxInstallments?: number;
  onSave: (installments: number, ratePercent: number, existingId?: string) => void;
  onDelete: (id: string) => void;
}) {
  const byInst = new Map<number, RateRow>();
  rates.forEach((r) => byInst.set(r.installments, r));

  const [values, setValues] = useState<Record<number, string>>({});

  const getDisplay = (n: number) => {
    if (values[n] !== undefined) return values[n];
    const r = byInst.get(n);
    return r ? String(r.rate_percent).replace(".", ",") : "";
  };

  const commit = (n: number) => {
    const raw = values[n];
    if (raw === undefined) return;
    const existing = byInst.get(n);
    const trimmed = raw.trim();
    if (trimmed === "") {
      if (existing) onDelete(existing.id);
      setValues((v) => { const c = { ...v }; delete c[n]; return c; });
      return;
    }
    const parsed = parseFloat(trimmed.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      toast.error(`Taxa inválida para ${n}x`);
      return;
    }
    if (existing && existing.rate_percent === parsed) {
      setValues((v) => { const c = { ...v }; delete c[n]; return c; });
      return;
    }
    onSave(n, parsed, existing?.id);
    setValues((v) => { const c = { ...v }; delete c[n]; return c; });
  };

  const cols = Array.from({ length: maxInstallments }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
      {cols.map((n) => {
        const existing = byInst.get(n);
        return (
          <div key={n} className="flex items-center gap-1 rounded-md border bg-card p-2">
            <span className="text-xs font-semibold text-muted-foreground w-7 shrink-0">{n}x</span>
            <Input
              value={getDisplay(n)}
              onChange={(e) => setValues((v) => ({ ...v, [n]: e.target.value }))}
              onBlur={() => commit(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setValues((v) => { const c = { ...v }; delete c[n]; return c; });
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="0,00"
              className="h-8 text-sm font-mono px-2"
            />
            <span className="text-xs text-muted-foreground">%</span>
            {existing && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0"
                onClick={() => onDelete(existing.id)}
                title="Remover"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CardRatesManager() {
  const queryClient = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  const card = useEditableRate("credit_card_rates", "card-rates", activeTenantId);
  const link = useEditableRate("payment_link_rates", "link-rates", activeTenantId);
  const boleto = useEditableRate("boleto_rates", "boleto-rates", activeTenantId, true);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-for-fees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as Supplier[];
    },
  });

  const refreshSuppliers = () => queryClient.invalidateQueries({ queryKey: ["suppliers-for-fees"] });

  const { data: feeConfigs = [] } = useQuery({
    queryKey: ["fee-supplier-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_supplier_configs" as any)
        .select("*");
      if (error) throw error;
      return (data || []) as unknown as FeeSupplierConfig[];
    },
  });

  const { data: chartAccounts = [] } = useQuery({
    queryKey: ["chart-accounts-for-fees", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name")
        .eq("active", true)
        .eq("tenant_id", activeTenantId!)
        .order("code");
      if (error) throw error;
      return (data || []) as ChartAccount[];
    },
  });

  const updateFeeSupplier = useMutation({
    mutationFn: async ({ feeType, supplierId }: { feeType: string; supplierId: string | null }) => {
      const { error } = await supabase
        .from("fee_supplier_configs" as any)
        .update({ supplier_id: supplierId, updated_at: new Date().toISOString() } as any)
        .eq("fee_type", feeType);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-supplier-configs"] });
      toast.success("Fornecedor atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar fornecedor"),
  });

  const updateFeeChartAccount = useMutation({
    mutationFn: async ({ feeType, chartAccountId }: { feeType: string; chartAccountId: string | null }) => {
      const { error } = await supabase
        .from("fee_supplier_configs" as any)
        .update({ chart_account_id: chartAccountId, updated_at: new Date().toISOString() } as any)
        .eq("fee_type", feeType);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-supplier-configs"] });
      toast.success("Plano de contas atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar plano de contas"),
  });

  const handleSupplierUpdate = (feeType: string, supplierId: string | null) => {
    updateFeeSupplier.mutate({ feeType, supplierId });
  };

  const handleChartAccountUpdate = (feeType: string, chartAccountId: string | null) => {
    updateFeeChartAccount.mutate({ feeType, chartAccountId });
  };

  const debitRate = card.rates?.find((r) => r.installments === 0);
  const creditRates = card.rates?.filter((r) => r.installments > 0) || [];
  const linkRates = link.rates || [];
  const boletoRates = boleto.rates || [];

  if (card.isLoading || link.isLoading || boleto.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!activeTenantId) {
    return <p className="text-sm text-muted-foreground">Selecione um tenant ativo para gerenciar as taxas.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Debit Card Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-primary" />
            Taxa de Débito
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {debitRate ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Taxa à vista (Débito):</span>
              {card.editingId === debitRate.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={card.editValue}
                    onChange={(e) => card.setEditValue(e.target.value)}
                    onKeyDown={(e) => card.handleKeyDown(e, debitRate.id)}
                    className="w-24 h-8 text-sm"
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => card.saveEdit(debitRate.id)}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={card.cancelEdit}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm font-mono">
                    {debitRate.rate_percent.toFixed(2).replace(".", ",")}%
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => card.startEdit(debitRate)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Cadastrar taxa à vista (Débito):</span>
              <DebitCreator onCreate={(rate) => card.createMutation.mutate({ installments: 0, rate_percent: rate })} />
            </div>
          )}
          <FeeSupplierSelector
            feeType="cartao_debito"
            label="Fornecedor Débito"
            configs={feeConfigs}
            suppliers={suppliers}
            onUpdate={handleSupplierUpdate}
            onUpdateChartAccount={handleChartAccountUpdate}
            chartAccounts={chartAccounts}
            onRefreshSuppliers={refreshSuppliers}
          />
        </CardContent>
      </Card>

      {/* Credit Card Rates Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-primary" />
            Taxas de Crédito
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Informe o percentual de cada parcelamento (1x a 18x). O valor preenchido é usado para calcular automaticamente a taxa no pedido. Deixe em branco para remover.
          </p>
          <InstallmentGrid
            rates={creditRates}
            maxInstallments={18}
            onSave={(installments, rate_percent, existingId) => {
              if (existingId) card.updateMutation.mutate({ id: existingId, rate_percent });
              else card.createMutation.mutate({ installments, rate_percent });
            }}
            onDelete={(id) => card.deleteMutation.mutate(id)}
          />

          <FeeSupplierSelector
            feeType="cartao_credito"
            label="Fornecedor Crédito"
            configs={feeConfigs}
            suppliers={suppliers}
            onUpdate={handleSupplierUpdate}
            onUpdateChartAccount={handleChartAccountUpdate}
            chartAccounts={chartAccounts}
            onRefreshSuppliers={refreshSuppliers}
          />
        </CardContent>
      </Card>

      {/* Boleto Rate - supplier only */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-primary" />
            Taxa de Boleto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RatesTable
            rates={boletoRates}
            editingId={boleto.editingId}
            editValue={boleto.editValue}
            setEditValue={boleto.setEditValue}
            startEdit={boleto.startEdit}
            cancelEdit={boleto.cancelEdit}
            saveEdit={boleto.saveEdit}
            handleKeyDown={boleto.handleKeyDown}
            emptyMessage="Nenhuma taxa de boleto cadastrada."
            onCreate={(p) => boleto.createMutation.mutate(p)}
            onDelete={(id) => boleto.deleteMutation.mutate(id)}
            hasCarencia
          />
          <FeeSupplierSelector
            feeType="boleto"
            label="Fornecedor Boleto"
            configs={feeConfigs}
            suppliers={suppliers}
            onUpdate={handleSupplierUpdate}
            onUpdateChartAccount={handleChartAccountUpdate}
            chartAccounts={chartAccounts}
            onRefreshSuppliers={refreshSuppliers}
          />
        </CardContent>
      </Card>

      {/* Payment Link Rates Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5 text-primary" />
            Taxas Link de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Informe o percentual de cada parcelamento (1x a 18x) do link de pagamento. Deixe em branco para remover.
          </p>
          <InstallmentGrid
            rates={linkRates}
            maxInstallments={18}
            onSave={(installments, rate_percent, existingId) => {
              if (existingId) link.updateMutation.mutate({ id: existingId, rate_percent });
              else link.createMutation.mutate({ installments, rate_percent });
            }}
            onDelete={(id) => link.deleteMutation.mutate(id)}
          />
          <FeeSupplierSelector
            feeType="link_pagamento"
            label="Fornecedor Link"
            configs={feeConfigs}
            suppliers={suppliers}
            onUpdate={handleSupplierUpdate}
            onUpdateChartAccount={handleChartAccountUpdate}
            chartAccounts={chartAccounts}
            onRefreshSuppliers={refreshSuppliers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
