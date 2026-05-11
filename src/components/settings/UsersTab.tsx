import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPermissionsDialog } from '@/components/settings/UserPermissionsDialog';
import { CreateUserDialog } from '@/components/settings/CreateUserDialog';
import { ResetPasswordDialog } from '@/components/settings/ResetPasswordDialog';
import { EditUserDialog } from '@/components/settings/EditUserDialog';
import { DeleteUserDialog } from '@/components/settings/DeleteUserDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, Loader2, CheckCircle, UserPlus, Key, Edit2, Trash2 } from 'lucide-react';

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

export function UsersTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          profile_type:profile_types(id, name, display_name, color, icon, is_system)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
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

  const getRoleBadge = (user: UserProfile) => {
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
      <div className="flex items-center justify-center min-h-[30vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Usuários do Sistema
            </CardTitle>
            <CardDescription>
              {users.length} usuário(s) cadastrado(s) — Gerencie dados, permissões e acessos
            </CardDescription>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Criar Usuário
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {getInitials(user.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">
                        {user.full_name || 'Sem nome'}
                      </h3>
                      {getRoleBadge(user)}
                      {user.role === 'vendedor' && getEspecializacaoBadge(user.especializacao)}
                      <Badge variant="outline" className="border-green-500 text-green-500 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ativo
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="truncate">{user.email}</span>
                      {user.username && (
                        <span className="text-primary font-medium">@{user.username}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedUser(user); setDialogOpen(true); }}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Permissões</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedUser(user); setEditDialogOpen(true); }}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Editar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedUser(user); setResetPasswordDialogOpen(true); }}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Senha</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => { setSelectedUser(user); setDeleteDialogOpen(true); }}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
    </>
  );
}
