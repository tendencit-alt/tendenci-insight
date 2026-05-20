import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Message } from "@/utils/aiChat";
import { toast } from "@/hooks/use-toast";
import { describeError } from '@/lib/errorMessage';

export interface AIConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export function useAIChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Carregar conversas do usuário
  const loadConversations = useCallback(async () => {
    if (!user?.id) {
      console.log("[useAIChat] loadConversations: usuário não autenticado");
      return;
    }

    console.log("[useAIChat] loadConversations: carregando para user_id:", user.id);
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("[useAIChat] loadConversations erro:", error);
        throw error;
      }
      
      console.log("[useAIChat] loadConversations: encontradas", data?.length || 0, "conversas");
      setConversations(data || []);
    } catch (error) {
      console.error("[useAIChat] Error loading conversations:", error);
      toast({
        title: "Erro ao carregar histórico",
        description: describeError('Não foi possível carregar as conversas anteriores', error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Carregar mensagens de uma conversa
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      setMessages(formattedMessages);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }, []);

  // Criar nova conversa
  const createConversation = useCallback(async (): Promise<string | null> => {
    if (!user?.id) {
      console.error("[useAIChat] createConversation: usuário não autenticado");
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para usar o assistente.",
        variant: "destructive",
      });
      return null;
    }

    console.log("[useAIChat] createConversation: criando para user_id:", user.id);
    setSaveError(false);
    
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error("[useAIChat] createConversation erro:", error);
        throw error;
      }

      console.log("[useAIChat] createConversation: conversa criada com id:", data.id);
      setConversations((prev) => [data, ...prev]);
      setCurrentConversationId(data.id);
      setMessages([]);
      return data.id;
    } catch (error) {
      console.error("[useAIChat] Error creating conversation:", error);
      setSaveError(true);
      toast({
        title: "Erro ao criar conversa",
        description: "A conversa não será salva no histórico.",
        variant: "destructive",
      });
      return null;
    }
  }, [user?.id]);

  // Salvar mensagem
  const saveMessage = useCallback(
    async (role: "user" | "assistant", content: string, conversationId?: string) => {
      const targetConversationId = conversationId || currentConversationId;
      if (!targetConversationId) {
        console.warn("[useAIChat] saveMessage: sem conversation_id, mensagem não será salva");
        return;
      }

      console.log("[useAIChat] saveMessage:", { role, conversationId: targetConversationId, contentLength: content.length });
      setIsSaving(true);
      setSaveError(false);
      
      try {
        const { data, error } = await supabase.from("ai_messages").insert({
          conversation_id: targetConversationId,
          role,
          content,
        }).select();

        if (error) {
          console.error("[useAIChat] saveMessage erro:", error);
          throw error;
        }

        console.log("[useAIChat] saveMessage: mensagem salva com sucesso, id:", data?.[0]?.id);

        // Atualizar updated_at da conversa
        const { error: updateError } = await supabase
          .from("ai_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", targetConversationId);

        if (updateError) {
          console.warn("[useAIChat] saveMessage: erro ao atualizar timestamp:", updateError);
        }

        // Mover conversa para o topo da lista
        setConversations((prev) => {
          const updated = prev.find((c) => c.id === targetConversationId);
          if (!updated) return prev;
          return [
            { ...updated, updated_at: new Date().toISOString() },
            ...prev.filter((c) => c.id !== targetConversationId),
          ];
        });
      } catch (error) {
        console.error("[useAIChat] Error saving message:", error);
        setSaveError(true);
        toast({
          title: "Erro ao salvar mensagem",
          description: "A mensagem pode não aparecer no histórico.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [currentConversationId]
  );

  // Gerar título automático baseado na primeira mensagem
  const generateTitle = useCallback(
    async (firstMessage: string, conversationId: string) => {
      const title = firstMessage.length > 50 ? firstMessage.slice(0, 47) + "..." : firstMessage;

      try {
        const { error } = await supabase
          .from("ai_conversations")
          .update({ title })
          .eq("id", conversationId);

        if (error) throw error;

        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, title } : c))
        );
      } catch (error) {
        console.error("Error updating title:", error);
      }
    },
    []
  );

  // Deletar conversa
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        const { error } = await supabase
          .from("ai_conversations")
          .delete()
          .eq("id", conversationId);

        if (error) throw error;

        setConversations((prev) => prev.filter((c) => c.id !== conversationId));

        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      } catch (error) {
        console.error("Error deleting conversation:", error);
      }
    },
    [currentConversationId]
  );

  // Nova conversa - cria no banco imediatamente
  const startNewConversation = useCallback(async (): Promise<string | null> => {
    // 1. Limpar estado local imediatamente
    setMessages([]);
    setCurrentConversationId(null);
    setSaveError(false);
    
    // 2. Criar nova conversa no banco
    const newId = await createConversation();
    
    console.log("[useAIChat] startNewConversation: nova conversa criada:", newId);
    
    return newId;
  }, [createConversation]);

  // Carregar conversa mais recente automaticamente
  const loadMostRecentConversation = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        // Só carrega se foi atualizada nas últimas 24h
        const updatedAt = new Date(data.updated_at);
        const now = new Date();
        const diffHours = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

        if (diffHours < 24) {
          await loadMessages(data.id);
        }
      }
    } catch (error) {
      console.error("Error loading recent conversation:", error);
    }
  }, [user?.id, loadMessages]);

  // Carregar conversas quando usuário mudar
  useEffect(() => {
    if (user?.id) {
      loadConversations();
    }
  }, [user?.id, loadConversations]);

  return {
    conversations,
    currentConversationId,
    messages,
    setMessages,
    isLoading,
    isSaving,
    saveError,
    loadConversations,
    loadMessages,
    createConversation,
    saveMessage,
    generateTitle,
    deleteConversation,
    startNewConversation,
    loadMostRecentConversation,
  };
}
