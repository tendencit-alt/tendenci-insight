import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  MessageSquare,
  User,
  Bot,
  Calendar,
  Phone,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversationSummary {
  phone_number: string;
  instance_name: string;
  message_count: number;
  last_message: string;
  last_message_at: string;
  push_name: string | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  media_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export default function IAConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      // Get conversations directly from table
      const { data: allMessages } = await supabase
        .from("ia_conversations")
        .select("phone_number, instance_name, content, created_at, metadata")
        .order("created_at", { ascending: false });

      if (allMessages) {
        // Group by phone number
        const grouped = new Map<string, ConversationSummary>();
        allMessages.forEach((msg) => {
          if (!grouped.has(msg.phone_number)) {
            const metadata = msg.metadata as Record<string, unknown> | null;
            grouped.set(msg.phone_number, {
              phone_number: msg.phone_number,
              instance_name: msg.instance_name,
              message_count: 1,
              last_message: msg.content,
              last_message_at: msg.created_at,
              push_name: metadata?.pushName as string || null,
            });
          } else {
            const existing = grouped.get(msg.phone_number)!;
            existing.message_count++;
          }
        });
        setConversations(Array.from(grouped.values()));
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (phoneNumber: string) => {
    setIsLoadingMessages(true);
    setSelectedPhone(phoneNumber);
    try {
      const { data, error } = await supabase
        .from("ia_conversations")
        .select("*")
        .eq("phone_number", phoneNumber)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      conv.phone_number.includes(searchTerm) ||
      (conv.push_name?.toLowerCase().includes(searchLower) ?? false) ||
      conv.last_message.toLowerCase().includes(searchLower)
    );
  });

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Histórico de Conversas</h1>
            <p className="text-muted-foreground">
              Visualize todas as conversas da IA de atendimento
            </p>
          </div>
          <Button variant="outline" onClick={loadConversations} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por telefone, nome ou mensagem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Conversations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversas ({filteredConversations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Última Mensagem</TableHead>
                  <TableHead className="text-center">Mensagens</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConversations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma conversa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConversations.map((conv) => (
                    <TableRow
                      key={conv.phone_number}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => loadMessages(conv.phone_number)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {conv.push_name || formatPhoneNumber(conv.phone_number)}
                            </p>
                            {conv.push_name && (
                              <p className="text-sm text-muted-foreground">
                                {formatPhoneNumber(conv.phone_number)}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground line-clamp-1 max-w-[300px]">
                          {conv.last_message}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{conv.message_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(conv.last_message_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Conversation Detail Sheet */}
        <Sheet open={!!selectedPhone} onOpenChange={() => setSelectedPhone(null)}>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                {selectedPhone && formatPhoneNumber(selectedPhone)}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-180px)]">
                  <div className="space-y-4 pr-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.role === "user"
                              ? "bg-muted"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {msg.role === "user" ? (
                              <User className="h-3 w-3" />
                            ) : (
                              <Bot className="h-3 w-3" />
                            )}
                            <span className="text-xs opacity-70">
                              {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                            </span>
                            {msg.media_type !== "text" && (
                              <Badge variant="outline" className="text-[10px] h-4">
                                {msg.media_type}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
