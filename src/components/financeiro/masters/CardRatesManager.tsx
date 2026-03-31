import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, Pencil, X, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface CardRate {
  id: string;
  installments: number;
  rate_percent: number;
  active: boolean;
}

export function CardRatesManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: rates, isLoading } = useQuery({
    queryKey: ["card-rates-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_card_rates")
        .select("*")
        .order("installments");
      if (error) throw error;
      return (data || []) as CardRate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, rate_percent }: { id: string; rate_percent: number }) => {
      const { error } = await supabase
        .from("credit_card_rates")
        .update({ rate_percent, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-rates-all"] });
      toast.success("Taxa atualizada com sucesso!");
      setEditingId(null);
    },
    onError: () => toast.error("Erro ao atualizar taxa"),
  });

  const debitRate = rates?.find((r) => r.installments === 0);
  const creditRates = rates?.filter((r) => r.installments > 0) || [];

  const startEdit = (rate: CardRate) => {
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

  if (isLoading) {
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
              {editingId === debitRate.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, debitRate.id)}
                    className="w-24 h-8 text-sm"
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(debitRate.id)}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm font-mono">
                    {debitRate.rate_percent.toFixed(2).replace(".", ",")}%
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(debitRate)}>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Parcelas</TableHead>
                <TableHead>Taxa (%)</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditRates.map((rate) => (
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
                      <span className="font-mono">
                        {rate.rate_percent.toFixed(2).replace(".", ",")}%
                      </span>
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
              {creditRates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Nenhuma taxa de crédito cadastrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
