import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const PRIORITY_COLORS: Record<string, string> = {
  critica: "text-destructive font-bold",
  alta: "text-orange-600 font-medium",
  media: "text-foreground",
  baixa: "text-muted-foreground",
};

export function MyTasksBlock() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["central-op-my-tasks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("erp_tasks")
        .select("*")
        .eq("assignee_id", user.id)
        .in("status", ["pendente", "em_andamento"])
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const completeTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("erp_tasks")
      .update({ status: "concluida", completed_at: new Date().toISOString(), completed_by: user?.id })
      .eq("id", taskId);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarefa concluída");
    queryClient.invalidateQueries({ queryKey: ["central-op-my-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["central-op-indicators"] });
  };

  const overdueTasks = (tasks || []).filter(t => t.due_date && new Date(t.due_date) < new Date());
  const todayTasks = (tasks || []).filter(t => {
    if (!t.due_date) return false;
    const d = format(new Date(t.due_date), "yyyy-MM-dd");
    return d === format(new Date(), "yyyy-MM-dd");
  });
  const otherTasks = (tasks || []).filter(t => !overdueTasks.includes(t) && !todayTasks.includes(t));

  const renderTask = (task: any) => {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
    return (
      <div
        key={task.id}
        onClick={() => task.link_path ? navigate(task.link_path) : navigate("/tarefas")}
        className={`flex items-center gap-3 p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors ${isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border"}`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-[10px] h-4">{task.module}</Badge>
            <span className={`text-[10px] ${PRIORITY_COLORS[task.priority] || ""}`}>
              {task.priority}
            </span>
            {task.due_date && (
              <span className={`text-[10px] ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                {format(new Date(task.due_date), "dd/MM")}
              </span>
            )}
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={(e) => completeTask(task.id, e)}>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          Minhas Tarefas
          {(tasks?.length || 0) > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">{tasks?.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ) : !tasks?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa pendente 🎉</p>
        ) : (
          <ScrollArea className="h-[260px]">
            <div className="space-y-1.5">
              {overdueTasks.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider pt-1">Atrasadas ({overdueTasks.length})</p>
                  {overdueTasks.map(renderTask)}
                </>
              )}
              {todayTasks.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider pt-1">Hoje ({todayTasks.length})</p>
                  {todayTasks.map(renderTask)}
                </>
              )}
              {otherTasks.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Próximas ({otherTasks.length})</p>
                  {otherTasks.map(renderTask)}
                </>
              )}
            </div>
          </ScrollArea>
        )}
        <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => navigate("/tarefas")}>
          Ver todas as tarefas →
        </Button>
      </CardContent>
    </Card>
  );
}
