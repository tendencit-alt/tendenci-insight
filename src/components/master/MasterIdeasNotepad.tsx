import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Lightbulb, Plus, Pencil, Trash2, Check, X, CheckCircle2, XCircle, Clock, Sparkles, Image, Mic, Loader2, Save, ArrowUpDown, Eye, AlertTriangle, ArrowUp, Minus, ArrowDown, Star, Trophy, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IdeaImageUpload, ImagePreview } from './IdeaImageUpload';
import { IdeaAudioRecorder, AudioPreview } from './IdeaAudioRecorder';
import { IdeaRating } from './IdeaRating';
import { IdeaComments } from './IdeaComments';
import { IdeaDetailSheet } from './IdeaDetailSheet';
import { IdeaImageLightbox } from './IdeaImageLightbox';

// Emails autorizados a excluir ideias
const AUTHORIZED_DELETE_EMAILS = ['csoares_felipe@hotmail.com', 'matheus@tendenci.com.br'];

type IdeaStatus = 'em_pauta' | 'aprovada' | 'recusada' | 'implementada';
type IdeaCategoria = 'marketing' | 'producao' | 'vendas' | 'financeiro' | 'geral';
type SortOption = 'date' | 'rating' | 'comments' | 'priority';
type PrioridadeFilter = 'all' | '1' | '2' | '3' | '4' | '5';
type RatingFilter = 'all' | '4+' | '3+' | '2+' | 'unrated';

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
  status: IdeaStatus;
  categoria: IdeaCategoria;
  prioridade: number;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  motivo_recusa: string | null;
  attachments: Attachment[];
  averageRating?: number;
  totalRatings?: number;
  totalComments?: number;
  author?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
  approver?: {
    full_name: string;
  };
}

const STATUS_CONFIG: Record<IdeaStatus, { label: string; color: string; icon: typeof Clock }> = {
  em_pauta: { label: 'Em Pauta', color: 'bg-amber-500', icon: Clock },
  aprovada: { label: 'Aprovadas', color: 'bg-green-500', icon: Check },
  recusada: { label: 'Recusadas', color: 'bg-destructive', icon: X },
  implementada: { label: 'Implementadas', color: 'bg-primary', icon: Sparkles },
};

const CATEGORIA_CONFIG: Record<IdeaCategoria, { label: string; color: string }> = {
  marketing: { label: 'Marketing', color: 'bg-purple-500 text-white' },
  producao: { label: 'Produção', color: 'bg-orange-500 text-white' },
  vendas: { label: 'Vendas', color: 'bg-emerald-500 text-white' },
  financeiro: { label: 'Financeiro', color: 'bg-blue-500 text-white' },
  geral: { label: 'Geral', color: 'bg-muted-foreground text-white' },
};

const PRIORIDADE_CONFIG: Record<number, { label: string; color: string; bgColor: string; icon: typeof AlertTriangle }> = {
  1: { label: 'Crítica', color: 'text-red-600', bgColor: 'bg-red-500', icon: AlertTriangle },
  2: { label: 'Alta', color: 'text-orange-600', bgColor: 'bg-orange-500', icon: ArrowUp },
  3: { label: 'Média', color: 'text-yellow-600', bgColor: 'bg-yellow-500', icon: Minus },
  4: { label: 'Baixa', color: 'text-green-600', bgColor: 'bg-green-500', icon: ArrowDown },
  5: { label: 'Sugestão', color: 'text-blue-600', bgColor: 'bg-blue-500', icon: Lightbulb },
};

const SORT_OPTIONS: Record<SortOption, string> = {
  date: 'Mais Recentes',
  rating: 'Melhor Avaliadas',
  comments: 'Mais Comentadas',
  priority: 'Prioridade',
};

export function MasterIdeasNotepad() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<IdeaStatus>('em_pauta');
  const [filterCategoria, setFilterCategoria] = useState<IdeaCategoria | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  
  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategoria, setNewCategoria] = useState<IdeaCategoria>('geral');
  const [newPrioridade, setNewPrioridade] = useState<number>(3);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [filterPrioridade, setFilterPrioridade] = useState<PrioridadeFilter>('all');
  const [filterRating, setFilterRating] = useState<RatingFilter>('all');
  
  // Detail sheet states
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  
  // Lightbox states
  const [lightboxImages, setLightboxImages] = useState<{ url: string; fileName: string }[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategoria, setEditCategoria] = useState<IdeaCategoria>('geral');
  const [editPrioridade, setEditPrioridade] = useState<number>(3);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>();
  
  // Action states
  const [motivoRecusa, setMotivoRecusa] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = profile?.role === 'admin';
  const canDelete = profile?.email && AUTHORIZED_DELETE_EMAILS.includes(profile.email);

  useEffect(() => {
    if (isOpen && user) {
      fetchIdeas();
      setupRealtimeSubscription();
    }
  }, [isOpen, user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('brainstorm-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'master_ideas' }, () => {
        fetchIdeas();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'master_idea_ratings' }, () => {
        fetchIdeas();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'master_idea_comments' }, () => {
        fetchIdeas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchIdeas = async () => {
    setIsLoading(true);
    try {
      const { data: ideasData, error } = await supabase
        .from('master_ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch authors, attachments, ratings, and comments count
      const ideasWithDetails = await Promise.all(
        (ideasData || []).map(async (idea) => {
          // Fetch author
          let author = undefined;
          if (idea.created_by) {
            const { data: authorData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url, email')
              .eq('id', idea.created_by)
              .single();
            author = authorData || undefined;
          }

          // Fetch approver
          let approver = undefined;
          if (idea.aprovado_por) {
            const { data: approverData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', idea.aprovado_por)
              .single();
            approver = approverData || undefined;
          }

          // Fetch attachments
          const { data: attachmentsData } = await supabase
            .from('master_idea_attachments')
            .select('*')
            .eq('idea_id', idea.id);

          const attachments: Attachment[] = await Promise.all(
            (attachmentsData || []).map(async (att) => {
              const { data: signed } = await supabase.storage
                .from('master-ideas-files')
                .createSignedUrl(att.file_path, 60 * 60);
              return {
                id: att.id,
                url: signed?.signedUrl ?? '',
                fileName: att.file_name,
                filePath: att.file_path,
                fileType: att.file_type as 'image' | 'audio',
                transcription: att.transcription || undefined,
              };
            })
          );

          // Fetch ratings
          const { data: ratingsData } = await supabase
            .from('master_idea_ratings')
            .select('rating')
            .eq('idea_id', idea.id);

          const averageRating = ratingsData && ratingsData.length > 0
            ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
            : 0;

          // Fetch comments count
          const { count: commentsCount } = await supabase
            .from('master_idea_comments')
            .select('*', { count: 'exact', head: true })
            .eq('idea_id', idea.id);

          return {
            ...idea,
            status: (idea.status || 'em_pauta') as IdeaStatus,
            categoria: (idea.categoria || 'geral') as IdeaCategoria,
            prioridade: idea.prioridade || 3,
            attachments,
            averageRating,
            totalRatings: ratingsData?.length || 0,
            totalComments: commentsCount || 0,
            author,
            approver,
          };
        })
      );

      setIdeas(ideasWithDetails);
    } catch (error) {
      console.error('Error fetching ideas:', error);
      toast.error('Erro ao carregar ideias');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIdea = async () => {
    if (!newTitle.trim() || !user) return;

    setIsSaving(true);
    try {
      const { data: newIdea, error } = await supabase
        .from('master_ideas')
        .insert({
          title: newTitle.trim(),
          content: newContent.trim() || null,
          categoria: newCategoria,
          prioridade: newPrioridade,
          status: 'em_pauta',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Save attachments
      for (const att of pendingAttachments) {
        await supabase.from('master_idea_attachments').insert({
          idea_id: newIdea.id,
          file_path: att.filePath,
          file_name: att.fileName,
          file_type: att.fileType,
          transcription: att.transcription || null,
        });
      }

      toast.success('Ideia adicionada com sucesso!');
      setNewTitle('');
      setNewContent('');
      setNewCategoria('geral');
      setNewPrioridade(3);
      setPendingAttachments([]);
      fetchIdeas();
    } catch (error) {
      console.error('Error adding idea:', error);
      toast.error('Erro ao adicionar ideia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateIdea = async (id: string) => {
    if (!editTitle.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('master_ideas')
        .update({
          title: editTitle.trim(),
          content: editContent.trim() || null,
          categoria: editCategoria,
          prioridade: editPrioridade,
        })
        .eq('id', id);

      if (error) throw error;

      // Get current attachments
      const { data: currentAtts } = await supabase
        .from('master_idea_attachments')
        .select('id, file_path')
        .eq('idea_id', id);

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
          idea_id: id,
          file_path: att.filePath,
          file_name: att.fileName,
          file_type: att.fileType,
          transcription: att.transcription || null,
        }));
        await supabase.from('master_idea_attachments').insert(attachmentsToInsert);
      }

      toast.success('Ideia atualizada!');
      setEditingId(null);
      setEditTitle('');
      setEditContent('');
      setEditCategoria('geral');
      setEditPrioridade(3);
      setEditAttachments([]);
      fetchIdeas();
    } catch (error) {
      console.error('Error updating idea:', error);
      toast.error('Erro ao atualizar ideia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      const idea = ideas.find(i => i.id === id);
      
      // Delete attachments from storage
      if (idea?.attachments.length) {
        await supabase.storage.from('master-ideas-files').remove(
          idea.attachments.map(att => att.filePath)
        );
      }

      const { error } = await supabase
        .from('master_ideas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Ideia excluída!');
      fetchIdeas();
    } catch (error) {
      console.error('Error deleting idea:', error);
      toast.error('Erro ao excluir ideia');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('master_ideas')
        .update({
          status: 'aprovada',
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Ideia aprovada!');
      fetchIdeas();
    } catch (error) {
      console.error('Error approving idea:', error);
      toast.error('Erro ao aprovar ideia');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('master_ideas')
        .update({
          status: 'recusada',
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
          motivo_recusa: motivoRecusa.trim() || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Ideia recusada');
      setMotivoRecusa('');
      fetchIdeas();
    } catch (error) {
      console.error('Error rejecting idea:', error);
      toast.error('Erro ao recusar ideia');
    }
  };

  const handleImplement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('master_ideas')
        .update({ status: 'implementada' })
        .eq('id', id);

      if (error) throw error;

      toast.success('Ideia marcada como implementada!');
      fetchIdeas();
    } catch (error) {
      console.error('Error implementing idea:', error);
      toast.error('Erro ao marcar como implementada');
    }
  };

  const startEditing = (idea: Idea) => {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditContent(idea.content || '');
    setEditCategoria(idea.categoria);
    setEditPrioridade(idea.prioridade || 3);
    setEditAttachments([...idea.attachments]);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditCategoria('geral');
    setEditPrioridade(3);
    setEditAttachments([]);
  };
  
  const openIdeaDetail = (idea: Idea) => {
    setSelectedIdea(idea);
    setDetailSheetOpen(true);
  };

  const openImageLightbox = (images: Attachment[], startIndex: number) => {
    setLightboxImages(images.map(a => ({ url: a.url, fileName: a.fileName })));
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
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

  const handleAudioSaved = (url: string, fileName: string, filePath: string, transcription: string | undefined, isEdit: boolean) => {
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

  // Métricas de avaliação para ideias aprovadas
  const approvedIdeas = ideas.filter(i => i.status === 'aprovada');
  const approvedWithRatings = approvedIdeas.filter(i => (i.totalRatings || 0) > 0);
  const approvedAverageRating = approvedWithRatings.length > 0
    ? approvedWithRatings.reduce((sum, i) => sum + (i.averageRating || 0), 0) / approvedWithRatings.length
    : 0;
  const topRatedCount = approvedIdeas.filter(i => (i.averageRating || 0) >= 4).length;
  const unratedCount = approvedIdeas.filter(i => (i.totalRatings || 0) === 0).length;

  const sortedAndFilteredIdeas = ideas
    .filter(idea => {
      const matchesStatus = idea.status === activeTab;
      const matchesCategoria = filterCategoria === 'all' || idea.categoria === filterCategoria;
      const matchesPrioridade = filterPrioridade === 'all' || idea.prioridade === Number(filterPrioridade);
      
      // Filtro por rating
      let matchesRating = true;
      if (filterRating !== 'all') {
        const rating = idea.averageRating || 0;
        const hasRatings = (idea.totalRatings || 0) > 0;
        
        switch (filterRating) {
          case '4+':
            matchesRating = rating >= 4;
            break;
          case '3+':
            matchesRating = rating >= 3;
            break;
          case '2+':
            matchesRating = rating >= 2;
            break;
          case 'unrated':
            matchesRating = !hasRatings;
            break;
        }
      }
      
      return matchesStatus && matchesCategoria && matchesPrioridade && matchesRating;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.averageRating || 0) - (a.averageRating || 0);
        case 'comments':
          return (b.totalComments || 0) - (a.totalComments || 0);
        case 'priority':
          return (a.prioridade || 3) - (b.prioridade || 3);
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const countByStatus = (status: IdeaStatus) => ideas.filter(i => i.status === status).length;

  const canEdit = (idea: Idea) => idea.created_by === user?.id || isAdmin;

  if (!user) return null;

  const PrioridadeBadge = ({ prioridade }: { prioridade: number }) => {
    const config = PRIORIDADE_CONFIG[prioridade] || PRIORIDADE_CONFIG[3];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} text-xs`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg z-40"
          size="icon"
        >
          <Lightbulb className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Brainstorm Empresarial
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as IdeaStatus)} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-4">
            <TabsList className="w-full grid grid-cols-4">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <TabsTrigger key={key} value={key} className="text-xs">
                  {config.label} ({countByStatus(key as IdeaStatus)})
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* KPIs de Avaliação - apenas na aba Aprovadas */}
          {activeTab === 'aprovada' && approvedIdeas.length > 0 && (
            <div className="px-4 pt-3">
              <div className="grid grid-cols-3 gap-2 p-3 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-600">
                    <Star className="h-4 w-4 fill-amber-500" />
                    <span className="text-lg font-bold">{approvedAverageRating.toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Média Geral</span>
                </div>
                <div className="text-center border-x border-amber-500/20">
                  <div className="flex items-center justify-center gap-1 text-emerald-600">
                    <Trophy className="h-4 w-4" />
                    <span className="text-lg font-bold">{topRatedCount}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Top Rated (≥4)</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-lg font-bold">{approvedIdeas.length}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-3 flex flex-wrap gap-2">
            <Select value={filterCategoria} onValueChange={(v) => setFilterCategoria(v as IdeaCategoria | 'all')}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(CATEGORIA_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPrioridade} onValueChange={(v) => setFilterPrioridade(v as PrioridadeFilter)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(PRIORIDADE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRating} onValueChange={(v) => setFilterRating(v as RatingFilter)}>
              <SelectTrigger className="w-[140px]">
                <Star className="h-3 w-3 mr-2" />
                <SelectValue placeholder="Avaliação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Notas</SelectItem>
                <SelectItem value="4+">⭐⭐⭐⭐+ (≥4)</SelectItem>
                <SelectItem value="3+">⭐⭐⭐+ (≥3)</SelectItem>
                <SelectItem value="2+">⭐⭐+ (≥2)</SelectItem>
                <SelectItem value="unrated">Sem Avaliação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="h-3 w-3 mr-2" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_OPTIONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1 px-4">
            {/* New Idea Form */}
            <Card className="mb-4 border-dashed border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Ideia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Título da ideia..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={newCategoria} onValueChange={(v) => setNewCategoria(v as IdeaCategoria)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIA_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  ref={textareaRef}
                  placeholder="Descreva sua ideia..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <IdeaImageUpload 
                    onImageUploaded={(url, name, path) => handleImageUploaded(url, name, path, false)} 
                    disabled={false} 
                  />
                  <IdeaAudioRecorder 
                    onAudioSaved={(url, name, path, trans) => handleAudioSaved(url, name, path, trans, false)} 
                    disabled={false} 
                  />
                </div>
                {pendingAttachments.length > 0 && (
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
                )}
                <Button onClick={handleAddIdea} disabled={!newTitle.trim() || isSaving} className="w-full">
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Adicionar Ideia
                </Button>
              </CardContent>
            </Card>

            {/* Ideas List */}
            <div className="space-y-3 pb-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sortedAndFilteredIdeas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma ideia {STATUS_CONFIG[activeTab].label.toLowerCase()}
                </div>
              ) : (
                sortedAndFilteredIdeas.map((idea) => {
                  const isTopRated = (idea.averageRating || 0) >= 4 && (idea.totalRatings || 0) > 0;
                  return (
                  <Card key={idea.id} className={`relative ${isTopRated ? 'ring-2 ring-amber-400/50 bg-gradient-to-r from-amber-500/5 to-transparent' : ''}`}>
                    <CardContent className="p-4">
                      {editingId === idea.id ? (
                        /* Edit Mode */
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="flex-1"
                            />
                            <Select value={editCategoria} onValueChange={(v) => setEditCategoria(v as IdeaCategoria)}>
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(CATEGORIA_CONFIG).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            ref={editTextareaRef}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <IdeaImageUpload 
                              onImageUploaded={(url, name, path) => handleImageUploaded(url, name, path, true)} 
                              disabled={false} 
                            />
                            <IdeaAudioRecorder 
                              onAudioSaved={(url, name, path, trans) => handleAudioSaved(url, name, path, trans, true)} 
                              disabled={false} 
                            />
                          </div>
                          {editAttachments.length > 0 && (
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
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateIdea(idea.id)} disabled={isSaving}>
                              {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                              Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <>
                          <div className="flex items-start gap-2 mb-2">
                            <Badge className={`${CATEGORIA_CONFIG[idea.categoria].color} text-xs`}>
                              {CATEGORIA_CONFIG[idea.categoria].label}
                            </Badge>
                            {isTopRated && (
                              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs gap-1">
                                <Trophy className="h-3 w-3" />
                                Top Rated
                              </Badge>
                            )}
                            <h4 className="font-semibold flex-1">{idea.title}</h4>
                          </div>

                          {/* Star Rating */}
                          <div className="mb-2">
                            <IdeaRating ideaId={idea.id} onRatingChange={fetchIdeas} />
                          </div>
                          
                          {idea.content && (
                            <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                              {idea.content}
                            </p>
                          )}

                          {/* Image Thumbnails */}
                          {idea.attachments.filter(a => a.fileType === 'image').length > 0 && (
                            <div className="flex gap-2 mb-3 flex-wrap">
                              {idea.attachments
                                .filter(a => a.fileType === 'image')
                                .slice(0, 4)
                                .map((att, idx) => (
                                  <div
                                    key={att.id || idx}
                                    className="w-16 h-16 rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border bg-muted"
                                    onClick={() => openImageLightbox(idea.attachments.filter(a => a.fileType === 'image'), idx)}
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.fileName}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              {idea.attachments.filter(a => a.fileType === 'image').length > 4 && (
                                <div 
                                  className="w-16 h-16 rounded-md flex items-center justify-center bg-muted border cursor-pointer hover:bg-muted/80 transition-colors"
                                  onClick={() => openImageLightbox(idea.attachments.filter(a => a.fileType === 'image'), 4)}
                                >
                                  <span className="text-xs text-muted-foreground font-medium">
                                    +{idea.attachments.filter(a => a.fileType === 'image').length - 4}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Audio indicators */}
                          {idea.attachments.filter(a => a.fileType === 'audio').length > 0 && (
                            <div className="flex gap-2 mb-3">
                              <Badge variant="outline" className="text-xs">
                                <Mic className="h-3 w-3 mr-1" />
                                {idea.attachments.filter(a => a.fileType === 'audio').length} áudio(s)
                              </Badge>
                            </div>
                          )}

                          {/* Author info */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={idea.author?.avatar_url || ''} />
                              <AvatarFallback className="text-[8px]">
                                {idea.author?.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{idea.author?.full_name || 'Usuário'}</span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>

                          {/* Rejection reason */}
                          {idea.status === 'recusada' && idea.motivo_recusa && (
                            <div className="bg-destructive/10 text-destructive text-xs p-2 rounded mb-3">
                              <strong>Motivo:</strong> {idea.motivo_recusa}
                            </div>
                          )}

                          {/* Approval info */}
                          {(idea.status === 'aprovada' || idea.status === 'implementada') && idea.approver && (
                            <div className="text-xs text-muted-foreground mb-3">
                              Aprovada por {idea.approver.full_name}
                              {idea.aprovado_em && ` em ${new Date(idea.aprovado_em).toLocaleDateString('pt-BR')}`}
                            </div>
                          )}

                          {/* Comments Section */}
                          <div className="mb-3">
                            <IdeaComments ideaId={idea.id} onCommentChange={fetchIdeas} />
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            {/* View Detail button */}
                            <Button size="sm" variant="outline" onClick={() => openIdeaDetail(idea)}>
                              <Eye className="h-3 w-3 mr-1" />
                              Ver Detalhes
                            </Button>
                            {/* Author/Admin actions */}
                            {canEdit(idea) && idea.status === 'em_pauta' && (
                              <Button size="sm" variant="outline" onClick={() => startEditing(idea)}>
                                <Pencil className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                            )}
                            
                            {canDelete && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="text-destructive">
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Excluir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir ideia?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteIdea(idea.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {/* Admin approval actions */}
                            {isAdmin && idea.status === 'em_pauta' && (
                              <>
                                <Button size="sm" onClick={() => handleApprove(idea.id)} className="bg-green-600 hover:bg-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Aprovar
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Recusar
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Recusar ideia</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        <Textarea
                                          placeholder="Motivo da recusa (opcional)"
                                          value={motivoRecusa}
                                          onChange={(e) => setMotivoRecusa(e.target.value)}
                                          className="mt-2"
                                        />
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setMotivoRecusa('')}>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleReject(idea.id)}>
                                        Recusar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}

                            {/* Implement action */}
                            {isAdmin && idea.status === 'aprovada' && (
                              <Button size="sm" onClick={() => handleImplement(idea.id)}>
                                <Sparkles className="h-3 w-3 mr-1" />
                                Marcar Implementada
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
    
    {/* Detail Sheet */}
    <IdeaDetailSheet
      idea={selectedIdea}
      isOpen={detailSheetOpen}
      onClose={() => setDetailSheetOpen(false)}
      onRatingChange={fetchIdeas}
      onCommentChange={fetchIdeas}
    />
    
    {/* Image Lightbox */}
    <IdeaImageLightbox
      images={lightboxImages}
      initialIndex={lightboxIndex}
      isOpen={lightboxOpen}
      onClose={() => setLightboxOpen(false)}
    />
    </>
  );
}
