import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Shield, User, Palette, Ruler, Loader2, Settings2, Trash2, Edit2, Briefcase, Calculator, Factory, DollarSign, Eye, Sparkles } from 'lucide-react';
import { CreateProfileTypeDialog } from './CreateProfileTypeDialog';
import { ProfileTypePermissionsDialog } from './ProfileTypePermissionsDialog';
import { ProfileTemplatesManager } from './ProfileTemplatesManager';
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

interface ProfileType {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  color: string;
  icon: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

const iconMap: Record<string, React.ReactNode> = {
  shield: <Shield className="w-4 h-4" />,
  user: <User className="w-4 h-4" />,
  palette: <Palette className="w-4 h-4" />,
  ruler: <Ruler className="w-4 h-4" />,
  briefcase: <Briefcase className="w-4 h-4" />,
  calculator: <Calculator className="w-4 h-4" />,
  factory: <Factory className="w-4 h-4" />,
  'dollar-sign': <DollarSign className="w-4 h-4" />,
  eye: <Eye className="w-4 h-4" />,
};

export function ProfileTypesManager() {
  const { toast } = useToast();
  const [profileTypes, setProfileTypes] = useState<ProfileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProfileType | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedTypeForPermissions, setSelectedTypeForPermissions] = useState<ProfileType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ProfileType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [templatesManagerOpen, setTemplatesManagerOpen] = useState(false);

  useEffect(() => {
    fetchProfileTypes();
  }, []);

  const fetchProfileTypes = async () => {
    try {
      setLoading(true);
      // Garante que os tipos de perfil padrão do sistema estejam disponíveis
      // (cópia editável) na empresa do usuário atual.
      await supabase.rpc('seed_tenant_profile_types' as any);

      const { data, error } = await supabase
        .from('profile_types')
        .select('*')
        .order('is_system', { ascending: false })
        .order('display_name');

      if (error) throw error;
      setProfileTypes(data || []);
    } catch (error) {
      console.error('Erro ao buscar tipos de perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os tipos de perfil.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermissions = (profileType: ProfileType) => {
    setSelectedTypeForPermissions(profileType);
    setPermissionsDialogOpen(true);
  };

  const handleEdit = (profileType: ProfileType) => {
    setEditingType(profileType);
    setCreateDialogOpen(true);
  };

  const handleDelete = (profileType: ProfileType) => {
    setTypeToDelete(profileType);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!typeToDelete) return;

    try {
      setDeleting(true);

      // Verificar se há usuários usando este tipo
      const { data: usersWithType, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('profile_type_id', typeToDelete.id)
        .limit(1);

      if (checkError) throw checkError;

      if (usersWithType && usersWithType.length > 0) {
        toast({
          title: 'Não é possível excluir',
          description: 'Existem usuários associados a este tipo de perfil.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('profile_types')
        .delete()
        .eq('id', typeToDelete.id);

      if (error) throw error;

      toast({
        title: 'Tipo de perfil excluído',
        description: `O tipo "${typeToDelete.display_name}" foi removido.`,
      });

      fetchProfileTypes();
    } catch (error: any) {
      console.error('Erro ao excluir tipo de perfil:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o tipo de perfil.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tipos de Perfil</CardTitle>
            <CardDescription>
              Gerencie os tipos de perfil e suas permissões padrão
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTemplatesManagerOpen(true)} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Templates
            </Button>
            <Button onClick={() => { setEditingType(null); setCreateDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profileTypes.map((profileType) => (
              <div
                key={profileType.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${profileType.color}20`, color: profileType.color }}
                  >
                    {iconMap[profileType.icon] || <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{profileType.display_name}</h3>
                      {profileType.is_system && (
                        <Badge variant="secondary" className="text-xs">Sistema</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {profileType.description || 'Sem descrição'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPermissions(profileType)}
                    className="gap-2"
                  >
                    <Settings2 className="w-4 h-4" />
                    Permissões
                  </Button>
                  {/* Master type cannot be edited */}
                  {profileType.name !== 'master' && profileType.name !== 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(profileType)}
                      className="gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(profileType)}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <CreateProfileTypeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        profileType={editingType}
        onSuccess={fetchProfileTypes}
      />

      {selectedTypeForPermissions && (
        <ProfileTypePermissionsDialog
          open={permissionsDialogOpen}
          onOpenChange={setPermissionsDialogOpen}
          profileType={selectedTypeForPermissions}
          onSuccess={fetchProfileTypes}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tipo de Perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o tipo "{typeToDelete?.display_name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProfileTemplatesManager open={templatesManagerOpen} onOpenChange={setTemplatesManagerOpen} />
    </>
  );
}
