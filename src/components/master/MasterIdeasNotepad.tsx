import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Lightbulb, Plus, Pencil, Trash2, Save, X, Image as ImageIcon, Music, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { IdeaImageUpload, ImagePreview } from './IdeaImageUpload';
import { IdeaAudioRecorder, AudioPreview } from './IdeaAudioRecorder';

interface Attachment {
  id?: string;
  url: string;
  fileName: string;
  filePath: string;
  fileType: 'image' | 'audio';
  transcription?: string;
}

interface Idea {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
}

export function MasterIdeasNotepad() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isMaster = profile?.role === 'admin';

  useEffect(() => {
    if (isMaster && isOpen) {
      fetchIdeas();
    }
  }, [isMaster, isOpen]);

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const { data: ideasData, error: ideasError } = await supabase
        .from('master_ideas')
        .select('*')
        .order('updated_at', { ascending: false });

      if (ideasError) throw ideasError;

      // Fetch attachments for each idea
      const ideasWithAttachments = await Promise.all(
        (ideasData || []).map(async (idea) => {
          const { data: attachmentsData } = await supabase
            .from('master_idea_attachments')
            .select('*')
            .eq('idea_id', idea.id);

          const attachments: Attachment[] = (attachmentsData || []).map(att => ({
            id: att.id,
            url: supabase.storage.from('master-ideas-files').getPublicUrl(att.file_path).data.publicUrl,
            fileName: att.file_name,
            filePath: att.file_path,
            fileType: att.file_type as 'image' | 'audio',
            transcription: att.transcription || undefined,
          }));

          return { ...idea, attachments };
        })
      );

      setIdeas(ideasWithAttachments);
    } catch (error) {
      console.error('Erro ao buscar ideias:', error);
      toast.error('Erro ao carregar ideias');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIdea = async () => {
    if (!newTitle.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      const { data: ideaData, error } = await supabase
        .from('master_ideas')
        .insert({ 
          title: newTitle.trim(), 
          content: newContent.trim() || null,
          created_by: profile?.id 
        })
        .select()
        .single();

      if (error) throw error;

      // Save attachments
      if (pendingAttachments.length > 0 && ideaData) {
        const attachmentsToInsert = pendingAttachments.map(att => ({
          idea_id: ideaData.id,
          file_path: att.filePath,
          file_name: att.fileName,
          file_type: att.fileType,
          transcription: att.transcription || null,
        }));

        await supabase.from('master_idea_attachments').insert(attachmentsToInsert);
      }

      setNewTitle('');
      setNewContent('');
      setPendingAttachments([]);
      fetchIdeas();
      toast.success('Ideia adicionada!');
    } catch (error) {
      console.error('Erro ao adicionar ideia:', error);
      toast.error('Erro ao adicionar ideia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateIdea = async () => {
    if (!editingId || !editTitle.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('master_ideas')
        .update({ 
          title: editTitle.trim(), 
          content: editContent.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;

      // Get current attachments
      const { data: currentAtts } = await supabase
        .from('master_idea_attachments')
        .select('id, file_path')
        .eq('idea_id', editingId);

      const editIds = new Set(editAttachments.filter(a => a.id).map(a => a.id));

      // Delete removed attachments
      const toDelete = (currentAtts || []).filter(a => !editIds.has(a.id));
      for (const att of toDelete) {
        await supabase.storage.from('master-ideas-files').remove([att.file_path]);
        await supabase.from('master_idea_attachments').delete().eq('id', att.id);
      }

      // Insert new attachments
      const newAtts = editAttachments.filter(a => !a.id);
      if (newAtts.length > 0) {
        const attachmentsToInsert = newAtts.map(att => ({
          idea_id: editingId,
          file_path: att.filePath,
          file_name: att.fileName,
          file_type: att.fileType,
          transcription: att.transcription || null,
        }));
        await supabase.from('master_idea_attachments').insert(attachmentsToInsert);
      }

      setEditingId(null);
      setEditTitle('');
      setEditContent('');
      setEditAttachments([]);
      fetchIdeas();
      toast.success('Ideia atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar ideia:', error);
      toast.error('Erro ao atualizar ideia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      // Get attachments to delete files
      const { data: attachments } = await supabase
        .from('master_idea_attachments')
        .select('file_path')
        .eq('idea_id', id);

      // Delete files from storage
      if (attachments && attachments.length > 0) {
        const paths = attachments.map(a => a.file_path);
        await supabase.storage.from('master-ideas-files').remove(paths);
      }

      const { error } = await supabase
        .from('master_ideas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchIdeas();
      toast.success('Ideia excluída!');
    } catch (error) {
      console.error('Erro ao excluir ideia:', error);
      toast.error('Erro ao excluir ideia');
    }
  };

  const startEditing = (idea: Idea) => {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditContent(idea.content || '');
    setEditAttachments(idea.attachments || []);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditAttachments([]);
  };

  const insertTextAtCursor = (text: string, isEdit: boolean) => {
    const textarea = isEdit ? editTextareaRef.current : textareaRef.current;
    const content = isEdit ? editContent : newContent;
    const setContent = isEdit ? setEditContent : setNewContent;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = content.substring(0, start) + text + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
      }, 0);
    } else {
      setContent(prev => prev + text);
    }
  };

  const handleImageUploaded = (url: string, fileName: string, filePath: string, isEdit: boolean) => {
    const attachment: Attachment = { url, fileName, filePath, fileType: 'image' };
    if (isEdit) {
      setEditAttachments(prev => [...prev, attachment]);
    } else {
      setPendingAttachments(prev => [...prev, attachment]);
    }
  };

  const handleAudioSaved = (url: string, fileName: string, filePath: string, transcription?: string, isEdit?: boolean) => {
    const attachment: Attachment = { url, fileName, filePath, fileType: 'audio', transcription };
    if (isEdit) {
      setEditAttachments(prev => [...prev, attachment]);
    } else {
      setPendingAttachments(prev => [...prev, attachment]);
    }
  };

  const removeAttachment = async (index: number, isEdit: boolean) => {
    const attachments = isEdit ? editAttachments : pendingAttachments;
    const setAttachments = isEdit ? setEditAttachments : setPendingAttachments;
    const att = attachments[index];

    // If it's a new attachment (not saved yet), delete from storage
    if (!att.id) {
      await supabase.storage.from('master-ideas-files').remove([att.filePath]);
    }

    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (!isMaster) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          <Lightbulb className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Bloco de Ideias MASTER
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-100px)] mt-4">
          {/* New Idea Form */}
          <Card className="mb-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Ideia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Título da ideia..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea
                ref={textareaRef}
                placeholder="Descrição (suporta markdown para imagens)..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-[100px]"
              />
              
              {/* Media Buttons */}
              <div className="flex gap-2">
                <IdeaImageUpload 
                  onImageUploaded={(url, fileName, filePath) => handleImageUploaded(url, fileName, filePath, false)}
                />
                <IdeaAudioRecorder 
                  onAudioSaved={(url, fileName, filePath, transcription) => handleAudioSaved(url, fileName, filePath, transcription, false)}
                />
              </div>

              {/* Pending Attachments Preview */}
              {pendingAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Anexos:</p>
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((att, idx) => (
                      att.fileType === 'image' ? (
                        <ImagePreview
                          key={idx}
                          url={att.url}
                          fileName={att.fileName}
                          onRemove={() => removeAttachment(idx, false)}
                          onInsert={() => insertTextAtCursor(`![${att.fileName}](${att.url})\n`, false)}
                        />
                      ) : (
                        <AudioPreview
                          key={idx}
                          url={att.url}
                          fileName={att.fileName}
                          transcription={att.transcription}
                          onRemove={() => removeAttachment(idx, false)}
                          onInsertTranscription={att.transcription ? () => insertTextAtCursor(`\n${att.transcription}\n`, false) : undefined}
                        />
                      )
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleAddIdea} 
                className="w-full gap-2"
                disabled={isSaving || !newTitle.trim()}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Ideia
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Ideas List */}
          <ScrollArea className="flex-1 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : ideas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma ideia ainda. Comece a criar!
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {ideas.map((idea) => (
                  <Card key={idea.id} className="relative">
                    {editingId === idea.id ? (
                      <CardContent className="pt-4 space-y-3">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Título..."
                        />
                        <Textarea
                          ref={editTextareaRef}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="Descrição..."
                          className="min-h-[80px]"
                        />
                        
                        {/* Media Buttons */}
                        <div className="flex gap-2">
                          <IdeaImageUpload 
                            onImageUploaded={(url, fileName, filePath) => handleImageUploaded(url, fileName, filePath, true)}
                          />
                          <IdeaAudioRecorder 
                            onAudioSaved={(url, fileName, filePath, transcription) => handleAudioSaved(url, fileName, filePath, transcription, true)}
                          />
                        </div>

                        {/* Edit Attachments Preview */}
                        {editAttachments.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Anexos:</p>
                            <div className="flex flex-wrap gap-2">
                              {editAttachments.map((att, idx) => (
                                att.fileType === 'image' ? (
                                  <ImagePreview
                                    key={idx}
                                    url={att.url}
                                    fileName={att.fileName}
                                    onRemove={() => removeAttachment(idx, true)}
                                    onInsert={() => insertTextAtCursor(`![${att.fileName}](${att.url})\n`, true)}
                                  />
                                ) : (
                                  <AudioPreview
                                    key={idx}
                                    url={att.url}
                                    fileName={att.fileName}
                                    transcription={att.transcription}
                                    onRemove={() => removeAttachment(idx, true)}
                                    onInsertTranscription={att.transcription ? () => insertTextAtCursor(`\n${att.transcription}\n`, true) : undefined}
                                  />
                                )
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={handleUpdateIdea}
                            disabled={isSaving}
                            className="gap-1"
                          >
                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Salvar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={cancelEditing}
                            className="gap-1"
                          >
                            <X className="h-3 w-3" />
                            Cancelar
                          </Button>
                        </div>
                      </CardContent>
                    ) : (
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{idea.title}</h4>
                            {idea.content && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                                {idea.content}
                              </p>
                            )}
                            
                            {/* Attachment indicators */}
                            {idea.attachments && idea.attachments.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {idea.attachments.filter(a => a.fileType === 'image').length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                                    <ImageIcon className="h-3 w-3" />
                                    {idea.attachments.filter(a => a.fileType === 'image').length}
                                  </span>
                                )}
                                {idea.attachments.filter(a => a.fileType === 'audio').length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                                    <Music className="h-3 w-3" />
                                    {idea.attachments.filter(a => a.fileType === 'audio').length}
                                  </span>
                                )}
                              </div>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(idea.updated_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => startEditing(idea)}
                            >
                              <Pencil className="h-3 w-3" />
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
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
