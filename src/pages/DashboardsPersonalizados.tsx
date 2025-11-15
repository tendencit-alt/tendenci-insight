import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Copy, Trash2, Calendar } from "lucide-react";
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
      <div className="space-y-6 p-6 bg-gradient-to-br from-background via-background to-muted/10 min-h-screen">
        {/* Header com gradiente */}
        <div className="relative rounded-2xl p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border/50 overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                Dashboards Personalizados
              </h1>
              <p className="text-muted-foreground mt-2">
                Crie e gerencie seus dashboards personalizados com os KPIs que você escolher
              </p>
            </div>
            <Button onClick={handleCreate} size="lg" className="shadow-lg hover:shadow-xl transition-all">
              <Plus className="mr-2 h-5 w-5" />
              Novo Dashboard
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-border/50">
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
          <Card className="border-dashed border-2 bg-gradient-to-br from-muted/20 to-transparent">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-6 mb-6">
                <Plus className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Nenhum dashboard criado</h3>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                Crie seu primeiro dashboard personalizado e organize seus KPIs da forma que preferir
              </p>
              <Button onClick={handleCreate} size="lg" className="shadow-lg">
                <Plus className="mr-2 h-5 w-5" />
                Criar Primeiro Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((dashboard) => (
              <Card 
                key={dashboard.id} 
                className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-border/50 bg-gradient-to-br from-card via-card to-card/80 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="relative">
                  <CardTitle className="line-clamp-1 text-xl">{dashboard.nome}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(dashboard.criado_em), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => handleView(dashboard.id)} 
                      className="flex-1 shadow-md hover:shadow-lg transition-all"
                    >
                      Visualizar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(dashboard.id)}
                      className="hover:bg-primary/10 hover:border-primary/50 transition-all"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDuplicate(dashboard)}
                      className="hover:bg-primary/10 hover:border-primary/50 transition-all"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialog({ open: true, dashboardId: dashboard.id })}
                      className="hover:bg-destructive/10 hover:border-destructive/50 transition-all"
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
