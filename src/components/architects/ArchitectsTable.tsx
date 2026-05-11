import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, MessageCircle, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

interface Architect {
  id: string;
  name: string;
  company: string;
  phone: string;
  categoria: string;
  projects_count: number;
  last_project_date: string | null;
  created_at: string;
  days_without_project: number;
  data_primeiro_contato: string | null;
  data_ultimo_contato: string | null;
}

interface ArchitectsTableProps {
  refreshKey: number;
  onEdit: (architect: Architect) => void;
  onView: (architectId: string) => void;
  onDelete?: () => void;
}

export function ArchitectsTable({ refreshKey, onEdit, onView, onDelete }: ArchitectsTableProps) {
  const [architects, setArchitects] = useState<Architect[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todos");

  useEffect(() => {
    fetchArchitects();
  }, [refreshKey, categoriaFilter]);

  const fetchArchitects = async () => {
    setLoading(true);
    
    // Buscar profissionais parceiros com todos os campos necessários
    let query = supabase
      .from('architects')
      .select('*');
    
    // Aplicar filtro de categoria se não for "todos"
    if (categoriaFilter !== "todos") {
      query = query.eq('categoria', categoriaFilter);
    }
    
    const { data: architectsData, error } = await query.order('name');
    
    if (error || !architectsData) {
      setLoading(false);
      return;
    }

    // Para cada profissional parceiro, buscar contagem e última data de projeto
    const architectsWithStats = await Promise.all(
      architectsData.map(async (arch) => {
        const { data: projects, error: projError } = await supabase
          .from('projects')
          .select('created_at')
          .eq('architect_id', arch.id)
          .order('created_at', { ascending: false });

        const lastProjectDate = projects?.[0]?.created_at || null;
        const referenceDate = lastProjectDate || arch.created_at;
        const daysSince = Math.floor(
          (new Date().getTime() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...arch,
          projects_count: projects?.length || 0,
          last_project_date: lastProjectDate,
          days_without_project: daysSince
        };
      })
    );

    setArchitects(architectsWithStats as Architect[]);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    // Usar função segura que limpa dados relacionados
    const { data, error } = await supabase.rpc('delete_architect_safely', {
      p_architect_id: deleteId
    });

    if (error) {
      toast.error('Erro ao excluir profissional parceiro: ' + error.message);
    } else if (data) {
      const result = data as { success: boolean; error?: string; details?: { leads: number; deals: number; projetos: number; pedidos: number } };
      if (!result.success) {
        // Mostrar detalhes do bloqueio
        if (result.details) {
          const details = result.details;
          const blockers = [];
          if (details.leads > 0) blockers.push(`${details.leads} lead(s)`);
          if (details.deals > 0) blockers.push(`${details.deals} deal(s)`);
          if (details.projetos > 0) blockers.push(`${details.projetos} projeto(s)`);
          if (details.pedidos > 0) blockers.push(`${details.pedidos} pedido(s)`);
          toast.error(`Não é possível excluir: profissional parceiro possui ${blockers.join(', ')} vinculados`);
        } else {
          toast.error(result.error || 'Erro ao excluir profissional parceiro');
        }
      } else {
        toast.success('Profissional Parceiro excluído com sucesso');
        fetchArchitects();
        onDelete?.();
      }
    }
    setDeleteId(null);
  };

  const handleWhatsAppClick = (phone: string) => {
    if (!phone) {
      toast.error('WhatsApp não cadastrado');
      return;
    }
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Abre WhatsApp em nova aba
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-muted rounded"></div>
      ))}
    </div>;
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Todos os Profissionais Parceiros</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {architects.length} profissionais parceiros cadastrados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="todos">Todas as categorias</SelectItem>
                  <SelectItem value="metropolitano">Metropolitano</SelectItem>
                  <SelectItem value="captado">Captado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Profissional Parceiro</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead className="text-center">Projetos Enviados</TableHead>
                <TableHead>Último Projeto</TableHead>
                <TableHead>Último Contato</TableHead>
                <TableHead className="text-center">Dias Sem Projeto</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {architects.map((arch) => (
                <TableRow key={arch.id}>
                  <TableCell className="font-medium">{arch.name}</TableCell>
                  <TableCell>{arch.company || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={arch.categoria === 'metropolitano' ? 'default' : 'secondary'}>
                      {arch.categoria === 'metropolitano' ? 'Metropolitano' : 'Captado'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {arch.phone ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleWhatsAppClick(arch.phone)}
                        className="gap-2 hover:text-green-600"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {arch.phone}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-semibold">
                      {arch.projects_count}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {arch.last_project_date ? (
                      <span className="text-sm">
                        {format(new Date(arch.last_project_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Nenhum projeto</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {arch.data_ultimo_contato ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">
                          {format(new Date(arch.data_ultimo_contato), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          há {Math.floor((new Date().getTime() - new Date(arch.data_ultimo_contato).getTime()) / (1000 * 60 * 60 * 24))} dias
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        Nunca contactado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={
                        arch.days_without_project > 60 ? 'destructive' : 
                        arch.days_without_project > 30 ? 'default' : 
                        'outline'
                      }
                      className="font-semibold"
                    >
                      {arch.days_without_project} {arch.days_without_project === 1 ? 'dia' : 'dias'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(arch.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(arch)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(arch.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja excluir este profissional parceiro?</p>
              <p className="text-sm text-muted-foreground">
                Todos os dados relacionados (tarefas, campanhas, histórico) serão removidos permanentemente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
