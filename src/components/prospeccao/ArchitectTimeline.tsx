import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Send, MessageSquare, Phone, Users, Bot, Download, Edit2, X, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineUpdate {
  id: string;
  architect_id: string;
  author_id: string | null;
  created_at: string;
  message: string;
  update_type: string;
  mentioned_users: string[];
  ai_summary: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
  attachments?: {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
  }[];
}

interface ArchitectTimelineProps {
  architectId: string;
}

const updateTypeConfig = {
  "Comentário Interno": { icon: MessageSquare, color: "bg-blue-500", label: "Comentário Interno" },
  "Reunião / Ligação": { icon: Phone, color: "bg-purple-500", label: "Reunião" },
  "Visita / Projeto": { icon: Users, color: "bg-orange-500", label: "Visita" },
  "Conversa WhatsApp": { icon: MessageSquare, color: "bg-green-500", label: "WhatsApp" },
  "Observação IA": { icon: Bot, color: "bg-cyan-500", label: "IA" },
};

export function ArchitectTimeline({ architectId }: ArchitectTimelineProps) {
  const { toast } = useToast();
  const [timeline, setTimeline] = useState<TimelineUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updateType, setUpdateType] = useState("Comentário Interno");
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    fetchTimeline();
    fetchUsers();
    
    // Realtime subscription
    const channel = supabase
      .channel(`architect-timeline-${architectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'architect_timeline',
          filter: `architect_id=eq.${architectId}`,
        },
        () => {
          fetchTimeline();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [architectId]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    
    if (data) setAllUsers(data);
  };

  const fetchTimeline = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("architect_timeline")
      .select(`
        *,
        profiles!architect_timeline_author_id_fkey(full_name, email),
        attachments:architect_timeline_attachments(*)
      `)
      .eq("architect_id", architectId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTimeline(data as any);
    }
    
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!message.trim() && !files) return;

    setSubmitting(true);

    try {
      // Extract mentioned users from message
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentionedUsers: string[] = [];
      let match;
      
      while ((match = mentionRegex.exec(message)) !== null) {
        mentionedUsers.push(match[2]); // Extract user ID from [@Name](userId)
      }

      // Insert timeline entry
      const { data: timelineEntry, error: timelineError } = await supabase
        .from("architect_timeline")
        .insert({
          architect_id: architectId,
          message,
          update_type: updateType,
          mentioned_users: mentionedUsers,
        })
        .select()
        .single();

      if (timelineError) throw timelineError;

      // Upload files if any
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = `${architectId}/${Date.now()}-${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('architect-files')
            .upload(fileName, file);

          if (!uploadError) {
            await supabase
              .from("architect_timeline_attachments")
              .insert({
                timeline_id: timelineEntry.id,
                file_name: file.name,
                file_path: fileName,
                file_type: file.type,
                file_size: file.size,
              });
          }
        }
      }

      toast({
        title: "Sucesso",
        description: "Atualização adicionada à timeline!",
      });

      setMessage("");
      setFiles(null);
      fetchTimeline();
    } catch (error: any) {
      console.error("Error submitting timeline update:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar atualização",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("architect_timeline")
      .delete()
      .eq("id", id);

    if (!error) {
      toast({
        title: "Sucesso",
        description: "Entrada removida da timeline",
      });
      fetchTimeline();
    } else {
      toast({
        title: "Erro",
        description: "Erro ao remover entrada",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (id: string) => {
    const { error } = await supabase
      .from("architect_timeline")
      .update({ message: editMessage })
      .eq("id", id);

    if (!error) {
      toast({
        title: "Sucesso",
        description: "Entrada atualizada",
      });
      setEditingId(null);
      setEditMessage("");
      fetchTimeline();
    } else {
      toast({
        title: "Erro",
        description: "Erro ao atualizar entrada",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage
      .from('architect-files')
      .download(filePath);

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleMention = (userId: string, userName: string) => {
    const mention = `@[${userName}](${userId}) `;
    setMessage(message + mention);
    setShowMentionSuggestions(false);
    setMentionSearch("");
    textareaRef.current?.focus();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Check for @ to trigger mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentionSuggestions(true);
      setMentionSearch("");
    } else if (lastAtIndex !== -1 && value[lastAtIndex] === '@') {
      const searchTerm = value.slice(lastAtIndex + 1);
      if (!searchTerm.includes(' ')) {
        setMentionSearch(searchTerm);
        setShowMentionSuggestions(true);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const filteredUsers = allUsers.filter(user =>
    user.full_name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Timeline Colaborativa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Form */}
        <div className="space-y-3">
          <Select value={updateType} onValueChange={setUpdateType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Comentário Interno">💬 Comentário Interno</SelectItem>
              <SelectItem value="Reunião / Ligação">📞 Reunião / Ligação</SelectItem>
              <SelectItem value="Visita / Projeto">🏢 Visita / Projeto</SelectItem>
              <SelectItem value="Conversa WhatsApp">💚 Conversa WhatsApp</SelectItem>
              <SelectItem value="Observação IA">🤖 Observação IA</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Digite @ para mencionar alguém..."
              value={message}
              onChange={handleTextareaChange}
              rows={3}
            />
            
            {showMentionSuggestions && filteredUsers.length > 0 && (
              <div className="absolute bottom-full mb-1 w-full bg-popover border rounded-md shadow-lg max-h-40 overflow-auto z-50">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                    onClick={() => handleMention(user.id, user.full_name || user.email)}
                  >
                    {user.full_name || user.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('architect-file-input')?.click()}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Anexar
            </Button>
            <input
              id="architect-file-input"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setFiles(e.target.files)}
            />
            {files && files.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {files.length} arquivo(s) selecionado(s)
              </span>
            )}
            <Button
              onClick={handleSubmit}
              disabled={submitting || (!message.trim() && !files)}
              className="ml-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4 mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando timeline...</p>
          ) : timeline.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhuma atualização ainda</p>
          ) : (
            timeline.map((update) => {
              const config = updateTypeConfig[update.update_type as keyof typeof updateTypeConfig];
              const Icon = config?.icon || MessageSquare;
              const isAuthor = currentUserId === update.author_id;

              return (
                <div
                  key={update.id}
                  className="relative pl-8 pb-4 border-l-2 border-muted last:border-transparent last:pb-0"
                >
                  <div
                    className={`absolute -left-2.5 top-1 w-5 h-5 rounded-full ${config?.color || 'bg-gray-500'} flex items-center justify-center text-white`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{config?.label || update.update_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(update.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      
                      {isAuthor && (
                        <div className="flex gap-1">
                          {editingId === update.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(update.id)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditMessage("");
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(update.id);
                                  setEditMessage(update.message);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(update.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {editingId === update.id ? (
                      <Textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{update.message}</p>
                    )}

                    {update.profiles && (
                      <p className="text-xs text-muted-foreground">
                        Por: {update.profiles.full_name || update.profiles.email}
                      </p>
                    )}

                    {update.attachments && update.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {update.attachments.map((att) => (
                          <Button
                            key={att.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(att.file_path, att.file_name)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {att.file_name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
