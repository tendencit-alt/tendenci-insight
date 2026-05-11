import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Clock, Plus, Edit, Trash2, Check, X, Phone, MessageSquare, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agendamento {
  id: string;
  architect_id: string;
  vendedor_id: string;
  client_id: string | null;
  campanha_id: string | null;
  data_agendamento: string;
  status: string;
  canal: string;
  observacoes: string | null;
  criado_por_ia: boolean;
  created_at: string;
  architects: { name: string; phone: string | null };
  profiles: { full_name: string | null; email: string };
  clients: { name: string } | null;
}

export function AgendamentosManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);
  const [formData, setFormData] = useState({
    architect_id: "",
    client_id: "",
    campanha_id: "",
    data_agendamento: "",
    hora_agendamento: "",
    canal: "whatsapp",
    observacoes: "",
  });
  const queryClient = useQueryClient();

  // Buscar agendamentos
  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ["prospec-agendamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_agendamentos")
        .select(`
          *,
          architects(name, phone),
          profiles(full_name, email),
          clients(name)
        `)
        .order("data_agendamento", { ascending: true });

      if (error) throw error;
      return data as Agendamento[];
    },
  });

  // Buscar parceiros profissionais para select
  const { data: architects } = useQuery({
    queryKey: ["architects-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("architects")
        .select("id, name, phone")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Buscar clientes para select
  const { data: clients } = useQuery({
    queryKey: ["clients-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Buscar campanhas ativas
  const { data: campaigns } = useQuery({
    queryKey: ["campaigns-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_campaigns")
        .select("id, nome")
        .eq("status", "ativa")
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  // Criar/atualizar agendamento
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const dataHora = `${formData.data_agendamento}T${formData.hora_agendamento}:00`;
      
      const payload = {
        architect_id: formData.architect_id,
        vendedor_id: user?.id,
        client_id: formData.client_id || null,
        campanha_id: formData.campanha_id || null,
        data_agendamento: dataHora,
        canal: formData.canal,
        observacoes: formData.observacoes || null,
        status: editingAgendamento ? editingAgendamento.status : "agendado",
        criado_por_ia: false,
      };

      if (editingAgendamento) {
        const { error } = await supabase
          .from("tendenci_prospec_arq_agendamentos")
          .update(payload)
          .eq("id", editingAgendamento.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tendenci_prospec_arq_agendamentos")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-agendamentos"] });
      setDialogOpen(false);
      resetForm();
      toast.success(editingAgendamento ? "Agendamento atualizado!" : "Agendamento criado!");
    },
    onError: () => {
      toast.error("Erro ao salvar agendamento");
    },
  });

  // Atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("tendenci_prospec_arq_agendamentos")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-agendamentos"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  // Deletar agendamento
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tendenci_prospec_arq_agendamentos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-agendamentos"] });
      toast.success("Agendamento removido!");
    },
    onError: () => {
      toast.error("Erro ao remover agendamento");
    },
  });

  const resetForm = () => {
    setFormData({
      architect_id: "",
      client_id: "",
      campanha_id: "",
      data_agendamento: "",
      hora_agendamento: "",
      canal: "whatsapp",
      observacoes: "",
    });
    setEditingAgendamento(null);
  };

  const handleEdit = (agendamento: Agendamento) => {
    const [data, hora] = agendamento.data_agendamento.split("T");
    setEditingAgendamento(agendamento);
    setFormData({
      architect_id: agendamento.architect_id,
      client_id: agendamento.client_id || "",
      campanha_id: agendamento.campanha_id || "",
      data_agendamento: data,
      hora_agendamento: hora.substring(0, 5),
      canal: agendamento.canal,
      observacoes: agendamento.observacoes || "",
    });
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any; icon: any }> = {
      agendado: { label: "Agendado", variant: "default", icon: Clock },
      realizado: { label: "Realizado", variant: "secondary", icon: Check },
      cancelado: { label: "Cancelado", variant: "outline", icon: X },
    };
    const config = variants[status] || variants.agendado;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />;
      case "telefone":
        return <Phone className="h-4 w-4" />;
      case "presencial":
        return <MapPin className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // Filtrar por status
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const filteredAgendamentos = agendamentos?.filter((ag) => {
    if (filterStatus === "todos") return true;
    return ag.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agendamentos</h2>
          <p className="text-muted-foreground">Gerencie reuniões e contatos agendados</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAgendamento ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="architect">Parceiro Profissional *</Label>
                <Select
                  value={formData.architect_id}
                  onValueChange={(value) => setFormData({ ...formData, architect_id: value })}
                >
                  <SelectTrigger id="architect">
                    <SelectValue placeholder="Selecione um parceiro profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {architects?.map((arch) => (
                      <SelectItem key={arch.id} value={arch.id}>
                        {arch.name} {arch.phone && `- ${arch.phone}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Cliente (Opcional)</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((cli) => (
                      <SelectItem key={cli.id} value={cli.id}>
                        {cli.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campanha">Campanha (Opcional)</Label>
                <Select
                  value={formData.campanha_id}
                  onValueChange={(value) => setFormData({ ...formData, campanha_id: value })}
                >
                  <SelectTrigger id="campanha">
                    <SelectValue placeholder="Selecione uma campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns?.map((camp) => (
                      <SelectItem key={camp.id} value={camp.id}>
                        {camp.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data">Data *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data_agendamento}
                    onChange={(e) => setFormData({ ...formData, data_agendamento: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hora">Hora *</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={formData.hora_agendamento}
                    onChange={(e) => setFormData({ ...formData, hora_agendamento: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="canal">Canal *</Label>
                <Select
                  value={formData.canal}
                  onValueChange={(value) => setFormData({ ...formData, canal: value })}
                >
                  <SelectTrigger id="canal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="videochamada">Videochamada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Anotações sobre o agendamento..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!formData.architect_id || !formData.data_agendamento || !formData.hora_agendamento || saveMutation.isPending}
                >
                  {editingAgendamento ? "Atualizar" : "Criar"} Agendamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro de Status */}
      <div className="flex gap-2">
        <Button
          variant={filterStatus === "todos" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("todos")}
        >
          Todos
        </Button>
        <Button
          variant={filterStatus === "agendado" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("agendado")}
        >
          Agendados
        </Button>
        <Button
          variant={filterStatus === "realizado" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("realizado")}
        >
          Realizados
        </Button>
        <Button
          variant={filterStatus === "cancelado" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("cancelado")}
        >
          Cancelados
        </Button>
      </div>

      {/* Lista de Agendamentos */}
      {isLoading ? (
        <div className="text-center py-8">Carregando agendamentos...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAgendamentos?.map((agendamento) => (
            <Card key={agendamento.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  <div className="flex flex-col items-center gap-1 min-w-[80px]">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {format(new Date(agendamento.data_agendamento), "dd MMM", { locale: ptBR })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(agendamento.data_agendamento), "HH:mm")}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{agendamento.architects.name}</h3>
                      {agendamento.criado_por_ia && (
                        <Badge variant="secondary" className="text-xs">IA</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {getCanalIcon(agendamento.canal)}
                        <span className="capitalize">{agendamento.canal}</span>
                      </div>
                      {agendamento.clients && (
                        <span>• Cliente: {agendamento.clients.name}</span>
                      )}
                    </div>

                    {agendamento.observacoes && (
                      <p className="text-sm text-muted-foreground">{agendamento.observacoes}</p>
                    )}

                    <div className="flex items-center gap-2">
                      {getStatusBadge(agendamento.status)}
                      <span className="text-xs text-muted-foreground">
                        por {agendamento.profiles.full_name || agendamento.profiles.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  {agendamento.status === "agendado" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: agendamento.id, status: "realizado" })}
                        title="Marcar como realizado"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: agendamento.id, status: "cancelado" })}
                        title="Cancelar"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(agendamento)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Tem certeza que deseja remover este agendamento?")) {
                        deleteMutation.mutate(agendamento.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {filteredAgendamentos?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum agendamento encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
