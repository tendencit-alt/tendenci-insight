import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPermissionsDialog } from '@/components/settings/UserPermissionsDialog';
import { CreateUserDialog } from '@/components/settings/CreateUserDialog';
import { ResetPasswordDialog } from '@/components/settings/ResetPasswordDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, Loader2, ArrowLeft, CheckCircle, UserPlus, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'vendedor' | 'arquiteto';
  created_at: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      setUsers(profiles || []);
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

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleResetPassword = (user: UserProfile) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const getRoleBadge = (user: UserProfile) => {
    const isMaster = user.role === 'admin';
    return isMaster ? (
      <Badge className="bg-primary/20 text-primary border-primary/30">
        <Shield className="w-3 h-3 mr-1" />
        Master
      </Badge>
    ) : user.role === 'arquiteto' ? (
      <Badge variant="outline">
        <User className="w-3 h-3 mr-1" />
        Arquiteto
      </Badge>
    ) : (
      <Badge variant="outline">
        <User className="w-3 h-3 mr-1" />
        Vendedor
      </Badge>
    );
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
                onClick={() => navigate('/configuracoes')}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
                <p className="text-muted-foreground">
                  Gerencie perfis e permissões de acesso dos usuários
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Criar Usuário
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
            <CardDescription>
              Total de {users.length} usuário(s) cadastrado(s)
            </CardDescription>
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
                        {getStatusBadge()}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Editar Perfil
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
          
          <ResetPasswordDialog
            open={resetPasswordDialogOpen}
            onOpenChange={setResetPasswordDialogOpen}
            userId={selectedUser.id}
            userEmail={selectedUser.email}
            userName={selectedUser.full_name}
          />
        </>
      )}
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
