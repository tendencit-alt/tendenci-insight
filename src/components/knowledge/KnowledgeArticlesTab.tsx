import { useState } from 'react';
import { useKnowledgeArticles, KNOWLEDGE_CATEGORIES, CATEGORY_LABELS } from '@/hooks/useKnowledgeData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Loader2, BookOpen, Eye, ThumbsUp, Clock } from 'lucide-react';

const q = (t: string) => (supabase as any).from(t);

const diffColors: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-500',
  intermediate: 'bg-yellow-500/10 text-yellow-500',
  advanced: 'bg-red-500/10 text-red-500',
};

export function KnowledgeArticlesTab() {
  const queryClient = useQueryClient();
  const [filterCat, setFilterCat] = useState<string>('');
  const { data: articles, isLoading } = useKnowledgeArticles(filterCat || undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'primeiros_passos', tags: '', difficulty: 'beginner', read_time_minutes: 5, screen_key: '', active: true });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()) : [] };
      delete payload.tags_str;
      if (editing) {
        const { error } = await q('knowledge_articles').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await q('knowledge_articles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast.success(editing ? 'Artigo atualizado!' : 'Artigo criado!');
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reset = () => { setForm({ title: '', content: '', category: 'primeiros_passos', tags: '', difficulty: 'beginner', read_time_minutes: 5, screen_key: '', active: true }); setEditing(null); setDialogOpen(false); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Base de Conhecimento</h2>
        <div className="flex gap-2">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas categorias" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {KNOWLEDGE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={o => { if (!o) reset(); setDialogOpen(o); }}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Novo Artigo</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? 'Editar Artigo' : 'Novo Artigo'}</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
                <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Conteúdo</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={6} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Categoria</Label>
                    <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{KNOWLEDGE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Dificuldade</Label>
                    <Select value={form.difficulty} onValueChange={v => setForm(p => ({ ...p, difficulty: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Iniciante</SelectItem>
                        <SelectItem value="intermediate">Intermediário</SelectItem>
                        <SelectItem value="advanced">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Tags (separadas por vírgula)</Label><Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Tempo Leitura (min)</Label><Input type="number" value={form.read_time_minutes} onChange={e => setForm(p => ({ ...p, read_time_minutes: parseInt(e.target.value) || 5 }))} min={1} /></div>
                </div>
                <div className="space-y-2"><Label>Screen Key (contextual)</Label><Input value={form.screen_key} onChange={e => setForm(p => ({ ...p, screen_key: e.target.value }))} placeholder="ex: financeiro, dre, conciliacao" /></div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? 'Atualizar' : 'Criar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Artigo</TableHead><TableHead>Categoria</TableHead><TableHead>Dificuldade</TableHead><TableHead><Clock className="h-4 w-4" /></TableHead><TableHead><Eye className="h-4 w-4" /></TableHead><TableHead><ThumbsUp className="h-4 w-4" /></TableHead><TableHead className="w-[60px]" />
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : articles?.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell><div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" /><div><div className="font-medium">{a.title}</div>{a.tags?.length > 0 && <div className="flex gap-1 mt-0.5">{a.tags.slice(0, 3).map((t: string) => <Badge key={t} variant="outline" className="text-[10px] px-1">{t}</Badge>)}</div>}</div></div></TableCell>
                <TableCell><Badge variant="secondary">{CATEGORY_LABELS[a.category] || a.category}</Badge></TableCell>
                <TableCell><Badge className={diffColors[a.difficulty] || ''}>{a.difficulty}</Badge></TableCell>
                <TableCell className="text-sm">{a.read_time_minutes}min</TableCell>
                <TableCell className="text-sm">{a.view_count}</TableCell>
                <TableCell className="text-sm">{a.helpful_count}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => { setEditing(a); setForm({ title: a.title, content: a.content, category: a.category, tags: (a.tags || []).join(', '), difficulty: a.difficulty, read_time_minutes: a.read_time_minutes, screen_key: a.screen_key || '', active: a.active }); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
