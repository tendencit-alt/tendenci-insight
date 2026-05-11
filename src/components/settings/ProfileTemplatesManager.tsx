import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  useProfileTemplates, useUpsertProfileTemplate, useDeleteProfileTemplate,
  type ProfileTypeTemplate, type TemplateFlagSet, type TemplatePermissions,
} from '@/hooks/useProfileTemplates';
import { Plus, Edit2, Trash2, Loader2, Lock, Sparkles, ChevronLeft } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALL_MODULES = [
  'dashboard_executivo', 'comercial', 'operacional', 'financeiro',
  'controladoria', 'planejamento', 'cadastros', 'relatorios_bi', 'configuracoes',
];

const MODULE_LABELS: Record<string, string> = {
  dashboard_executivo: 'Dashboard Executivo', comercial: 'Comercial', operacional: 'Operacional',
  financeiro: 'Financeiro', controladoria: 'Controladoria', planejamento: 'Planejamento',
  cadastros: 'Cadastros', relatorios_bi: 'Relatórios & BI', configuracoes: 'Configurações',
};

const FLAGS: { key: keyof TemplateFlagSet; label: string }[] = [
  { key: 'can_view', label: 'Ver' },
  { key: 'can_create', label: 'Criar' },
  { key: 'can_edit', label: 'Editar' },
  { key: 'can_delete', label: 'Excluir' },
];

const PRESET_COLORS = ['#7C3AED', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899', '#6B7280', '#8B5CF6'];

const emptyFlags = (): TemplateFlagSet => ({
  can_view: false, can_create: false, can_edit: false, can_delete: false,
  can_approve: false, can_conciliate: false, can_export: false, can_admin: false,
});

const emptyPermissions = (): TemplatePermissions => {
  const out: TemplatePermissions = {};
  ALL_MODULES.forEach(m => { out[m] = emptyFlags(); });
  return out;
};

export function ProfileTemplatesManager({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: templates = [], isLoading } = useProfileTemplates();
  const upsert = useUpsertProfileTemplate();
  const delMut = useDeleteProfileTemplate();

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<ProfileTypeTemplate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProfileTypeTemplate | null>(null);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState('#7C3AED');
  const [formPerms, setFormPerms] = useState<TemplatePermissions>(emptyPermissions());

  useEffect(() => {
    if (!open) {
      setView('list');
      setEditing(null);
    }
  }, [open]);

  const startCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDesc('');
    setFormColor('#7C3AED');
    setFormPerms(emptyPermissions());
    setView('form');
  };

  const startEdit = (tpl: ProfileTypeTemplate) => {
    setEditing(tpl);
    setFormName(tpl.name);
    setFormDesc(tpl.description || '');
    setFormColor(tpl.color);
    // Garante shape completo (alguns módulos podem estar ausentes no JSON salvo)
    const merged = emptyPermissions();
    Object.entries(tpl.permissions || {}).forEach(([m, f]) => {
      if (merged[m]) merged[m] = { ...merged[m], ...(f as TemplateFlagSet) };
    });
    setFormPerms(merged);
    setView('form');
  };

  const toggleFlag = (module: string, flag: keyof TemplateFlagSet) => {
    setFormPerms(prev => ({
      ...prev,
      [module]: { ...prev[module], [flag]: !prev[module][flag] },
    }));
  };

  const toggleModuleAll = (module: string, checked: boolean) => {
    const next: TemplateFlagSet = { ...emptyFlags() };
    FLAGS.forEach(f => { next[f.key] = checked; });
    setFormPerms(prev => ({ ...prev, [module]: next }));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe um nome para o template.', variant: 'destructive' });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: editing?.id,
        name: formName.trim(),
        description: formDesc.trim() || null,
        color: formColor,
        icon: editing?.icon || 'user',
        permissions: formPerms,
      });
      toast({
        title: editing ? 'Template atualizado' : 'Template criado',
        description: `"${formName.trim()}" salvo com sucesso.`,
      });
      setView('list');
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar',
        description: e?.message?.includes('duplicate') ? 'Já existe um template com esse nome.' : (e?.message || 'Falha ao salvar template.'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await delMut.mutateAsync(confirmDelete.id);
      toast({ title: 'Template excluído', description: `"${confirmDelete.name}" foi removido.` });
      setConfirmDelete(null);
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e?.message || 'Falha ao excluir.', variant: 'destructive' });
    }
  };

  const totalGranted = useMemo(
    () => ALL_MODULES.reduce((acc, m) => acc + FLAGS.filter(f => formPerms[m]?.[f.key]).length, 0),
    [formPerms]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Templates de Pré-Perfis
            </DialogTitle>
            <DialogDescription>
              {view === 'list'
                ? 'Crie, renomeie e edite templates reutilizáveis para criar novos perfis rapidamente.'
                : editing ? `Editando "${editing.name}"` : 'Novo template de pré-perfil'}
            </DialogDescription>
          </DialogHeader>

          {view === 'list' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={startCreate} className="gap-2">
                  <Plus className="w-4 h-4" /> Novo Template
                </Button>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum template ainda. Crie o primeiro!
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map(tpl => {
                    const granted = ALL_MODULES.reduce(
                      (acc, m) => acc + FLAGS.filter(f => (tpl.permissions?.[m] as TemplateFlagSet | undefined)?.[f.key]).length,
                      0
                    );
                    const modulesUsed = ALL_MODULES.filter(
                      m => FLAGS.some(f => (tpl.permissions?.[m] as TemplateFlagSet | undefined)?.[f.key])
                    ).length;
                    return (
                      <div
                        key={tpl.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${tpl.color}25`, color: tpl.color }}
                          >
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">{tpl.name}</span>
                              {tpl.is_builtin && (
                                <Badge variant="secondary" className="text-[9px] gap-1">
                                  <Lock className="w-3 h-3" /> Sistema
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[9px]">
                                {granted} permissão(ões) · {modulesUsed} módulo(s)
                              </Badge>
                            </div>
                            {tpl.description && (
                              <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(tpl)}
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmDelete(tpl)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === 'form' && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setView('list')} className="gap-1 -ml-2">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Ex: Vendedor Pleno"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${formColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Para que serve este template..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Permissões por módulo</Label>
                  <Badge variant="secondary" className="text-[10px]">
                    {totalGranted} permissão(ões) selecionada(s)
                  </Badge>
                </div>
                <ScrollArea className="h-[320px] rounded-md border">
                  <div className="p-2 space-y-1">
                    {ALL_MODULES.map(m => {
                      const allChecked = FLAGS.every(f => formPerms[m]?.[f.key]);
                      return (
                        <div key={m} className="rounded-md border bg-card/50 p-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={allChecked}
                                onCheckedChange={(v) => toggleModuleAll(m, !!v)}
                              />
                              <span className="text-sm font-medium">{MODULE_LABELS[m]}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-6">
                            {FLAGS.map(f => (
                              <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer">
                                <Checkbox
                                  checked={!!formPerms[m]?.[f.key]}
                                  onCheckedChange={() => toggleFlag(m, f.key)}
                                />
                                {f.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setView('list')} disabled={upsert.isPending}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={upsert.isPending}>
                  {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editing ? 'Salvar alterações' : 'Criar template'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{confirmDelete?.name}"? Perfis já criados a partir dele não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={delMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {delMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
