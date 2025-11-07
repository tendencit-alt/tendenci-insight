import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  city: string;
  phone: string;
  email: string;
  tier: string;
  active: boolean;
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
    const { data, error } = await supabase
      .from('architects')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setArchitects(data as Architect[]);
    }
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
            <TableHead>Nome</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {architects.map((arch) => (
            <TableRow key={arch.id}>
              <TableCell className="font-medium">{arch.name}</TableCell>
              <TableCell>{arch.company || '-'}</TableCell>
              <TableCell>{arch.city || '-'}</TableCell>
              <TableCell>{arch.phone || '-'}</TableCell>
              <TableCell>{arch.email || '-'}</TableCell>
              <TableCell>
                <Badge variant={arch.tier === 'A' ? 'default' : 'outline'}>
                  {arch.tier}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={arch.active ? 'default' : 'secondary'}>
                  {arch.active ? 'Ativo' : 'Inativo'}
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
