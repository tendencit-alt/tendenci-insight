import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name?: string;
  } | null;
  onSuccess: () => void;
}

export function DeleteUserDialog({ open, onOpenChange, user, onSuccess }: DeleteUserDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Chamar Edge Function para deletar usuário (deleta auth.users e cascade profiles)
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          user_id: user.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi removido do sistema com sucesso.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o usuário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o usuário <strong>{user?.full_name || user?.email}</strong>?
            <br />
            <br />
            ⚠️ Esta ação é <strong>irreversível</strong>. Todos os dados vinculados a este usuário serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Excluir Permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
