import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Dashboard {
  id: string;
  nome: string;
  layout: any;
  criado_em: string;
  atualizado_em: string;
}

export default function DashboardsPersonalizados() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; dashboardId: string | null }>({
    open: false,
    dashboardId: null,
  });

  const isMaster = profile?.role === 'admin';

  useEffect(() => {
    if (!isMaster) {
      navigate('/');
      toast({
        title: "Acesso negado",
        description: "Apenas usuários MASTER podem acessar esta área",
        variant: "destructive",
      });
      return;
    }
    fetchDashboards();
  }, [isMaster, navigate]);

  const fetchDashboards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("dashboards_personalizados")
        .select("*")
        .eq("user_id", user?.id)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setDashboards(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dashboards",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigate("/dashboards/editar/novo");
  };

  const handleEdit = (id: string) => {
    navigate(`/dashboards/editar/${id}`);
  };

  const handleView = (id: string) => {
    navigate(`/dashboards/view/${id}`);
  };

  const handleDuplicate = async (dashboard: Dashboard) => {
    try {
      const { error } = await supabase
        .from("dashboards_personalizados")
        .insert({
          user_id: user?.id,
          nome: `${dashboard.nome} (Cópia)`,
          layout: dashboard.layout,
        });

      if (error) throw error;

      toast({
        title: "Dashboard duplicado",
        description: "Dashboard copiado com sucesso!",
      });
      fetchDashboards();
    } catch (error: any) {
      toast({
        title: "Erro ao duplicar dashboard",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.dashboardId) return;

    try {
      const { error } = await supabase
        .from("dashboards_personalizados")
        .delete()
        .eq("id", deleteDialog.dashboardId);

      if (error) throw error;

      toast({
        title: "Dashboard excluído",
        description: "Dashboard removido com sucesso!",
      });
      fetchDashboards();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialog({ open: false, dashboardId: null });
    }
  };

  if (!isMaster) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboards Personalizados</h1>
            <p className="text-muted-foreground">
              Crie e gerencie seus dashboards personalizados com os KPIs que você escolher
            </p>
          </div>
          <Button onClick={handleCreate} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Novo Dashboard
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dashboards.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhum dashboard criado</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Crie seu primeiro dashboard personalizado e organize seus KPIs da forma que preferir
              </p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((dashboard) => (
              <Card key={dashboard.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{dashboard.nome}</CardTitle>
                  <CardDescription>
                    Criado em {format(new Date(dashboard.criado_em), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" onClick={() => handleView(dashboard.id)} className="flex-1">
                      Visualizar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(dashboard.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDuplicate(dashboard)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialog({ open: true, dashboardId: dashboard.id })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este dashboard? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
