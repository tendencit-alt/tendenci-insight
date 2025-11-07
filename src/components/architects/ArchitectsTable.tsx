import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  projects_count: number;
  last_project_date: string | null;
  created_at: string;
  days_without_project: number;
}

interface ArchitectsTableProps {
  refreshKey: number;
  onEdit: (architect: Architect) => void;
  onView: (architectId: string) => void;
}

export function ArchitectsTable({ refreshKey, onEdit, onView }: ArchitectsTableProps) {
  const [architects, setArchitects] = useState<Architect[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchArchitects();
  }, [refreshKey]);

  const fetchArchitects = async () => {
    setLoading(true);
    
    // Buscar arquitetos com data de criação
    const { data: architectsData, error } = await supabase
      .from('architects')
      .select('id, name, company, phone, created_at')
      .order('name');
    
    if (error || !architectsData) {
      setLoading(false);
      return;
    }

    // Para cada arquiteto, buscar contagem e última data de projeto
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

    const { error } = await supabase
      .from('architects')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Erro ao excluir arquiteto');
    } else {
      toast.success('Arquiteto excluído com sucesso');
      fetchArchitects();
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome do Arquiteto</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead className="text-center">Projetos Enviados</TableHead>
            <TableHead>Data do Último Projeto</TableHead>
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este arquiteto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
