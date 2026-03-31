import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, Pencil, X, CreditCard, Link2 } from "lucide-react";
import { toast } from "sonner";

interface RateRow {
  id: string;
  installments: number;
  rate_percent: number;
  active: boolean;
}

function useEditableRate(tableName: string, queryKey: string) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: rates, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .order("installments");
      if (error) throw error;
      return (data || []) as unknown as RateRow[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, rate_percent }: { id: string; rate_percent: number }) => {
      const { error } = await supabase
        .from(tableName as any)
        .update({ rate_percent, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("Taxa atualizada com sucesso!");
      setEditingId(null);
    },
    onError: () => toast.error("Erro ao atualizar taxa"),
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

  return { rates, isLoading, editingId, editValue, setEditValue, startEdit, cancelEdit, saveEdit, handleKeyDown };
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
  const card = useEditableRate("credit_card_rates", "card-rates-all");
  const link = useEditableRate("payment_link_rates", "link-rates-all");

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
        <CardContent>
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
        <CardContent>
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
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
