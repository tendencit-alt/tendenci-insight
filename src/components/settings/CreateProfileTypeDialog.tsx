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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ProfileType {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  color: string;
  icon: string;
  is_system: boolean;
}

interface CreateProfileTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileType?: ProfileType | null;
  onSuccess: () => void;
}

const PRESET_COLORS = [
  '#7C3AED', // Roxo
  '#10B981', // Verde
  '#3B82F6', // Azul
  '#F59E0B', // Amarelo
  '#EF4444', // Vermelho
  '#EC4899', // Rosa
  '#6B7280', // Cinza
  '#8B5CF6', // Violeta
];

export function CreateProfileTypeDialog({
  open,
  onOpenChange,
  profileType,
  onSuccess,
}: CreateProfileTypeDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    color: '#7C3AED',
    icon: 'user',
  });

  const isEditing = !!profileType;

  useEffect(() => {
    if (profileType) {
      setFormData({
        name: profileType.name,
        display_name: profileType.display_name,
        description: profileType.description || '',
        color: profileType.color,
        icon: profileType.icon,
      });
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        color: '#7C3AED',
        icon: 'user',
      });
    }
  }, [profileType, open]);

  // Gerar slug a partir do display_name
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleDisplayNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      display_name: value,
      name: isEditing ? prev.name : generateSlug(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.display_name) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome interno e nome de exibição são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      if (isEditing && profileType) {
        const { error } = await supabase
          .from('profile_types')
          .update({
            display_name: formData.display_name,
            description: formData.description || null,
            color: formData.color,
            icon: formData.icon,
          })
          .eq('id', profileType.id);

        if (error) throw error;

        toast({
          title: 'Tipo de perfil atualizado',
          description: `"${formData.display_name}" foi atualizado com sucesso.`,
        });
      } else {
        const { error } = await supabase
          .from('profile_types')
          .insert({
            name: formData.name,
            display_name: formData.display_name,
            description: formData.description || null,
            color: formData.color,
            icon: formData.icon,
            is_system: false,
            is_active: true,
          });

        if (error) {
          if (error.code === '23505') {
            throw new Error('Já existe um tipo de perfil com este nome.');
          }
          throw error;
        }

        toast({
          title: 'Tipo de perfil criado',
          description: `"${formData.display_name}" foi criado com sucesso.`,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar tipo de perfil:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o tipo de perfil.',
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
          <DialogTitle>
            {isEditing ? 'Editar Tipo de Perfil' : 'Novo Tipo de Perfil'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do tipo de perfil'
              : 'Crie um novo tipo de perfil para seus usuários'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Nome de Exibição *</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="Ex: Gerente, Marketing"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome Interno (slug)</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="gerente"
              disabled={isEditing}
              className={isEditing ? 'bg-muted' : ''}
            />
            <p className="text-xs text-muted-foreground">
              Identificador único, usado internamente
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do tipo de perfil..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor do Badge</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
