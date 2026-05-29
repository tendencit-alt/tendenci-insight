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

  return { rates, isLoading, editingId, editValue, setEditValue, startEdit, cancelEdit, saveEdit, handleKeyDown, createMutation, deleteMutation };
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
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Parcelas</TableHead>
          <TableHead>Taxa (%)</TableHead>
          <TableHead className="w-[100px] text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rates.map((rate) => (
          <TableRow key={rate.id}>
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
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(rate)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
        {rates.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export function CardRatesManager() {
  const queryClient = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  const card = useEditableRate("credit_card_rates", "card-rates-all");
  const link = useEditableRate("payment_link_rates", "link-rates-all");

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

  if (card.isLoading || link.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
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
            <p className="text-sm text-muted-foreground">Nenhuma taxa de débito cadastrada.</p>
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
          <RatesTable
            rates={creditRates}
            editingId={card.editingId}
            editValue={card.editValue}
            setEditValue={card.setEditValue}
            startEdit={card.startEdit}
            cancelEdit={card.cancelEdit}
            saveEdit={card.saveEdit}
            handleKeyDown={card.handleKeyDown}
            emptyMessage="Nenhuma taxa de crédito cadastrada."
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
        <CardContent>
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
          <RatesTable
            rates={linkRates}
            editingId={link.editingId}
            editValue={link.editValue}
            setEditValue={link.setEditValue}
            startEdit={link.startEdit}
            cancelEdit={link.cancelEdit}
            saveEdit={link.saveEdit}
            handleKeyDown={link.handleKeyDown}
            emptyMessage="Nenhuma taxa de link de pagamento cadastrada."
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
