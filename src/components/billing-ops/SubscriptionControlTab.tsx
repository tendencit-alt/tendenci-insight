import { useState } from "react";
import { useBillingOpsOverview } from "@/hooks/useBillingOps";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BillingActionDialog } from "./BillingActionDialog";

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  trial: "bg-blue-500/10 text-blue-500",
  past_due: "bg-yellow-500/10 text-yellow-500",
  suspended: "bg-orange-500/10 text-orange-500",
  cancelled: "bg-red-500/10 text-red-500",
};

const riskColors: Record<string, string> = {
  low: "bg-green-500/10 text-green-500",
  medium: "bg-yellow-500/10 text-yellow-500",
  high: "bg-red-500/10 text-red-500",
  lost: "bg-muted text-muted-foreground",
};

export function SubscriptionControlTab() {
  const { data, isLoading } = useBillingOpsOverview();
  const [selected, setSelected] = useState<any>(null);
  const [action, setAction] = useState<string>("activate");
  const [open, setOpen] = useState(false);

  const openAction = (row: any, act: string) => {
    setSelected(row);
    setAction(act);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Subscription Control Center</h2>
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} empresas</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mensal</TableHead>
                <TableHead>Próxima cobrança</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : !data?.length ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma empresa</TableCell></TableRow>
              ) : data.map((row: any) => (
                <TableRow key={row.tenant_id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{row.tenant_name}</div>
                  </TableCell>
                  <TableCell>{row.plan_name ?? "—"}</TableCell>
                  <TableCell>
                    {row.subscription_status ? (
                      <Badge className={statusColors[row.subscription_status] ?? ""}>{row.subscription_status}</Badge>
                    ) : <span className="text-muted-foreground">sem assinatura</span>}
                  </TableCell>
                  <TableCell>R$ {Number(row.monthly_value ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-sm">
                    {row.next_invoice_date ? new Date(row.next_invoice_date).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.payment_status}</Badge>
                    {row.open_dunning_steps > 0 && (
                      <Badge variant="destructive" className="ml-1">{row.open_dunning_steps} alerta(s)</Badge>
                    )}
                  </TableCell>
                  <TableCell><Badge className={riskColors[row.churn_risk] ?? ""}>{row.churn_risk}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openAction(row, "activate")}>Ativar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAction(row, "suspend")}>Suspender</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAction(row, "pause_billing")}>Pausar cobrança</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAction(row, "change_plan")}>Alterar plano</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAction(row, "apply_discount")}>Aplicar desconto</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAction(row, "grant_temporary_access")}>Liberar acesso temporário</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BillingActionDialog
        open={open}
        onOpenChange={setOpen}
        tenant={selected}
        initialAction={action}
      />
    </div>
  );
}
