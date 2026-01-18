import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import { OFXTransaction, formatAmountForForm } from "@/lib/ofx-parser";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OFXImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: OFXTransaction[];
  onSelectTransaction: (transaction: OFXTransaction) => void;
}

export function OFXImportDialog({ 
  open, 
  onOpenChange, 
  transactions,
  onSelectTransaction
}: OFXImportDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleCreateEntry = (tx: OFXTransaction) => {
    onSelectTransaction(tx);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const totalDebits = transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transações Importadas do OFX</DialogTitle>
          <DialogDescription>
            Selecione uma transação para criar um lançamento de conta a pagar ou receber
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Transações</p>
              <p className="text-lg font-bold">{transactions.length}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <p className="text-xs text-muted-foreground">Débitos</p>
              <p className="text-lg font-bold text-red-600">
                R$ {formatAmountForForm(totalDebits)}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-xs text-muted-foreground">Créditos</p>
              <p className="text-lg font-bold text-green-600">
                R$ {formatAmountForForm(totalCredits)}
              </p>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-24">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma transação encontrada no arquivo OFX
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx, index) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>{formatDate(tx.date)}</TableCell>
                      <TableCell>
                        {tx.type === 'DEBIT' ? (
                          <Badge variant="outline" className="gap-1 text-red-600 border-red-200">
                            <ArrowDownCircle className="h-3 w-3" />
                            Débito
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
                            <ArrowUpCircle className="h-3 w-3" />
                            Crédito
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={tx.description}>
                        {tx.description}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                        R$ {formatAmountForForm(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCreateEntry(tx)}
                        >
                          Lançar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
