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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Check, Briefcase, DollarSign, Calculator, Factory, Eye, User, Shield, Settings2 } from 'lucide-react';
import { useProfileTemplates } from '@/hooks/useProfileTemplates';
import { ProfileTemplatesManager } from './ProfileTemplatesManager';

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
  '#7C3AED', '#10B981', '#3B82F6', '#F59E0B',
  '#EF4444', '#EC4899', '#6B7280', '#8B5CF6',
];

// ===== Templates (pré-perfis prontos para uso) =====
type FlagSet = {
  can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean;
  can_approve: boolean; can_conciliate: boolean; can_export: boolean; can_admin: boolean;
};

const ALL_MODULES = [
  'dashboard_executivo', 'comercial', 'operacional', 'financeiro',
  'controladoria', 'planejamento', 'cadastros', 'relatorios_bi', 'configuracoes',
];

const empty = (): FlagSet => ({
  can_view: false, can_create: false, can_edit: false, can_delete: false,
  can_approve: false, can_conciliate: false, can_export: false, can_admin: false,
});
const readOnly = (): FlagSet => ({ ...empty(), can_view: true, can_export: true });
const editor = (): FlagSet => ({ ...empty(), can_view: true, can_create: true, can_edit: true, can_export: true });
const full = (): FlagSet => ({
  can_view: true, can_create: true, can_edit: true, can_delete: true,
  can_approve: true, can_conciliate: true, can_export: true, can_admin: true,
});

interface Template {
  id: string;
  label: string;
  description: string;
  slug: string;
  display_name: string;
  color: string;
  icon: string;
  iconNode: React.ReactNode;
  buildPermissions: () => Record<string, FlagSet>;
}

const buildFor = (fn: (m: string) => FlagSet) => {
  const out: Record<string, FlagSet> = {};
  ALL_MODULES.forEach(m => { out[m] = fn(m); });
  return out;
};

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    label: 'Em branco',
    description: 'Crie um perfil personalizado e configure as permissões depois.',
    slug: '', display_name: '', color: '#6B7280', icon: 'user',
    iconNode: <User className="w-4 h-4" />,
    buildPermissions: () => buildFor(() => empty()),
  },
  {
    id: 'gestor',
    label: 'Gestor / Diretor',
    description: 'Acesso amplo de edição em todas as áreas, com aprovação em finanças e planejamento.',
    slug: 'gestor_template', display_name: 'Gestor', color: '#3B82F6', icon: 'briefcase',
    iconNode: <Briefcase className="w-4 h-4" />,
    buildPermissions: () => buildFor(m => {
      if (m === 'configuracoes') return readOnly();
      const p = editor();
      if (['financeiro', 'controladoria', 'planejamento'].includes(m)) p.can_approve = true;
      return p;
    }),
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Edição completa em Financeiro, Controladoria e Planejamento, leitura no resto.',
    slug: 'financeiro_template', display_name: 'Financeiro', color: '#10B981', icon: 'dollar-sign',
    iconNode: <DollarSign className="w-4 h-4" />,
    buildPermissions: () => buildFor(m => {
      if (['financeiro', 'controladoria', 'planejamento', 'relatorios_bi'].includes(m)) {
        return { ...editor(), can_approve: true, can_conciliate: true };
      }
      if (m === 'configuracoes') return empty();
      return readOnly();
    }),
  },
  {
    id: 'controladoria',
    label: 'Controladoria',
    description: 'Foco em conciliação, controladoria e BI. Aprovação em finanças.',
    slug: 'controladoria_template', display_name: 'Controladoria', color: '#8B5CF6', icon: 'calculator',
    iconNode: <Calculator className="w-4 h-4" />,
    buildPermissions: () => buildFor(m => {
      if (['controladoria', 'financeiro', 'relatorios_bi'].includes(m)) {
        return { ...editor(), can_approve: true, can_conciliate: true };
      }
      if (m === 'planejamento') return readOnly();
      if (m === 'configuracoes') return empty();
      return readOnly();
    }),
  },
  {
    id: 'comercial',
    label: 'Comercial / Vendas',
    description: 'Edição no módulo Comercial, leitura em Dashboard e Relatórios.',
    slug: 'comercial_template', display_name: 'Comercial', color: '#F59E0B', icon: 'briefcase',
    iconNode: <Briefcase className="w-4 h-4" />,
    buildPermissions: () => buildFor(m => {
      if (m === 'comercial') return editor();
      if (['dashboard_executivo', 'relatorios_bi'].includes(m)) return readOnly();
      return empty();
    }),
  },
  {
    id: 'operacional',
    label: 'Operacional / Produção',
    description: 'Edição em Operacional e Cadastros, leitura em BI.',
    slug: 'operacional_template', display_name: 'Operacional', color: '#EC4899', icon: 'factory',
    iconNode: <Factory className="w-4 h-4" />,
    buildPermissions: () => buildFor(m => {
      if (['operacional', 'cadastros'].includes(m)) return editor();
      if (['dashboard_executivo', 'relatorios_bi'].includes(m)) return readOnly();
      return empty();
    }),
  },
  {
    id: 'auditoria',
    label: 'Auditoria / Visualizador',
    description: 'Leitura e exportação em todos os módulos. Sem edição.',
    slug: 'auditoria_template', display_name: 'Auditoria', color: '#6B7280', icon: 'eye',
    iconNode: <Eye className="w-4 h-4" />,
    buildPermissions: () => buildFor(() => readOnly()),
  },
  {
    id: 'admin',
    label: 'Administrador',
    description: 'Acesso total a todos os módulos e ações críticas.',
    slug: 'admin_template', display_name: 'Administrador', color: '#EF4444', icon: 'shield',
    iconNode: <Shield className="w-4 h-4" />,
    buildPermissions: () => buildFor(() => full()),
  },
];

export function CreateProfileTypeDialog({
  open,
  onOpenChange,
  profileType,
  onSuccess,
}: CreateProfileTypeDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [templatesManagerOpen, setTemplatesManagerOpen] = useState(false);
  const { data: customTemplates = [] } = useProfileTemplates();

  // Templates customizados convertidos ao formato Template do dialog
  const customAsTemplates: Template[] = customTemplates.map(t => ({
    id: `custom_${t.id}`,
    label: t.name,
    description: t.description || 'Template personalizado',
    slug: '', display_name: t.name, color: t.color, icon: t.icon,
    iconNode: <Sparkles className="w-4 h-4" />,
    buildPermissions: () => {
      const out: Record<string, FlagSet> = {};
      ALL_MODULES.forEach(m => {
        const f = (t.permissions?.[m] as FlagSet | undefined);
        out[m] = f ? { ...empty(), ...f } : empty();
      });
      return out;
    },
  }));

  const allTemplates: Template[] = [...TEMPLATES, ...customAsTemplates];
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
      setSelectedTemplate('blank');
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        color: '#7C3AED',
        icon: 'user',
      });
      setSelectedTemplate('blank');
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

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tpl = TEMPLATES.find(t => t.id === templateId);
    if (!tpl || tpl.id === 'blank') return;
    // Prefill form fields with template defaults; user can still tweak before saving.
    setFormData(prev => ({
      ...prev,
      display_name: prev.display_name || tpl.display_name,
      name: prev.name || generateSlug(tpl.display_name),
      description: prev.description || tpl.description,
      color: tpl.color,
      icon: tpl.icon,
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
        const { data: created, error } = await supabase
          .from('profile_types')
          .insert({
            name: formData.name,
            display_name: formData.display_name,
            description: formData.description || null,
            color: formData.color,
            icon: formData.icon,
            is_system: false,
            is_active: true,
          })
          .select('id')
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('Já existe um tipo de perfil com este nome.');
          }
          throw error;
        }

        // Seed permissions from selected template (skip "blank")
        const tpl = TEMPLATES.find(t => t.id === selectedTemplate);
        if (created && tpl && tpl.id !== 'blank') {
          const perms = tpl.buildPermissions();
          const rows = ALL_MODULES
            .filter(m => Object.values(perms[m]).some(Boolean))
            .map(m => ({ profile_type_id: created.id, module: m, ...perms[m] }));
          if (rows.length > 0) {
            const { error: permErr } = await supabase.from('profile_type_permissions').insert(rows);
            if (permErr) {
              console.error('Erro ao aplicar template de permissões:', permErr);
              toast({
                title: 'Perfil criado, mas template falhou',
                description: 'O perfil foi criado, mas as permissões pré-definidas não foram aplicadas. Edite manualmente.',
                variant: 'destructive',
              });
            }
          }
        }

        toast({
          title: 'Tipo de perfil criado',
          description: tpl && tpl.id !== 'blank'
            ? `"${formData.display_name}" criado com permissões do template "${tpl.label}".`
            : `"${formData.display_name}" foi criado com sucesso.`,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tipo de Perfil' : 'Novo Tipo de Perfil'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do tipo de perfil'
              : 'Escolha um template pronto ou crie um perfil personalizado'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Templates pré-definidos
              </Label>
              <p className="text-xs text-muted-foreground">
                Selecione um perfil pronto. Nome, cor, ícone e permissões serão preenchidos automaticamente.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {TEMPLATES.map((tpl) => {
                  const active = selectedTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl.id)}
                      className={`relative text-left p-3 rounded-lg border-2 transition-all ${
                        active
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/40 hover:bg-accent/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${tpl.color}20`, color: tpl.color }}
                        >
                          {tpl.iconNode}
                        </div>
                        <span className="text-sm font-medium leading-tight">{tpl.label}</span>
                        {active && (
                          <Check className="w-4 h-4 text-primary ml-auto shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              {selectedTemplate !== 'blank' && (() => {
                const tpl = TEMPLATES.find(t => t.id === selectedTemplate);
                if (!tpl) return null;
                const perms = tpl.buildPermissions();
                const FLAG_LABELS: Record<keyof FlagSet, string> = {
                  can_view: 'Ver', can_create: 'Criar', can_edit: 'Editar', can_delete: 'Excluir',
                  can_approve: 'Aprovar', can_conciliate: 'Conciliar', can_export: 'Exportar', can_admin: 'Admin',
                };
                const MODULE_LABELS: Record<string, string> = {
                  dashboard_executivo: 'Dashboard Executivo', comercial: 'Comercial', operacional: 'Operacional',
                  financeiro: 'Financeiro', controladoria: 'Controladoria', planejamento: 'Planejamento',
                  cadastros: 'Cadastros', relatorios_bi: 'Relatórios & BI', configuracoes: 'Configurações',
                };
                const rows = ALL_MODULES
                  .map(m => {
                    const granted = (Object.keys(perms[m]) as (keyof FlagSet)[]).filter(f => perms[m][f]);
                    return { module: m, granted };
                  })
                  .filter(r => r.granted.length > 0);
                const totalGranted = rows.reduce((s, r) => s + r.granted.length, 0);
                return (
                  <div className="mt-3 rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold">
                          Pré-visualização das permissões
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {totalGranted} permissão(ões) em {rows.length}/{ALL_MODULES.length} módulo(s)
                      </Badge>
                    </div>
                    {rows.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">
                        Este template não concede nenhuma permissão.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {rows.map(({ module, granted }) => (
                          <div key={module} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="font-medium text-foreground min-w-[140px]">
                              {MODULE_LABELS[module] || module}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {granted.map(f => (
                                <Badge
                                  key={f}
                                  variant="outline"
                                  className="text-[9px] py-0 px-1.5 h-4 bg-primary/5 border-primary/30 text-primary"
                                >
                                  {FLAG_LABELS[f]}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      Você poderá ajustar essas permissões depois em "Permissões".
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

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
