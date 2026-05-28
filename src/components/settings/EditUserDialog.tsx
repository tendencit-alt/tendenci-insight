import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User } from 'lucide-react';

interface ProfileType {
  id: string;
  name: string;
  display_name: string;
  color: string;
  is_system?: boolean;
}

const isMasterProfileType = (profileType?: Pick<ProfileType, 'name' | 'is_system'> | null) =>
  profileType?.name === 'master' || profileType?.name === 'admin';

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
    profile_type_id?: string | null;
  } | null;
  onSuccess: () => void;
}

export function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profileTypes, setProfileTypes] = useState<ProfileType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    profile_type_id: '',
    especializacao: 'todos',
  });

  // Buscar tipos de perfil quando o dialog abrir
  useEffect(() => {
    if (open) {
      fetchProfileTypes();
    }
  }, [open]);

  // Atualizar formData quando user mudar
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        username: user.username || '',
        full_name: user.full_name || '',
        profile_type_id: user.profile_type_id || '',
        especializacao: user.especializacao || 'todos',
      });
    }
  }, [user]);

  const fetchProfileTypes = async () => {
    try {
      setLoadingTypes(true);
      const { data, error } = await supabase
        .from('profile_types')
        .select('id, name, display_name, color, is_system')
        .eq('is_active', true)
        .neq('name', 'owner') // 'owner' é papel de plataforma, não atribuível por tenant
        .order('is_system', { ascending: false })
        .order('display_name');

      if (error) throw error;
       setProfileTypes((data || []).filter((pt) => !(isMasterProfileType(pt) && !pt.is_system)));
    } catch (error) {
      console.error('Erro ao buscar tipos de perfil:', error);
    } finally {
      setLoadingTypes(false);
    }
  };

  // Verificar se o usuário sendo editado é master (role='admin')
  const isUserMaster = user?.role === 'admin';

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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      // Chamar a edge function para atualizar o usuário
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            email: formData.email,
            full_name: formData.full_name,
            username: formData.username,
            profile_type_id: formData.profile_type_id || null,
            especializacao: formData.especializacao,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar usuário');
      }

      toast({
        title: '✅ Usuário atualizado',
        description: result.new_role 
          ? `Dados atualizados e perfil alterado para ${result.new_role}.`
          : 'As informações do usuário foram atualizadas com sucesso.',
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

  // Determinar se deve mostrar campo de especialização baseado no tipo de perfil selecionado
  const selectedProfileType = profileTypes.find(pt => pt.id === formData.profile_type_id);
  const showEspecializacao = selectedProfileType?.name === 'vendedor';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Editar Usuário
          </DialogTitle>
          <DialogDescription>
            Atualize todas as informações do usuário
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nome completo do usuário"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
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
            <Label htmlFor="username">Username (@) *</Label>
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

          {isUserMaster ? (
            <div className="space-y-2">
              <Label>Tipo de Perfil</Label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm font-medium">Master</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Usuários master não podem ter seu tipo de perfil alterado
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="profile_type">Tipo de Perfil</Label>
              <Select 
                value={formData.profile_type_id} 
                onValueChange={(value) => setFormData({ ...formData, profile_type_id: value })}
                disabled={loadingTypes}
              >
                <SelectTrigger id="profile_type">
                  {loadingTypes ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <SelectValue placeholder="Selecione o tipo de perfil" />
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
              <p className="text-xs text-muted-foreground">
                Ao alterar o tipo, as permissões serão atualizadas automaticamente
              </p>
            </div>
          )}

          {showEspecializacao && (
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
                Define quais categorias de negócios o vendedor pode visualizar
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
