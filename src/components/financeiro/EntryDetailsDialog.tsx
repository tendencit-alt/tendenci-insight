import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Building2, 
  FolderOpen, 
  User, 
  CreditCard,
  Hash,
  MessageSquare,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface EntryDetailsDialogProps {
  entryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntryDetailsDialog({ entryId, open, onOpenChange }: EntryDetailsDialogProps) {
  const { data: entry, isLoading } = useQuery({
    queryKey: ["fin-entry-details", entryId],
    queryFn: async () => {
      if (!entryId) return null;
      
      const { data, error } = await supabase
        .from("fin_ledger_entries")
        .select(`
          *,
          chart_account:fin_chart_accounts(code, name),
          cost_center:fin_cost_centers(code, name),
          project:fin_projects(name),
          bank_account:fin_bank_accounts(nickname)
        `)
        .eq("id", entryId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!entryId && open,
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case "RECEITA": return "bg-green-500";
      case "DESPESA": return "bg-red-500";
      default: return "bg-muted";
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "PAGO": return "bg-green-600";
      case "PENDENTE": return "bg-yellow-600";
      case "CANCELADO": return "bg-red-600";
      default: return "bg-muted";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Lançamento
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : entry ? (
          <div className="space-y-4">
            {/* Header with Type and Status */}
            <div className="flex items-center justify-between">
              <Badge className={cn("gap-1", getTypeColor(entry.type))}>
                {entry.type === "RECEITA" ? "Receita" : entry.type === "DESPESA" ? "Despesa" : entry.type}
              </Badge>
              <Badge variant="outline" className={cn("gap-1", getStatusColor(entry.status))}>
                {entry.status}
              </Badge>
            </div>

            {/* Description */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">{entry.description}</p>
              {entry.notes && (
                <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
              )}
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Valor</span>
              </div>
              <span className={cn(
                "text-xl font-bold",
                entry.type === "RECEITA" ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(entry.amount)}
              </span>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid gap-3 text-sm">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Competência</p>
                    <p className="font-medium">{formatDate(entry.competence_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Caixa</p>
                    <p className="font-medium">{formatDate(entry.cash_date)}</p>
                  </div>
                </div>
              </div>

              {/* Chart Account */}
              {entry.chart_account && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Conta Contábil</p>
                    <p className="font-medium">
                      <span className="font-mono text-muted-foreground">{entry.chart_account.code}</span>
                      {" - "}{entry.chart_account.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Cost Center */}
              {entry.cost_center && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Centro de Custo</p>
                    <p className="font-medium">
                      {entry.cost_center.code && <span className="font-mono text-muted-foreground">{entry.cost_center.code} - </span>}
                      {entry.cost_center.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Project */}
              {entry.project && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Projeto</p>
                    <p className="font-medium">{entry.project.name}</p>
                  </div>
                </div>
              )}

              {/* Bank Account */}
              {entry.bank_account && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Conta Bancária</p>
                    <p className="font-medium">{entry.bank_account.nickname}</p>
                  </div>
                </div>
              )}

              {/* Document Number */}
              {entry.document_number && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nº Documento</p>
                    <p className="font-medium font-mono">{entry.document_number}</p>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              {entry.payment_method && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
                    <p className="font-medium">{entry.payment_method}</p>
                  </div>
                </div>
              )}

              {/* Party */}
              {entry.party_type && entry.party_id && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {entry.party_type === "cliente" ? "Cliente" : 
                       entry.party_type === "fornecedor" ? "Fornecedor" : "Parte"}
                    </p>
                    <p className="font-medium text-muted-foreground text-xs">ID: {entry.party_id}</p>
                  </div>
                </div>
              )}

              {/* Installments */}
              {entry.total_installments && entry.total_installments > 1 && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Parcela</p>
                    <p className="font-medium">{entry.installment_number}/{entry.total_installments}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with timestamps */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p>Criado em: {entry.created_at ? format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</p>
              {entry.updated_at && entry.updated_at !== entry.created_at && (
                <p>Atualizado em: {format(new Date(entry.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">Lançamento não encontrado</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
