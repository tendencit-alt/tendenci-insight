import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageCircle, Send, Reply, Pencil, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

interface IdeaCommentsProps {
  ideaId: string;
  onCommentChange?: () => void;
}

export function IdeaComments({ ideaId, onCommentChange }: IdeaCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalComments, setTotalComments] = useState(0);

  useEffect(() => {
    fetchCommentsCount();
    if (isOpen) {
      fetchComments();
    }
  }, [ideaId, isOpen]);

  const fetchCommentsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('master_idea_comments')
        .select('*', { count: 'exact', head: true })
        .eq('idea_id', ideaId);

      if (error) throw error;
      setTotalComments(count || 0);
    } catch (error) {
      console.error('Error fetching comments count:', error);
    }
  };

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('master_idea_comments')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch authors
      const commentsWithAuthors = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: authorData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', comment.user_id)
            .single();

          return { ...comment, author: authorData || undefined };
        })
      );

      // Organize into threads
      const rootComments: Comment[] = [];
      const repliesMap = new Map<string, Comment[]>();

      commentsWithAuthors.forEach((comment) => {
        if (comment.parent_id) {
          const replies = repliesMap.get(comment.parent_id) || [];
          replies.push(comment);
          repliesMap.set(comment.parent_id, replies);
        } else {
          rootComments.push(comment);
        }
      });

      // Attach replies to parent comments
      rootComments.forEach((comment) => {
        comment.replies = repliesMap.get(comment.id) || [];
      });

      setComments(rootComments);
      setTotalComments(commentsWithAuthors.length);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (parentId: string | null = null) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('master_idea_comments')
        .insert({
          idea_id: ideaId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId,
        });

      if (error) throw error;

      if (parentId) {
        setReplyContent('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }

      await fetchComments();
      onCommentChange?.();
      toast.success('Comentário adicionado!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('master_idea_comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId);

      if (error) throw error;

      setEditingId(null);
      setEditContent('');
      await fetchComments();
      toast.success('Comentário atualizado!');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Erro ao atualizar comentário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('master_idea_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      await fetchComments();
      onCommentChange?.();
      toast.success('Comentário excluído!');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Erro ao excluir comentário');
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isEditing = editingId === comment.id;
    const canModify = comment.user_id === user?.id;

    return (
      <div key={comment.id} className={cn("flex gap-2", isReply && "ml-6 mt-2")}>
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage src={comment.author?.avatar_url || ''} />
          <AvatarFallback className="text-[10px]">
            {comment.author?.full_name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium truncate">{comment.author?.full_name || 'Usuário'}</span>
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          {isEditing ? (
            <div className="mt-1 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleUpdateComment(comment.id)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => { setEditingId(null); setEditContent(''); }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm mt-0.5 whitespace-pre-wrap">{comment.content}</p>
              <div className="flex items-center gap-2 mt-1">
                {!isReply && user && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => { setReplyingTo(comment.id); setReplyContent(''); }}
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Responder
                  </Button>
                )}
                {canModify && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-destructive"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
          
          {/* Reply input */}
          {replyingTo === comment.id && (
            <div className="mt-2 flex gap-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Escreva uma resposta..."
                className="min-h-[50px] text-sm flex-1"
                autoFocus
              />
              <div className="flex flex-col gap-1">
                <Button 
                  size="sm" 
                  onClick={() => handleAddComment(comment.id)}
                  disabled={!replyContent.trim() || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setReplyingTo(null)}
                >
                  ✕
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies?.map((reply) => renderComment(reply, true))}
        </div>
      </div>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <MessageCircle className="h-3 w-3 mr-1" />
          {totalComments > 0 ? `${totalComments} comentário${totalComments > 1 ? 's' : ''}` : 'Comentar'}
          <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3 border-t pt-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* New comment input */}
            {user && (
              <div className="flex gap-2">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarFallback className="text-[10px]">
                    {user.email?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicionar um comentário..."
                  className="min-h-[50px] text-sm flex-1"
                />
                <Button 
                  size="sm" 
                  onClick={() => handleAddComment(null)}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
              </div>
            )}

            {/* Comments list */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Seja o primeiro a comentar!
                </p>
              ) : (
                comments.map((comment) => renderComment(comment))
              )}
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
