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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';

interface ProfileType {
  id: string;
  name: string;
  display_name: string;
  color: string;
  is_system: boolean;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [profileTypes, setProfileTypes] = useState<ProfileType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    username: '',
    role: 'vendedor',
    profile_type_id: '',
  });

  useEffect(() => {
    if (open) {
      fetchProfileTypes();
    }
  }, [open]);

  const fetchProfileTypes = async () => {
    try {
      setLoadingTypes(true);
      const { data, error } = await supabase
        .from('profile_types')
        .select('*')
        .eq('is_active', true)
        .order('is_system', { ascending: false })
        .order('display_name');

      if (error) throw error;
      setProfileTypes(data || []);
      
      // Se não tem tipo selecionado, selecionar vendedor por padrão
      if (data && data.length > 0 && !formData.profile_type_id) {
        const vendedor = data.find(pt => pt.name === 'vendedor');
        if (vendedor) {
          setFormData(prev => ({ ...prev, profile_type_id: vendedor.id, role: 'vendedor' }));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar tipos de perfil:', error);
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleProfileTypeChange = (profileTypeId: string) => {
    const selectedType = profileTypes.find(pt => pt.id === profileTypeId);
    // Map profile type name to valid user_role enum value
    // Only 'admin', 'vendedor', 'arquiteto', 'projetista' exist in the enum
    const validRoles = ['admin', 'vendedor', 'arquiteto', 'projetista'];
    const mappedRole = selectedType?.name === 'master' ? 'admin' 
      : validRoles.includes(selectedType?.name || '') ? selectedType!.name 
      : 'vendedor';
    setFormData({
      ...formData,
      profile_type_id: profileTypeId,
      role: mappedRole,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: 'Erro',
        description: 'Email e senha são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter no mínimo 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            username: formData.username || formData.email.split('@')[0],
            role: formData.role,
            profile_type_id: formData.profile_type_id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      toast({
        title: '✅ Usuário criado',
        description: 'O novo usuário foi criado com sucesso.',
      });

      setFormData({
        email: '',
        password: '',
        full_name: '',
        username: '',
        role: 'vendedor',
        profile_type_id: profileTypes.find(pt => pt.name === 'vendedor')?.id || '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o usuário.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Criar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do novo usuário
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@exemplo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Nome do usuário"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username (@)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input
                id="username"
                type="text"
                placeholder="nomedousuario"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Opcional. Se não informado, será gerado a partir do email.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile_type">Tipo de Perfil</Label>
            <Select 
              value={formData.profile_type_id} 
              onValueChange={handleProfileTypeChange}
              disabled={loadingTypes}
            >
              <SelectTrigger id="profile_type">
                {loadingTypes ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SelectValue placeholder="Selecione o tipo" />
                )}
              </SelectTrigger>
              <SelectContent>
                {profileTypes.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: pt.color }}
                      />
                      {pt.display_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
