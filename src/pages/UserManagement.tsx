import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPermissionsDialog } from '@/components/settings/UserPermissionsDialog';
import { CreateUserDialog } from '@/components/settings/CreateUserDialog';
import { ResetPasswordDialog } from '@/components/settings/ResetPasswordDialog';
import { EditUserDialog } from '@/components/settings/EditUserDialog';
import { DeleteUserDialog } from '@/components/settings/DeleteUserDialog';
import { ProfileTypesManager } from '@/components/settings/ProfileTypesManager';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, Loader2, ArrowLeft, CheckCircle, UserPlus, Key, Edit2, Trash2, Users, Tags } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { describeError } from '@/lib/errorMessage';

interface ProfileType {
  id: string;
  name: string;
  display_name: string;
  color: string;
  icon: string;
  is_system: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role: 'owner' | 'tenant_owner' | 'admin' | 'vendedor' | 'arquiteto' | 'projetista';
  profile_type_id?: string | null;
  profile_type?: ProfileType | null;
  created_at: string;
  especializacao?: string | null;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [profileTypes, setProfileTypes] = useState<ProfileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchUsers();
    fetchProfileTypes();
  }, []);

  const fetchProfileTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_types')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      setProfileTypes(data || []);
    } catch (error) {
      console.error('Erro ao buscar tipos de perfil:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          profile_type:profile_types(id, name, display_name, color, icon, is_system)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      setUsers(profiles || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: 'Erro',
        description: describeError('Não foi possível carregar os usuários', error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermissions = (user: UserProfile) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleResetPassword = (user: UserProfile) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };


  const getRoleBadge = (user: UserProfile) => {
    // Se tem profile_type, usar ele
    if (user.profile_type) {
      const pt = user.profile_type;
      return (
        <Badge
          className="border"
          style={{
            backgroundColor: `${pt.color}20`,
            color: pt.color,
            borderColor: `${pt.color}50`,
          }}
        >
          {pt.name === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
          {pt.display_name}
        </Badge>
      );
    }

    // Fallback para role antigo
    const isMaster = user.role === 'admin';
    return isMaster ? (
      <Badge className="bg-primary/20 text-primary border-primary/30">
        <Shield className="w-3 h-3 mr-1" />
        Master
      </Badge>
    ) : user.role === 'arquiteto' ? (
      <Badge variant="outline">
        <User className="w-3 h-3 mr-1" />
        Parceiro Profissional
      </Badge>
    ) : user.role === 'projetista' ? (
      <Badge variant="outline" className="border-blue-500 text-blue-500">
        <User className="w-3 h-3 mr-1" />
        Projetista
      </Badge>
    ) : (
      <Badge variant="outline">
        <User className="w-3 h-3 mr-1" />
        Vendedor
      </Badge>
    );
  };

  const getEspecializacaoBadge = (especializacao: string | null | undefined) => {
    if (!especializacao || especializacao === 'todos') {
      return <Badge variant="secondary" className="text-xs">Todos</Badge>;
    }
    switch (especializacao) {
      case "moveis_soltos":
        return <Badge className="bg-blue-500 text-xs">Móveis Soltos</Badge>;
      case "moveis_planejados":
        return <Badge className="bg-purple-500 text-xs">Móveis Planejados</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{especializacao}</Badge>;
    }
  };

  const getStatusBadge = () => {
    return (
      <Badge variant="outline" className="border-green-500 text-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        Ativo
      </Badge>
    );
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/settings')}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
                <p className="text-muted-foreground">
                  Gerencie perfis, tipos e permissões de acesso
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="types" className="gap-2">
              <Tags className="w-4 h-4" />
              Tipos de Perfil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Usuários do Sistema</CardTitle>
                  <CardDescription>
                    Total de {users.length} usuário(s) cadastrado(s)
                  </CardDescription>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Criar Usuário
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {user.full_name || 'Sem nome'}
                        </h3>
                        {getRoleBadge(user)}
                        {user.role === 'vendedor' && getEspecializacaoBadge(user.especializacao)}
                        {getStatusBadge()}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="truncate">{user.email}</span>
                        {user.username && (
                          <span className="text-primary font-medium">@{user.username}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPermissions(user)}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Permissões
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      className="gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(user)}
                      className="gap-2"
                    >
                      <Key className="w-4 h-4" />
                      Senha
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="types" className="mt-6">
            <ProfileTypesManager />
          </TabsContent>
        </Tabs>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchUsers}
      />

      {selectedUser && (
        <>
          <UserPermissionsDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            userId={selectedUser.id}
            userEmail={selectedUser.email}
            userName={selectedUser.full_name}
            onSuccess={fetchUsers}
          />

          <EditUserDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            user={selectedUser}
            onSuccess={fetchUsers}
          />
          
          <ResetPasswordDialog
            open={resetPasswordDialogOpen}
            onOpenChange={setResetPasswordDialogOpen}
            userId={selectedUser.id}
            userEmail={selectedUser.email}
            userName={selectedUser.full_name}
          />

          <DeleteUserDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            user={selectedUser}
            onSuccess={fetchUsers}
          />
        </>
      )}
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
