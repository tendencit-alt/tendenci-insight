import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  rascunho: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: Clock },
  solicitado: { label: "Solicitado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Clock },
  em_revisao: { label: "Em Revisão", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: AlertTriangle },
  aprovado: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle2 },
  rejeitado: { label: "Rejeitado", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
  liberado: { label: "Liberado", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", icon: CheckCircle2 },
  executado: { label: "Executado", color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
  cancelado: { label: "Cancelado", color: "bg-muted text-muted-foreground", icon: XCircle },
};

const URGENCY_CONFIG: Record<string, string> = {
  baixa: "text-muted-foreground",
  normal: "text-foreground",
  alta: "text-yellow-600",
  critica: "text-red-600 font-bold",
};

export function ApprovalQueue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pendentes");
  const [search, setSearch] = useState("");
  const [actionDialog, setActionDialog] = useState<{ instance: any; action: string } | null>(null);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState(false);

  const { data: instances, isLoading } = useQuery({
    queryKey: ["approval-instances", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("approval_instances")
        .select("*, rule:approval_rules(module, trigger_type, description)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter === "pendentes") {
        query = query.in("status", ["solicitado", "em_revisao"]);
      } else if (statusFilter !== "todos") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: steps } = useQuery({
    queryKey: ["approval-steps", actionDialog?.instance?.id],
    queryFn: async () => {
      if (!actionDialog?.instance?.id) return [];
      const { data } = await supabase
        .from("approval_steps")
        .select("*")
        .eq("instance_id", actionDialog.instance.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!actionDialog?.instance?.id,
  });

  const handleAction = async () => {
    if (!actionDialog || !user) return;
    setActing(true);
    try {
      const { instance, action } = actionDialog;
      const statusMap: Record<string, string> = {
        revisar: "em_revisao",
        aprovar: "aprovado",
        rejeitar: "rejeitado",
        liberar: "liberado",
        executar: "executado",
        cancelar: "cancelado",
      };
      const stepMap: Record<string, string> = {
        revisar: "revisao",
        aprovar: "aprovacao",
        rejeitar: "rejeicao",
        liberar: "aprovacao",
        executar: "execucao",
        cancelar: "cancelamento",
      };

      const newStatus = statusMap[action];

      const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (action === "aprovar" || action === "liberar") updateData.approved_at = new Date().toISOString();
      if (action === "executar") updateData.executed_at = new Date().toISOString();
      if (action === "cancelar") updateData.cancelled_at = new Date().toISOString();
      if (action === "rejeitar") updateData.rejection_reason = comment;

      const { error: updateError } = await supabase
        .from("approval_instances")
        .update(updateData)
        .eq("id", instance.id);

      if (updateError) throw updateError;

      await supabase.from("approval_steps").insert({
        instance_id: instance.id,
        step_type: stepMap[action],
        actor_id: user.id,
        from_status: instance.status,
        to_status: newStatus,
        comment: comment || null,
      });

      toast.success(`Workflow ${statusMap[action]} com sucesso`);
      queryClient.invalidateQueries({ queryKey: ["approval-instances"] });
      setActionDialog(null);
      setComment("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActing(false);
    }
  };

  const filtered = (instances || []).filter((i) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      i.description?.toLowerCase().includes(s) ||
      i.source_table?.toLowerCase().includes(s) ||
      (i as any).rule?.trigger_type?.toLowerCase().includes(s)
    );
  });

  const pendingCount = (instances || []).filter((i) => ["solicitado", "em_revisao"].includes(i.status)).length;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{(instances || []).filter(i => i.status === "aprovado").length}</p>
          <p className="text-xs text-muted-foreground">Aprovados</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{(instances || []).filter(i => i.status === "rejeitado").length}</p>
          <p className="text-xs text-muted-foreground">Rejeitados</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{(instances || []).filter(i => i.status === "executado").length}</p>
          <p className="text-xs text-muted-foreground">Executados</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendentes">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="rejeitado">Rejeitados</SelectItem>
            <SelectItem value="executado">Executados</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Urgência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum item encontrado</TableCell></TableRow>
              ) : filtered.map((inst) => {
                const cfg = STATUS_CONFIG[inst.status] || STATUS_CONFIG.rascunho;
                const Icon = cfg.icon;
                return (
                  <TableRow key={inst.id} className="cursor-pointer" onClick={() => setActionDialog({ instance: inst, action: "" })}>
                    <TableCell className="text-xs">{format(new Date(inst.created_at), "dd/MM/yy HH:mm")}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{(inst as any).rule?.module || "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{(inst as any).rule?.trigger_type || "—"}</TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate">{inst.description || "—"}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {inst.amount ? Number(inst.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                    </TableCell>
                    <TableCell><span className={`text-xs ${URGENCY_CONFIG[inst.urgency || "normal"]}`}>{inst.urgency || "normal"}</span></TableCell>
                    <TableCell><Badge className={`${cfg.color} text-xs`}><Icon className="h-3 w-3 mr-1" />{cfg.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      {["solicitado", "em_revisao"].includes(inst.status) && (
                        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setActionDialog({ instance: inst, action: "aprovar" })}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Aprovar
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => setActionDialog({ instance: inst, action: "rejeitar" })}>
                            <XCircle className="h-3 w-3 mr-1" />Rejeitar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      {actionDialog && (
        <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setComment(""); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {actionDialog.action ? `Confirmar: ${actionDialog.action}` : "Detalhes do Workflow"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Módulo:</span> <span className="font-medium">{(actionDialog.instance as any).rule?.module}</span></div>
                <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{(actionDialog.instance as any).rule?.trigger_type}</span></div>
                <div><span className="text-muted-foreground">Valor:</span> <span className="font-medium">{actionDialog.instance.amount ? Number(actionDialog.instance.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</span></div>
                <div><span className="text-muted-foreground">Urgência:</span> <span className="font-medium">{actionDialog.instance.urgency}</span></div>
              </div>
              {actionDialog.instance.description && (
                <p className="text-sm bg-muted p-2 rounded">{actionDialog.instance.description}</p>
              )}

              {/* Timeline */}
              {steps && steps.length > 0 && (
                <div className="border rounded p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Histórico</p>
                  {steps.map((s: any) => (
                    <div key={s.id} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground whitespace-nowrap">{format(new Date(s.created_at), "dd/MM HH:mm")}</span>
                      <Badge variant="outline" className="text-[10px]">{s.step_type}</Badge>
                      {s.comment && <span className="text-muted-foreground">— {s.comment}</span>}
                    </div>
                  ))}
                </div>
              )}

              {actionDialog.action && (
                <div className="space-y-2">
                  <Textarea
                    placeholder={actionDialog.action === "rejeitar" ? "Motivo da rejeição *" : "Comentário (opcional)"}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              {!actionDialog.action && ["solicitado", "em_revisao"].includes(actionDialog.instance.status) && (
                <div className="flex gap-2 w-full">
                  <Button className="flex-1" onClick={() => setActionDialog({ ...actionDialog, action: "aprovar" })}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />Aprovar
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => setActionDialog({ ...actionDialog, action: "rejeitar" })}>
                    <XCircle className="h-4 w-4 mr-1" />Rejeitar
                  </Button>
                </div>
              )}
              {actionDialog.action && (
                <div className="flex gap-2 w-full">
                  <Button variant="outline" onClick={() => setActionDialog({ ...actionDialog, action: "" })}>Voltar</Button>
                  <Button
                    onClick={handleAction}
                    disabled={acting || (actionDialog.action === "rejeitar" && !comment)}
                    className="flex-1"
                    variant={actionDialog.action === "rejeitar" ? "destructive" : "default"}
                  >
                    {acting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Confirmar {actionDialog.action}
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
