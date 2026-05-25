import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, FileText, Loader2 } from "lucide-react";

interface LoanContract {
  id: string;
  contract_number: string;
  bank_name: string;
  principal_amount: number;
  interest_rate: number | null;
  start_date: string;
  end_date: string | null;
  installments: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export function LoanContractsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<LoanContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    contract_number: "",
    bank_name: "",
    principal_amount: "",
    interest_rate: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    installments: "",
    status: "ATIVO",
    notes: "",
  });

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["fin-loan-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_loan_contracts")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as LoanContract[];
    },
  });

  const handleOpenDialog = (contract?: LoanContract) => {
    if (contract) {
      setSelectedContract(contract);
      setForm({
        contract_number: contract.contract_number,
        bank_name: contract.bank_name,
        principal_amount: contract.principal_amount.toString(),
        interest_rate: contract.interest_rate?.toString() || "",
        start_date: contract.start_date,
        end_date: contract.end_date || "",
        installments: contract.installments?.toString() || "",
        status: contract.status,
        notes: contract.notes || "",
      });
    } else {
      setSelectedContract(null);
      setForm({
        contract_number: "",
        bank_name: "",
        principal_amount: "",
        interest_rate: "",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: "",
        installments: "",
        status: "ATIVO",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.contract_number || !form.bank_name || !form.principal_amount || !form.start_date) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        contract_number: form.contract_number,
        bank_name: form.bank_name,
        principal_amount: parseFloat(form.principal_amount.replace(",", ".")),
        interest_rate: form.interest_rate ? parseFloat(form.interest_rate.replace(",", ".")) : null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        installments: form.installments ? parseInt(form.installments) : null,
        status: form.status,
        notes: form.notes || null,
      };

      if (selectedContract) {
        const { error } = await supabase
          .from("fin_loan_contracts")
          .update(payload)
          .eq("id", selectedContract.id);
        if (error) throw error;
        toast.success("Contrato atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("fin_loan_contracts")
          .insert(payload);
        if (error) throw error;
        toast.success("Contrato criado com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: ["fin-loan-contracts"] });
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedContract) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("fin_loan_contracts")
        .delete()
        .eq("id", selectedContract.id);
      
      if (error) throw error;
      
      toast.success("Contrato excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["fin-loan-contracts"] });
      setDeleteDialogOpen(false);
      setSelectedContract(null);
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ATIVO":
        return <Badge className="bg-green-600">Ativo</Badge>;
      case "QUITADO":
        return <Badge className="bg-blue-600">Quitado</Badge>;
      case "CANCELADO":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Contratos de Empréstimo
        </CardTitle>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Contrato</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead className="text-right">Valor Principal</TableHead>
                <TableHead>Taxa (%)</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts?.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">{contract.contract_number}</TableCell>
                  <TableCell>{contract.bank_name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(contract.principal_amount)}</TableCell>
                  <TableCell>{contract.interest_rate ? `${contract.interest_rate}%` : "-"}</TableCell>
                  <TableCell>{format(new Date(contract.start_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{getStatusBadge(contract.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(contract)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedContract(contract);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!contracts || contracts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum contrato cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedContract ? "Editar Contrato" : "Novo Contrato de Empréstimo"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Contrato *</Label>
                <Input
                  value={form.contract_number}
                  onChange={(e) => setForm({ ...form, contract_number: e.target.value })}
                  placeholder="Ex: 12345"
                />
              </div>
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Input
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="Ex: Banco do Brasil"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Principal *</Label>
                <Input
                  value={form.principal_amount}
                  onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de Juros (% a.m.)</Label>
                <Input
                  value={form.interest_rate}
                  onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                  placeholder="1,5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <DateBrInput
                  value={form.start_date}
                  onChange={(iso) => setForm({ ...form, start_date: iso })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <DateBrInput
                  value={form.end_date}
                  onChange={(iso) => setForm({ ...form, end_date: iso })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Parcelas</Label>
                <Input
                  type="number"
                  value={form.installments}
                  onChange={(e) => setForm({ ...form, installments: e.target.value })}
                  placeholder="12"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="QUITADO">Quitado</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observações sobre o contrato..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedContract ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contrato "{selectedContract?.contract_number}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}