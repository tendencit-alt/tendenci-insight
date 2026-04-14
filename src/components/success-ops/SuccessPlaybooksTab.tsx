import { useState } from 'react';
import { usePlaybooks } from '@/hooks/useSuccessOpsData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Loader2, BookOpen } from 'lucide-react';

const q = (t: string) => (supabase as any).from(t);

export function SuccessPlaybooksTab() {
  const queryClient = useQueryClient();
  const { data: playbooks, isLoading } = usePlaybooks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', trigger_type: '', active: true, priority: 5 });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editing) {
        const { error } = await q('success_playbooks').update(data).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await q('success_playbooks').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['success-playbooks'] });
      toast.success(editing ? 'Playbook atualizado!' : 'Playbook criado!');
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reset = () => { setForm({ name: '', description: '', trigger_type: '', active: true, priority: 5 }); setEditing(null); setDialogOpen(false); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Playbooks Automáticos</h2>
        <Dialog open={dialogOpen} onOpenChange={o => { if (!o) reset(); setDialogOpen(o); }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Novo Playbook</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar Playbook' : 'Novo Playbook'}</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Trigger</Label><Input value={form.trigger_type} onChange={e => setForm(p => ({ ...p, trigger_type: e.target.value }))} placeholder="ex: no_access_7d, no_dre, payment_overdue" required /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Prioridade</Label><Input type="number" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) || 5 }))} min={1} max={10} /></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={form.active} onCheckedChange={v => setForm(p => ({ ...p, active: v }))} /><Label>Ativo</Label></div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? 'Atualizar' : 'Criar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Playbook</TableHead><TableHead>Trigger</TableHead><TableHead>Prioridade</TableHead><TableHead>Execuções</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : playbooks?.map((pb: any) => (
              <TableRow key={pb.id}>
                <TableCell className="font-medium"><div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" /><div><div>{pb.name}</div>{pb.description && <div className="text-xs text-muted-foreground">{pb.description}</div>}</div></div></TableCell>
                <TableCell><Badge variant="outline">{pb.trigger_type}</Badge></TableCell>
                <TableCell>{pb.priority}</TableCell>
                <TableCell>{pb.execution_count}</TableCell>
                <TableCell><Badge variant={pb.active ? 'default' : 'secondary'}>{pb.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => { setEditing(pb); setForm({ name: pb.name, description: pb.description || '', trigger_type: pb.trigger_type, active: pb.active, priority: pb.priority }); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
