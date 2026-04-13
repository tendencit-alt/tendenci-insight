import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Loader2, CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  em_andamento: { label: "Em andamento", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  aguardando_terceiro: { label: "Aguardando", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  concluida: { label: "Concluída", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  cancelada: { label: "Cancelada", color: "bg-muted text-muted-foreground" },
  expirada: { label: "Expirada", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "text-muted-foreground" },
  media: { label: "Média", color: "text-foreground" },
  alta: { label: "Alta", color: "text-orange-600 font-medium" },
  critica: { label: "Crítica", color: "text-red-600 font-bold" },
};

type View = "minhas" | "equipe" | "vencidas" | "criticas";

export function TaskCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("minhas");
  const [statusFilter, setStatusFilter] = useState("pendentes");
  const [moduleFilter, setModuleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [detailTask, setDetailTask] = useState<any>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["erp-tasks", view, statusFilter, moduleFilter],
    queryFn: async () => {
      let query = supabase
        .from("erp_tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(300);

      if (view === "minhas" && user) {
        query = query.eq("assignee_id", user.id);
      }
      if (view === "vencidas") {
        query = query.lt("due_date", new Date().toISOString()).in("status", ["pendente", "em_andamento"]);
      }
      if (view === "criticas") {
        query = query.eq("priority", "critica").in("status", ["pendente", "em_andamento"]);
      }

      if (statusFilter === "pendentes") {
        query = query.in("status", ["pendente", "em_andamento", "aguardando_terceiro"]);
      } else if (statusFilter !== "todos") {
        query = query.eq("status", statusFilter);
      }

      if (moduleFilter) query = query.eq("module", moduleFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = async (taskId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === "concluida") {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user?.id;
      }
      const { error } = await supabase.from("erp_tasks").update(updateData).eq("id", taskId);
      if (error) throw error;
      toast.success("Tarefa atualizada");
      queryClient.invalidateQueries({ queryKey: ["erp-tasks"] });
      setDetailTask(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = (tasks || []).filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return t.title?.toLowerCase().includes(s) || t.category?.toLowerCase().includes(s) || t.description?.toLowerCase().includes(s);
  });

  const pendingCount = (tasks || []).filter(t => t.status === "pendente").length;
  const overdueCount = (tasks || []).filter(t => t.due_date && new Date(t.due_date) < new Date() && ["pendente", "em_andamento"].includes(t.status)).length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{(tasks || []).length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          <p className="text-xs text-muted-foreground">Vencidas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{(tasks || []).filter(t => t.status === "concluida").length}</p>
          <p className="text-xs text-muted-foreground">Concluídas</p>
        </CardContent></Card>
      </div>

      {/* Views & Filters */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: "minhas", label: "Minhas Tarefas", icon: ListTodo },
          { key: "vencidas", label: "Vencidas", icon: AlertTriangle },
          { key: "criticas", label: "Críticas", icon: AlertTriangle },
          { key: "equipe", label: "Equipe", icon: ListTodo },
        ] as const).map((v) => (
          <Button key={v.key} variant={view === v.key ? "default" : "outline"} size="sm" onClick={() => setView(v.key)} className="h-8">
            <v.icon className="h-3.5 w-3.5 mr-1" />{v.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar tarefa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendentes">Pendentes</SelectItem>
            <SelectItem value="concluida">Concluídas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="financeiro">Financeiro</SelectItem>
            <SelectItem value="comercial">Comercial</SelectItem>
            <SelectItem value="operacional">Operacional</SelectItem>
            <SelectItem value="aprovacao">Aprovação</SelectItem>
            <SelectItem value="planejamento">Planejamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma tarefa encontrada</TableCell></TableRow>
              ) : filtered.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && ["pendente", "em_andamento"].includes(task.status);
                const stCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pendente;
                const prCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;
                return (
                  <TableRow key={task.id} className={`cursor-pointer ${isOverdue ? "bg-red-50/50 dark:bg-red-950/20" : ""}`} onClick={() => setDetailTask(task)}>
                    <TableCell className="text-sm max-w-[250px] truncate">{task.title}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{task.module}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{task.category}</TableCell>
                    <TableCell><span className={`text-xs ${prCfg.color}`}>{prCfg.label}</span></TableCell>
                    <TableCell className={`text-xs ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                      {task.due_date ? format(new Date(task.due_date), "dd/MM/yy") : "—"}
                    </TableCell>
                    <TableCell><Badge className={`text-xs ${stCfg.color}`}>{stCfg.label}</Badge></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {["pendente", "em_andamento"].includes(task.status) && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(task.id, "concluida")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Concluir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {detailTask && (
        <Dialog open={!!detailTask} onOpenChange={() => setDetailTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{detailTask.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Módulo:</span> <span className="font-medium">{detailTask.module}</span></div>
                <div><span className="text-muted-foreground">Categoria:</span> <span className="font-medium">{detailTask.category}</span></div>
                <div><span className="text-muted-foreground">Prioridade:</span> <span className={PRIORITY_CONFIG[detailTask.priority]?.color}>{PRIORITY_CONFIG[detailTask.priority]?.label}</span></div>
                <div><span className="text-muted-foreground">Prazo:</span> <span className="font-medium">{detailTask.due_date ? format(new Date(detailTask.due_date), "dd/MM/yyyy") : "—"}</span></div>
              </div>
              {detailTask.description && <p className="bg-muted p-2 rounded text-sm">{detailTask.description}</p>}
              {detailTask.link_path && (
                <Button variant="outline" size="sm" onClick={() => { setDetailTask(null); window.location.href = detailTask.link_path; }}>
                  Ir para o item →
                </Button>
              )}
            </div>
            <DialogFooter>
              {["pendente"].includes(detailTask.status) && (
                <Button variant="outline" onClick={() => updateStatus(detailTask.id, "em_andamento")}>
                  <Clock className="h-4 w-4 mr-1" />Iniciar
                </Button>
              )}
              {["pendente", "em_andamento"].includes(detailTask.status) && (
                <Button onClick={() => updateStatus(detailTask.id, "concluida")}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />Concluir
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
