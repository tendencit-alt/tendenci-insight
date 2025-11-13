import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPermissionsDialog } from '@/components/settings/UserPermissionsDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, Settings, Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserWithPermissions {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  permissions?: {
    role: string;
    active: boolean;
    acesso_leads: boolean;
    acesso_arquitetos: boolean;
    acesso_projetos: boolean;
    acesso_crm_kanban: boolean;
    acesso_metas: boolean;
    acesso_configuracoes: boolean;
  };
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Buscar todos os profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar permissões
      const { data: permissions, error: permissionsError } = await supabase
        .from('tendenci_user_permissions')
        .select('*');

      if (permissionsError) throw permissionsError;

      // Combinar dados
      const usersWithPermissions = profiles.map((profile) => {
        const userPermissions = permissions?.find((p) => p.user_id === profile.id);
        return {
          ...profile,
          permissions: userPermissions || undefined,
        };
      });

      setUsers(usersWithPermissions);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserWithPermissions) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const getRoleBadge = (user: UserWithPermissions) => {
    const isMaster = user.role === 'admin' || user.permissions?.role === 'master';
    return isMaster ? (
      <Badge className="bg-primary/20 text-primary border-primary/30">
        <Shield className="w-3 h-3 mr-1" />
        Master
      </Badge>
    ) : (
      <Badge variant="outline">
        <User className="w-3 h-3 mr-1" />
        Vendedor
      </Badge>
    );
  };

  const getStatusBadge = (user: UserWithPermissions) => {
    const isActive = user.permissions?.active !== false;
    return isActive ? (
      <Badge variant="outline" className="border-green-500 text-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        Ativo
      </Badge>
    ) : (
      <Badge variant="outline" className="border-red-500 text-red-500">
        <XCircle className="w-3 h-3 mr-1" />
        Desativado
      </Badge>
    );
  };

  const countActivePermissions = (user: UserWithPermissions) => {
    if (!user.permissions) return 0;
    const perms = user.permissions;
    const count = [
      perms.acesso_leads,
      perms.acesso_arquitetos,
      perms.acesso_projetos,
      perms.acesso_crm_kanban,
      perms.acesso_metas,
      perms.acesso_configuracoes,
    ].filter(Boolean).length;
    return count;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              🔐 Gerenciamento de Acessos
            </h1>
            <p className="text-muted-foreground text-lg">
              Configure permissões e níveis de acesso dos usuários do sistema
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{users.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Masters</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {users.filter((u) => u.role === 'admin' || u.permissions?.role === 'master').length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-500">
                {users.filter((u) => u.role !== 'admin' && u.permissions?.role !== 'master').length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-500">
                {users.filter((u) => u.permissions?.active !== false).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Lista de Usuários
            </CardTitle>
            <CardDescription>Gerencie as permissões de acesso de cada usuário</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{user.full_name || 'Sem nome'}</p>
                          {getRoleBadge(user)}
                          {getStatusBadge(user)}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>

                      <div className="text-center px-4">
                        <p className="text-2xl font-bold text-primary">{countActivePermissions(user)}/6</p>
                        <p className="text-xs text-muted-foreground">Módulos</p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      className="gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Editar Permissões
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Edição */}
        {selectedUser && (
          <UserPermissionsDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            userId={selectedUser.id}
            userEmail={selectedUser.email}
            userName={selectedUser.full_name}
            onSuccess={fetchUsers}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
