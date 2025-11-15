import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userName?: string;
  onSuccess: () => void;
}

export function UserPermissionsDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
  onSuccess,
}: UserPermissionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<'admin' | 'vendedor' | 'arquiteto'>('vendedor');

  useEffect(() => {
    if (open && userId) {
      fetchUserRole();
    }
  }, [open, userId]);

  const fetchUserRole = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRole(data.role as 'admin' | 'vendedor' | 'arquiteto');
      }
    } catch (error) {
      console.error('Erro ao buscar role do usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o perfil do usuário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: '✅ Perfil atualizado',
        description: 'O perfil do usuário foi atualizado com sucesso.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Gerenciar Perfil
          </DialogTitle>
          <DialogDescription>
            Configurar o perfil de acesso para {userName || userEmail}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Tipo de Perfil</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Master (Acesso Total)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="vendedor">
                    <span>Vendedor</span>
                  </SelectItem>
                  <SelectItem value="arquiteto">
                    <span>Arquiteto</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {role === 'admin'
                  ? 'Master tem acesso completo a todas as funcionalidades'
                  : 'Vendedor e Arquiteto têm acesso limitado baseado em suas funções'}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
