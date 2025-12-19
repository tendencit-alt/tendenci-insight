import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, Check, X, Sparkles, Star, Image as ImageIcon, 
  Mic, Calendar, User, MessageSquare, Play, Pause,
  AlertTriangle, ArrowUp, Minus, ArrowDown, Lightbulb
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IdeaRating } from './IdeaRating';
import { IdeaComments } from './IdeaComments';
import { IdeaImageLightbox } from './IdeaImageLightbox';

type IdeaStatus = 'em_pauta' | 'aprovada' | 'recusada' | 'implementada';
type IdeaCategoria = 'marketing' | 'producao' | 'vendas' | 'financeiro' | 'geral';

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

interface IdeaDetailSheetProps {
  idea: Idea | null;
  isOpen: boolean;
  onClose: () => void;
  onRatingChange?: () => void;
  onCommentChange?: () => void;
}

const STATUS_CONFIG: Record<IdeaStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  em_pauta: { label: 'Em Pauta', color: 'text-amber-600', bgColor: 'bg-amber-500/10', icon: Clock },
  aprovada: { label: 'Aprovada', color: 'text-green-600', bgColor: 'bg-green-500/10', icon: Check },
  recusada: { label: 'Recusada', color: 'text-destructive', bgColor: 'bg-destructive/10', icon: X },
  implementada: { label: 'Implementada', color: 'text-primary', bgColor: 'bg-primary/10', icon: Sparkles },
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

export function IdeaDetailSheet({ idea, isOpen, onClose, onRatingChange, onCommentChange }: IdeaDetailSheetProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  if (!idea) return null;

  const statusConfig = STATUS_CONFIG[idea.status];
  const categoriaConfig = CATEGORIA_CONFIG[idea.categoria];
  const prioridadeConfig = PRIORIDADE_CONFIG[idea.prioridade || 3];
  const StatusIcon = statusConfig.icon;
  const PrioridadeIcon = prioridadeConfig.icon;

  const imageAttachments = idea.attachments.filter(a => a.fileType === 'image');
  const audioAttachments = idea.attachments.filter(a => a.fileType === 'audio');

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const toggleAudio = (audioId: string, audioElement: HTMLAudioElement) => {
    if (playingAudio === audioId) {
      audioElement.pause();
      setPlayingAudio(null);
    } else {
      // Pause any other playing audio
      document.querySelectorAll('audio').forEach(a => a.pause());
      audioElement.play();
      setPlayingAudio(audioId);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
                <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-left text-lg leading-tight">
                  {idea.title}
                </SheetTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={categoriaConfig.color}>
                    {categoriaConfig.label}
                  </Badge>
                  <Badge variant="outline" className={prioridadeConfig.color}>
                    <PrioridadeIcon className="h-3 w-3 mr-1" />
                    {prioridadeConfig.label}
                  </Badge>
                  <Badge variant="secondary">
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            {/* Rating Section - Prominent */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Avaliação
              </h3>
              <IdeaRating 
                ideaId={idea.id} 
                onRatingChange={onRatingChange} 
                size="lg"
              />
            </div>

            {/* Image Gallery */}
            {imageAttachments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Imagens ({imageAttachments.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {imageAttachments.map((att, idx) => (
                    <div
                      key={att.id || idx}
                      className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border bg-muted"
                      onClick={() => openLightbox(idx)}
                    >
                      <img
                        src={att.url}
                        alt={att.fileName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio Section */}
            {audioAttachments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Áudios ({audioAttachments.length})
                </h3>
                <div className="space-y-3">
                  {audioAttachments.map((att, idx) => (
                    <div key={att.id || idx} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-10 w-10 rounded-full"
                          onClick={(e) => {
                            const audio = e.currentTarget.parentElement?.querySelector('audio') as HTMLAudioElement;
                            if (audio) toggleAudio(att.id || String(idx), audio);
                          }}
                        >
                          {playingAudio === (att.id || String(idx)) ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <p className="text-sm font-medium truncate">{att.fileName}</p>
                          <audio
                            src={att.url}
                            className="w-full mt-2"
                            controls
                            onEnded={() => setPlayingAudio(null)}
                          />
                        </div>
                      </div>
                      {att.transcription && (
                        <div className="mt-3 p-2 bg-background rounded border text-sm">
                          <p className="text-xs text-muted-foreground mb-1">Transcrição:</p>
                          <p>{att.transcription}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content/Description */}
            {idea.content && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3">Descrição</h3>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{idea.content}</p>
                </div>
              </div>
            )}

            <Separator className="my-4" />

            {/* Author & Timeline Info */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={idea.author?.avatar_url || ''} />
                  <AvatarFallback>
                    {idea.author?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{idea.author?.full_name || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Autor da ideia
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Criada {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true, locale: ptBR })}</span>
                </div>
                {idea.aprovado_em && idea.approver && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-4 w-4" />
                    <span>
                      {idea.status === 'recusada' ? 'Recusada' : 'Aprovada'} por {idea.approver.full_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Rejection reason */}
              {idea.status === 'recusada' && idea.motivo_recusa && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Motivo da recusa:</p>
                  <p className="text-sm">{idea.motivo_recusa}</p>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Comments Section */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comentários
              </h3>
              <IdeaComments 
                ideaId={idea.id} 
                onCommentChange={onCommentChange}
                defaultOpen={true}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Image Lightbox */}
      <IdeaImageLightbox
        images={imageAttachments.map(a => ({ url: a.url, fileName: a.fileName }))}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
