import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { CreateClientDialog } from "./CreateClientDialog";
import { CreateArchitectDialog } from "../architects/CreateArchitectDialog";
import { CreateProjectDialog } from "../projects/CreateProjectDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  onSuccess: () => void;
}

export function CreateDealDialog({
  open,
  onOpenChange,
  pipelineId,
  onSuccess,
}: CreateDealDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [architects, setArchitects] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isArchitectDialogOpen, setIsArchitectDialogOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);

  const [tasks, setTasks] = useState<Array<{ title: string; due_at: Date | undefined; note: string }>>([]);
  const [newTask, setNewTask] = useState({ title: "", due_at: undefined as Date | undefined, note: "" });

  const [formData, setFormData] = useState({
    stage_id: "",
    lead_id: "",
    architect_id: "",
    project_id: "",
    value: "",
    note: "",
    temperature: "frio",
    categorias: [] as string[],
    centros_custo: [] as string[],
    tipos_produto: [] as string[],
    observations: "",
    conversation_history: "",
    owner_id: "",
    source_id: "",
  });

  useEffect(() => {
    if (open && pipelineId) {
      fetchOptions();
    }
  }, [open, pipelineId]);

  const fetchOptions = async () => {
    // Fetch stages
    const { data: stagesData } = await supabase
      .from("crm_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("position");

    // Fetch leads with client info
    const { data: leadsData } = await supabase
      .from("leads")
      .select("id, client:clients(name, phone, email)")
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch architects
    const { data: architectsData } = await supabase
      .from("architects")
      .select("id, name")
      .eq("active", true)
      .order("name");

    // Fetch lead sources
    const { data: sourcesData } = await supabase
      .from("lead_sources")
      .select("id, name")
      .order("name");

    // Fetch owners (profiles)
    const { data: ownersData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");

    // Fetch projects
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, name, client:clients(name)")
      .is("deal_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    setStages(stagesData || []);
    setLeads(leadsData || []);
    setArchitects(architectsData || []);
    setSources(sourcesData || []);
    setOwners(ownersData || []);
    setProjects(projectsData || []);

    if (stagesData && stagesData.length > 0) {
      setFormData((prev) => ({ ...prev, stage_id: stagesData[0].id }));
    }
  };

  const handleClientCreated = async (clientId: string) => {
    // Create a lead for the new client with temperature
    const { data: leadData, error } = await supabase
      .from("leads")
      .insert({ 
        client_id: clientId, 
        status: "novo",
        temperature: formData.temperature,
        source_id: formData.source_id ? Number(formData.source_id) : null
      })
      .select()
      .single();

    if (!error && leadData) {
      await fetchOptions();
      setFormData((prev) => ({ ...prev, lead_id: leadData.id }));
      toast({
        title: "Sucesso",
        description: "Cliente e lead criados!",
      });
    }
  };

  const handleArchitectCreated = async (architectId?: string) => {
    await fetchOptions();
    if (architectId) {
      setFormData((prev) => ({ ...prev, architect_id: architectId }));
    }
    toast({
      title: "Sucesso",
      description: "Arquiteto criado e selecionado!",
    });
  };

  const handleProjectCreated = async () => {
    await fetchOptions();
    // Buscar o último projeto criado sem deal_id vinculado
    const { data } = await supabase
      .from("projects")
      .select("id")
      .is("deal_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      setFormData((prev) => ({ ...prev, project_id: data.id }));
    }
    
    toast({
      title: "Sucesso",
      description: "Projeto criado e vinculado!",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update lead temperature if lead is selected
      if (formData.lead_id) {
        await supabase
          .from("leads")
          .update({ 
            temperature: formData.temperature,
            source_id: formData.source_id ? Number(formData.source_id) : null
          })
          .eq("id", formData.lead_id);
      }

      // Gerar título automaticamente baseado em categorias e tipos de produto
      const categoriasTxt = formData.categorias.join(", ") || "Sem categoria";
      const produtosTxt = formData.tipos_produto.join(", ") || "Sem produto";
      const autoTitle = `${categoriasTxt} - ${produtosTxt}`;

      // Insert deal
      const { data: dealData, error } = await supabase.from("crm_deals").insert({
        pipeline_id: pipelineId,
        title: autoTitle,
        stage_id: formData.stage_id,
        lead_id: formData.lead_id || null,
        architect_id: formData.architect_id && formData.architect_id !== "sem-arquiteto" ? formData.architect_id : null,
        owner_id: formData.owner_id || null,
        value: formData.value ? Number(formData.value) : null,
        note: `${formData.observations ? formData.observations + '\n\n' : ''}${formData.note || ''}`.trim() || null,
        categoria: formData.categorias.join(", ") || null,
        centro_custo: formData.centros_custo.join(", ") || null,
        tipo_produto: formData.tipos_produto.join(", ") || null,
        conversation_history: formData.conversation_history || null,
        status: "aberto",
      }).select().single();

      if (error) {
        setLoading(false);
        toast({
          title: "Erro ao criar negócio",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Se um projeto foi selecionado, vincular ao deal
      if (formData.project_id && dealData) {
        await supabase
          .from("projects")
          .update({ deal_id: dealData.id })
          .eq("id", formData.project_id);
      }

      // Criar tarefas vinculadas ao deal
      if (tasks.length > 0 && dealData) {
        const tasksToInsert = tasks.map(task => ({
          deal_id: dealData.id,
          title: task.title,
          due_at: task.due_at?.toISOString() || new Date().toISOString(),
          note: task.note || null,
          status: "open",
        }));

        await supabase.from("crm_tasks").insert(tasksToInsert);
      }

      setLoading(false);

      toast({
        title: "Sucesso",
        description: "Negócio criado com sucesso!",
      });

      setFormData({
        stage_id: "",
        lead_id: "",
        architect_id: "",
        project_id: "",
        value: "",
        note: "",
        temperature: "frio",
        categorias: [],
        centros_custo: [],
        tipos_produto: [],
        observations: "",
        conversation_history: "",
        owner_id: "",
        source_id: "",
      });
      setTasks([]);
      setNewTask({ title: "", due_at: undefined, note: "" });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Negócio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seção: Lead e Arquiteto */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Lead e Arquiteto</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lead">Lead</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsClientDialogOpen(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Novo Cliente
                  </Button>
                </div>
                <Select
                  value={formData.lead_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, lead_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.client?.name || "Sem nome"}
                        {lead.client?.phone && ` - ${lead.client.phone}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperatura do Lead</Label>
                <Select
                  value={formData.temperature}
                  onValueChange={(value) =>
                    setFormData({ ...formData, temperature: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a temperatura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frio">❄️ Frio</SelectItem>
                    <SelectItem value="morno">☀️ Morno</SelectItem>
                    <SelectItem value="quente">🔥 Quente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Origem do Lead *</Label>
                <Select
                  value={formData.source_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, source_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((source) => (
                      <SelectItem key={source.id} value={source.id.toString()}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="architect">Arquiteto *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsArchitectDialogOpen(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Novo Arquiteto
                  </Button>
                </div>
                <Select
                  value={formData.architect_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, architect_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o arquiteto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem-arquiteto">Cliente sem arquiteto</SelectItem>
                    {architects.map((arch) => (
                      <SelectItem key={arch.id} value={arch.id}>
                        {arch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção: Projeto */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Projeto (Opcional)</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="project">Projeto Existente</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsProjectDialogOpen(true)}
                  className="h-7 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Criar Projeto
                </Button>
              </div>
              <Select
                value={formData.project_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, project_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                      {project.client?.name && ` - ${project.client.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seção: Detalhes do Negócio */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Detalhes do Negócio</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <div className="space-y-2 border rounded-md p-3">
                  {["Planejados", "Móveis Soltos"].map((cat) => (
                    <div key={cat} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${cat}`}
                        checked={formData.categorias.includes(cat)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, categorias: [...formData.categorias, cat] });
                          } else {
                            setFormData({ ...formData, categorias: formData.categorias.filter(c => c !== cat) });
                          }
                        }}
                      />
                      <label htmlFor={`cat-${cat}`} className="text-sm cursor-pointer">{cat}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Centro de Custo *</Label>
                <div className="space-y-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                  {["Rústico", "Industrial", "Revenda", "Planejado", "Náutico"].map((cc) => (
                    <div key={cc} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cc-${cc}`}
                        checked={formData.centros_custo.includes(cc)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, centros_custo: [...formData.centros_custo, cc] });
                          } else {
                            setFormData({ ...formData, centros_custo: formData.centros_custo.filter(c => c !== cc) });
                          }
                        }}
                      />
                      <label htmlFor={`cc-${cc}`} className="text-sm cursor-pointer">{cc}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Tipo de Produto *</Label>
                <div className="grid grid-cols-3 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                  {["Sofá", "Poltrona", "Mesa", "Cadeira", "Aparador", "Banqueta", "Rack", "Cristaleira", "Estante", "Vaso", "Quadro", "Chaise", "Personalizado"].map((tp) => (
                    <div key={tp} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tp-${tp}`}
                        checked={formData.tipos_produto.includes(tp)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, tipos_produto: [...formData.tipos_produto, tp] });
                          } else {
                            setFormData({ ...formData, tipos_produto: formData.tipos_produto.filter(t => t !== tp) });
                          }
                        }}
                      />
                      <label htmlFor={`tp-${tp}`} className="text-sm cursor-pointer">{tp}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage">Etapa *</Label>
                <Select
                  value={formData.stage_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, stage_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>


          {/* Seção: Observações */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Observações</h3>
            <div className="space-y-2">
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) =>
                  setFormData({ ...formData, observations: e.target.value })
                }
                placeholder="Adicione observações sobre este negócio..."
                rows={3}
              />
            </div>
          </div>

          {/* Seção: Comunicação */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Comunicação (Opcional)</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="conversation_history">Histórico de Mensagens (IA / WhatsApp)</Label>
                <Textarea
                  id="conversation_history"
                  value={formData.conversation_history}
                  onChange={(e) =>
                    setFormData({ ...formData, conversation_history: e.target.value })
                  }
                  placeholder="Campo automatizado — recebe logs de conversas via integração com IA e WhatsApp"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  💬 Integração futura com WhatsApp para preencher automaticamente
                </p>
              </div>
            </div>
          </div>

          {/* Seção: Tarefas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Tarefas</h3>
            
            {/* Lista de tarefas adicionadas */}
            {tasks.length > 0 && (
              <div className="space-y-2 border rounded-md p-3">
                {tasks.map((task, index) => (
                  <div key={index} className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.due_at && (
                        <p className="text-xs text-muted-foreground">
                          📅 {format(task.due_at, "dd/MM/yyyy")}
                        </p>
                      )}
                      {task.note && (
                        <p className="text-xs text-muted-foreground mt-1">{task.note}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTasks(tasks.filter((_, i) => i !== index))}
                      className="h-7 px-2"
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário para adicionar nova tarefa */}
            <div className="space-y-3 border rounded-md p-3 bg-muted/20">
              <div className="space-y-2">
                <Label htmlFor="task_title">Título da Tarefa</Label>
                <Input
                  id="task_title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Ex: Ligar para cliente, Enviar proposta..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newTask.due_at && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTask.due_at ? (
                          format(newTask.due_at, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newTask.due_at}
                        onSelect={(date) => setNewTask({ ...newTask, due_at: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task_note">Observação</Label>
                  <Input
                    id="task_note"
                    value={newTask.note}
                    onChange={(e) => setNewTask({ ...newTask, note: e.target.value })}
                    placeholder="Observação opcional"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (newTask.title.trim()) {
                    setTasks([...tasks, newTask]);
                    setNewTask({ title: "", due_at: undefined, note: "" });
                  } else {
                    toast({
                      title: "Atenção",
                      description: "Digite um título para a tarefa",
                      variant: "destructive",
                    });
                  }
                }}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Tarefa
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <CreateClientDialog
        open={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
        onSuccess={handleClientCreated}
      />

      <CreateArchitectDialog
        open={isArchitectDialogOpen}
        onOpenChange={setIsArchitectDialogOpen}
        onSuccess={handleArchitectCreated}
      />

      <CreateProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
        onSuccess={() => {
          setIsProjectDialogOpen(false);
          handleProjectCreated();
        }}
      />
    </Dialog>
  );
}
