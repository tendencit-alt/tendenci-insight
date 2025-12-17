import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Lightbulb, Plus, Trash2, Edit2, Save, X, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Idea {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export function MasterIdeasNotepad() {
  const { profile } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const isMaster = profile?.role === 'admin';

  useEffect(() => {
    if (isMaster && isOpen) {
      fetchIdeas();
    }
  }, [isMaster, isOpen]);

  const fetchIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('master_ideas')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setIdeas(data || []);
    } catch (error) {
      console.error('Erro ao buscar ideias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIdea = async () => {
    if (!newTitle.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('master_ideas')
        .insert({
          title: newTitle.trim(),
          content: newContent.trim() || null,
          created_by: userData.user?.id
        });

      if (error) throw error;
      
      toast.success('Ideia adicionada!');
      setNewTitle('');
      setNewContent('');
      fetchIdeas();
    } catch (error) {
      console.error('Erro ao adicionar ideia:', error);
      toast.error('Erro ao adicionar ideia');
    }
  };

  const handleUpdateIdea = async (id: string) => {
    if (!editTitle.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      const { error } = await supabase
        .from('master_ideas')
        .update({
          title: editTitle.trim(),
          content: editContent.trim() || null
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Ideia atualizada!');
      setEditingId(null);
      fetchIdeas();
    } catch (error) {
      console.error('Erro ao atualizar ideia:', error);
      toast.error('Erro ao atualizar ideia');
    }
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      const { error } = await supabase
        .from('master_ideas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Ideia removida');
      fetchIdeas();
    } catch (error) {
      console.error('Erro ao deletar ideia:', error);
      toast.error('Erro ao deletar ideia');
    }
  };

  const startEditing = (idea: Idea) => {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditContent(idea.content || '');
  };

  if (!isMaster) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 z-50"
          title="Bloco de Ideias"
        >
          <Lightbulb className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            Bloco de Ideias
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Nova ideia */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Ideia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="Título da ideia..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea
                placeholder="Descrição (opcional)..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={2}
              />
              <Button onClick={handleAddIdea} size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </CardContent>
          </Card>

          {/* Lista de ideias */}
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-2 pr-4">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              ) : ideas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ideia ainda</p>
              ) : (
                ideas.map((idea) => (
                  <Card key={idea.id} className="relative">
                    <CardContent className="pt-4">
                      {editingId === idea.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Título"
                          />
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Descrição"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateIdea(idea.id)}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm">{idea.title}</h4>
                              {idea.content && (
                                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                                  {idea.content}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-2">
                                {format(new Date(idea.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => startEditing(idea)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteIdea(idea.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
