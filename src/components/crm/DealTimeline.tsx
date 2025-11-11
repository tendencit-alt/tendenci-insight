import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Send, MessageSquare, Phone, Users, Eye, Bot, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineUpdate {
  id: string;
  deal_id: string;
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

interface DealTimelineProps {
  dealId: string;
}

const updateTypeConfig = {
  "Comentário Interno": { icon: MessageSquare, color: "bg-blue-500", label: "Comentário Interno" },
  "Conversa WhatsApp": { icon: MessageSquare, color: "bg-green-500", label: "WhatsApp" },
  "Reunião / Ligação": { icon: Phone, color: "bg-purple-500", label: "Reunião" },
  "Visita / Projeto": { icon: Users, color: "bg-orange-500", label: "Visita" },
  "Observação IA": { icon: Bot, color: "bg-cyan-500", label: "IA" },
};

export function DealTimeline({ dealId }: DealTimelineProps) {
  const { toast } = useToast();
  const [timeline, setTimeline] = useState<TimelineUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updateType, setUpdateType] = useState("Comentário Interno");
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTimeline();
    
    // Realtime subscription
    const channel = supabase
      .channel(`timeline-${dealId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_timeline',
          filter: `deal_id=eq.${dealId}`,
        },
        () => {
          fetchTimeline();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId]);

  const fetchTimeline = async () => {
    setLoading(true);
    const { data: timelineData, error: timelineError } = await supabase
      .from("crm_timeline")
      .select(`
        *,
        profiles:author_id(full_name, email)
      `)
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });

    if (timelineError) {
      toast({
        title: "Erro ao carregar timeline",
        description: timelineError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch attachments for each timeline entry
    const timelineWithAttachments = await Promise.all(
      (timelineData || []).map(async (item) => {
        const { data: attachments } = await supabase
          .from("crm_timeline_attachments")
          .select("*")
          .eq("timeline_id", item.id);
        
        return { ...item, attachments: attachments || [] };
      })
    );

    setTimeline(timelineWithAttachments);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: "Mensagem vazia",
        description: "Digite uma mensagem antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Extract mentioned users (simplified - looks for @[uuid])
      const mentionRegex = /@([a-f0-9-]{36})/gi;
      const mentions = [...message.matchAll(mentionRegex)].map(m => m[1]);

      // Insert timeline entry
      const { data: timelineEntry, error: timelineError } = await supabase
        .from("crm_timeline")
        .insert({
          deal_id: dealId,
          author_id: userData.user.id,
          message,
          update_type: updateType,
          mentioned_users: mentions,
        })
        .select()
        .single();

      if (timelineError) throw timelineError;

      // Upload files if any
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split('.').pop();
          const filePath = `${dealId}/${timelineEntry.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('crm-timeline-attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Save attachment record
          await supabase.from("crm_timeline_attachments").insert({
            timeline_id: timelineEntry.id,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
          });
        }
      }

      toast({
        title: "Atualização adicionada",
        description: "Sua atualização foi registrada com sucesso.",
      });

      setMessage("");
      setFiles(null);
      setUpdateType("Comentário Interno");
      fetchTimeline();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar atualização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('crm-timeline-attachments')
      .download(filePath);

    if (error) {
      toast({
        title: "Erro ao baixar arquivo",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 Timeline Colaborativa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new update form */}
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <div>
            <Label>Tipo de Atualização</Label>
            <Select value={updateType} onValueChange={setUpdateType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Comentário Interno">💬 Comentário Interno</SelectItem>
                <SelectItem value="Conversa WhatsApp">📱 Conversa WhatsApp</SelectItem>
                <SelectItem value="Reunião / Ligação">📞 Reunião / Ligação</SelectItem>
                <SelectItem value="Visita / Projeto">🏢 Visita / Projeto</SelectItem>
                <SelectItem value="Observação IA">🤖 Observação IA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mensagem</Label>
            <Textarea
              placeholder="Digite sua atualização... Use @nome para mencionar alguém"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="timeline-files">Anexar Arquivos</Label>
            <Input
              id="timeline-files"
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              accept="image/*,.pdf,.doc,.docx"
            />
            {files && files.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {files.length} arquivo(s) selecionado(s)
              </p>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Enviando..." : "Adicionar Atualização"}
          </Button>
        </div>

        {/* Timeline feed */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando timeline...</p>
          ) : timeline.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhuma atualização ainda. Seja o primeiro a adicionar!</p>
          ) : (
            timeline.map((update) => {
              const config = updateTypeConfig[update.update_type as keyof typeof updateTypeConfig];
              const Icon = config?.icon || MessageSquare;
              
              return (
                <div key={update.id} className="flex gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`h-10 w-10 rounded-full ${config?.color || 'bg-gray-500'} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {update.profiles?.full_name || update.profiles?.email || "Usuário desconhecido"}
                      </span>
                      <Badge variant="outline">{config?.label || update.update_type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(update.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    
                    <p className="text-sm whitespace-pre-wrap">{update.message}</p>
                    
                    {update.ai_summary && (
                      <div className="bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-800 rounded p-3 text-sm">
                        <p className="font-semibold text-cyan-700 dark:text-cyan-300 mb-1">🧠 Resumo IA:</p>
                        <p className="text-cyan-600 dark:text-cyan-400">{update.ai_summary}</p>
                      </div>
                    )}
                    
                    {update.attachments && update.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {update.attachments.map((attachment) => (
                          <Button
                            key={attachment.id}
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(attachment.file_path, attachment.file_name)}
                          >
                            <Paperclip className="mr-2 h-3 w-3" />
                            {attachment.file_name}
                            <Download className="ml-2 h-3 w-3" />
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
