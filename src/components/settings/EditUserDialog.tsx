import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    username: string;
    full_name?: string;
    role?: string;
    especializacao?: string | null;
  } | null;
  onSuccess: () => void;
}

export function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    username: user?.username || '',
    especializacao: user?.especializacao || 'todos',
  });

  // Atualizar formData quando user mudar
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        username: user.username,
        especializacao: user.especializacao || 'todos',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!formData.email || !formData.username) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Email e username são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return;
    }

    // Validar username (sem espaços, apenas letras, números e underscores)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      toast({
        title: 'Username inválido',
        description: 'Username deve conter apenas letras, números e underscores.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Atualizar profile (email e username)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: formData.email,
          username: formData.username,
          especializacao: formData.especializacao,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Atualizar email no auth.users (via Edge Function)
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.functions.invoke('admin-update-user-email', {
          body: {
            user_id: user.id,
            new_email: formData.email,
          },
        });

        if (emailError) {
          console.warn('Aviso ao atualizar email no auth:', emailError);
          toast({
            title: 'Aviso',
            description: 'Profile atualizado, mas pode ser necessário atualizar o email manualmente no auth.',
            variant: 'default',
          });
        }
      }

      toast({
        title: 'Usuário atualizado',
        description: 'As informações do usuário foram atualizadas com sucesso.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o usuário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize o email e username do usuário
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@exemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username (@)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="nomedousuario"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Apenas letras, números e underscores
            </p>
          </div>

          {user?.role === 'vendedor' && (
            <div className="space-y-2">
              <Label htmlFor="especializacao">Especialização</Label>
              <Select 
                value={formData.especializacao} 
                onValueChange={(value) => setFormData({ ...formData, especializacao: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a especialização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos (Acesso Completo)</SelectItem>
                  <SelectItem value="moveis_soltos">Móveis Soltos</SelectItem>
                  <SelectItem value="moveis_planejados">Móveis Planejados</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define quais categorias de negócios o vendedor pode visualizar no CRM Kanban
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
