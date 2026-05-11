import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Calendar, Database, FileText, Info } from "lucide-react";

interface DeletedRecord {
  id: string;
  original_table: string;
  original_id: string;
  original_data: Record<string, unknown>;
  deleted_by: string | null;
  deleted_by_name: string | null;
  deleted_at: string;
  deletion_reason: string | null;
  record_type: string;
  record_identifier: string | null;
}

interface DeletedRecordDetailDialogProps {
  record: DeletedRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  order: "Pedido",
  deal: "Negócio CRM",
  architect: "Profissional Parceiro",
  goal: "Meta",
  user: "Usuário",
  bank_account: "Conta Bancária",
  chart_account: "Plano de Contas",
  cost_center: "Centro de Custo",
  project: "Projeto Financeiro",
  task: "Tarefa",
  lead: "Lead",
  client: "Cliente",
  supplier: "Fornecedor",
  payable: "Conta a Pagar",
  receivable: "Conta a Receber",
  ledger_entry: "Lançamento",
};

const RECORD_TYPE_COLORS: Record<string, string> = {
  order: "bg-blue-100 text-blue-800",
  deal: "bg-purple-100 text-purple-800",
  architect: "bg-green-100 text-green-800",
  goal: "bg-yellow-100 text-yellow-800",
  user: "bg-red-100 text-red-800",
  bank_account: "bg-cyan-100 text-cyan-800",
  chart_account: "bg-indigo-100 text-indigo-800",
  cost_center: "bg-orange-100 text-orange-800",
  project: "bg-pink-100 text-pink-800",
  task: "bg-teal-100 text-teal-800",
  lead: "bg-lime-100 text-lime-800",
  client: "bg-amber-100 text-amber-800",
  supplier: "bg-emerald-100 text-emerald-800",
  payable: "bg-rose-100 text-rose-800",
  receivable: "bg-sky-100 text-sky-800",
  ledger_entry: "bg-violet-100 text-violet-800",
};

export function DeletedRecordDetailDialog({
  record,
  open,
  onOpenChange,
}: DeletedRecordDetailDialogProps) {
  if (!record) return null;

  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    if (key.includes("date") || key.includes("_at")) {
      try {
        return format(new Date(String(value)), "dd/MM/yyyy HH:mm", { locale: ptBR });
      } catch {
        return String(value);
      }
    }
    if (key.includes("value") || key.includes("amount") || key.includes("price")) {
      const num = Number(value);
      if (!isNaN(num)) {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(num);
      }
    }
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Registro Excluído
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                Tipo de Registro
              </div>
              <Badge className={RECORD_TYPE_COLORS[record.record_type] || "bg-gray-100 text-gray-800"}>
                {RECORD_TYPE_LABELS[record.record_type] || record.record_type}
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                Identificador
              </div>
              <p className="font-medium">{record.record_identifier || "-"}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                Excluído por
              </div>
              <p className="font-medium">{record.deleted_by_name || "Sistema"}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Data da Exclusão
              </div>
              <p className="font-medium">
                {format(new Date(record.deleted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Deletion Reason */}
          {record.deletion_reason && (
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-1">Motivo da Exclusão:</p>
              <p className="text-sm">{record.deletion_reason}</p>
            </div>
          )}

          {/* Original Data */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Dados Originais
            </h4>
            <ScrollArea className="h-[300px] rounded-lg border p-4">
              <div className="space-y-2">
                {Object.entries(record.original_data).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-2 py-2 border-b last:border-0">
                    <span className="text-sm font-medium text-muted-foreground truncate">
                      {key}
                    </span>
                    <span className="text-sm col-span-2 break-words">
                      {formatValue(key, value)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Technical Info */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p><strong>Tabela original:</strong> {record.original_table}</p>
            <p><strong>ID original:</strong> {record.original_id}</p>
            <p><strong>ID do registro:</strong> {record.id}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
