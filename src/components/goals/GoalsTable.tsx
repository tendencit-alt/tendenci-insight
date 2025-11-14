import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, CheckCircle, XCircle, Pencil, BarChart3 } from "lucide-react";
import { EditSellerGoalDialog } from "./EditSellerGoalDialog";
import { EditCompanyGoalDialog } from "./EditCompanyGoalDialog";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
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

interface GoalsTableProps {
  type: "seller" | "company";
  refreshTrigger: number;
  onRefresh: () => void;
}

export function GoalsTable({ type, refreshTrigger, onRefresh }: GoalsTableProps) {
  const navigate = useNavigate();
  const { isMaster } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const [editGoal, setEditGoal] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, [type, refreshTrigger]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      
      if (type === "seller") {
        const { data, error } = await supabase
          .from("tendenci_seller_goals" as any)
          .select(`
            *,
            profiles:vendedor_id (full_name, email),
            tendenci_goal_progress (valor_vendido, percentual)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setGoals(data || []);
      } else {
        const { data, error } = await supabase
          .from("tendenci_company_goals" as any)
          .select(`
            *,
            tendenci_goal_progress (valor_vendido, percentual)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setGoals(data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar metas:", error);
      toast.error("Erro ao carregar metas");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteGoalId) return;

    try {
      const table = type === "seller" ? "tendenci_seller_goals" : "tendenci_company_goals";
      const { error } = await supabase.from(table as any).delete().eq("id", deleteGoalId);

      if (error) throw error;

      toast.success("Meta excluída com sucesso!");
      onRefresh();
    } catch (error) {
      console.error("Erro ao excluir meta:", error);
      toast.error("Erro ao excluir meta");
    } finally {
      setDeleteGoalId(null);
    }
  };

  const handleStatusChange = async (goalId: string, newStatus: string) => {
    try {
      const table = type === "seller" ? "tendenci_seller_goals" : "tendenci_company_goals";
      const { error } = await supabase.from(table as any).update({ status: newStatus }).eq("id", goalId);

      if (error) throw error;

      toast.success("Status atualizado com sucesso!");
      onRefresh();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Carregando metas...</p>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Nenhuma meta encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{type === "seller" ? "Metas Individuais" : "Metas da Empresa"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {type === "seller" && <TableHead>Vendedor</TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Alcançado</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal) => {
                const progress = goal.tendenci_goal_progress?.[0];
                const valorVendido = progress?.valor_vendido || 0;
                const quantidadeAlcancada = progress?.quantidade_alcancada || 0;
                const percentual = progress?.percentual || 0;
                const valorMeta = type === "seller" ? goal.valor_meta : goal.valor_meta_total;
                const quantidadeMeta = goal.quantidade_meta;
                const tipoMeta = goal.tipo_meta || "vendas";

                // Determinar labels de tipo
                const tipoLabel = {
                  vendas: "Vendas",
                  captacao: "Captação",
                  efetivacao: "Efetivação"
                }[tipoMeta] || "Vendas";

                return (
                  <TableRow key={goal.id}>
                    {type === "seller" && (
                      <TableCell>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{goal.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{goal.profiles?.email}</p>
                          </div>
                          {isMaster && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/metas/desempenho/${goal.id}`)}
                              title="Ver dashboard executivo"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline">{tipoLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      {tipoMeta === "vendas" ? (
                        valorMeta?.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      ) : (
                        <span>{quantidadeMeta} {tipoMeta === "captacao" ? "arquitetos" : "projetos"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(goal.data_inicio), "dd/MM/yyyy", { locale: ptBR })}</p>
                        <p className="text-muted-foreground">até {format(new Date(goal.data_fim), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tipoMeta === "vendas" ? (
                        valorVendido.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      ) : (
                        <span>{quantidadeAlcancada} {tipoMeta === "captacao" ? "arquitetos" : "projetos"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(percentual, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{percentual.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          goal.status === "ativa"
                            ? "default"
                            : goal.status === "concluida"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        {goal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isMaster && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditGoal(goal);
                              setEditDialogOpen(true);
                            }}
                            title="Editar meta"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {goal.status === "ativa" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(goal.id, "concluida")}
                              title="Marcar como concluída"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {goal.status === "ativa" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(goal.id, "cancelada")}
                              title="Cancelar meta"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setDeleteGoalId(goal.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                      {!isMaster && (
                        <Badge variant="secondary">Somente leitura</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {type === "seller" ? (
        <EditSellerGoalDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          goal={editGoal}
          onSuccess={onRefresh}
        />
      ) : (
        <EditCompanyGoalDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          goal={editGoal}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
