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
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useCostCenters } from "@/hooks/useCostCenters";
import { CreateClientDialog } from "@/components/crm/CreateClientDialog";
import { CreateArchitectDialog } from "@/components/architects/CreateArchitectDialog";

interface CreateWonDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (dealId: string) => void;
  prefilledClientId?: string;
  prefilledArchitectId?: string;
}

const CATEGORIAS = [
  { value: "Móveis Planejados", label: "Móveis Planejados" },
  { value: "Móveis Soltos", label: "Móveis Soltos" },
];

// CENTROS_CUSTO now fetched dynamically via useCostCenters hook

const TIPOS_PRODUTO = [
  { value: "Sofá", label: "Sofá" },
  { value: "Mesa", label: "Mesa" },
  { value: "Cadeira", label: "Cadeira" },
  { value: "Armário", label: "Armário" },
  { value: "Cozinha", label: "Cozinha" },
  { value: "Closet", label: "Closet" },
  { value: "Home Office", label: "Home Office" },
  { value: "Quarto", label: "Quarto" },
  { value: "Sala", label: "Sala" },
  { value: "Área Externa", label: "Área Externa" },
  { value: "Outro", label: "Outro" },
];

export function CreateWonDealDialog({
  open,
  onOpenChange,
  onSuccess,
  prefilledClientId,
  prefilledArchitectId,
}: CreateWonDealDialogProps) {
  const { user } = useAuth();
  const { costCenters: CENTROS_CUSTO } = useCostCenters();
  const [loading, setLoading] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateArchitect, setShowCreateArchitect] = useState(false);

  const [clients, setClients] = useState<any[]>([]);
  const [architects, setArchitects] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [wonStage, setWonStage] = useState<any>(null);

  const [formData, setFormData] = useState({
    client_id: prefilledClientId || "",
    architect_id: prefilledArchitectId || "",
    value: "",
    categorias: [] as string[],
    centros_custo: [] as string[],
    tipos_produto: [] as string[],
    observations: "",
  });

  useEffect(() => {
    if (open) {
      fetchData();
      setFormData(prev => ({
        ...prev,
        client_id: prefilledClientId || "",
        architect_id: prefilledArchitectId || "",
      }));
    }
  }, [open, prefilledClientId, prefilledArchitectId]);

  const fetchData = async () => {
    // Fetch clients
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, cpf_cnpj")
      .order("name");
    setClients(clientsData || []);

    // Fetch architects
    const { data: architectsData } = await supabase
      .from("architects")
      .select("id, name, company")
      .eq("active", true)
      .order("name");
    setArchitects(architectsData || []);

    // Fetch pipelines to find won stage
    const { data: pipelinesData } = await supabase
      .from("crm_pipelines")
      .select("id, name")
      .order("created_at")
      .limit(1);

    if (pipelinesData && pipelinesData.length > 0) {
      setPipelines(pipelinesData);
      
      // Find "Ganho" stage in the first pipeline
      const { data: stagesData } = await supabase
        .from("crm_stages")
        .select("id, name")
        .eq("pipeline_id", pipelinesData[0].id)
        .or("name.ilike.%ganho%,name.ilike.%won%")
        .limit(1);

      if (stagesData && stagesData.length > 0) {
        setWonStage(stagesData[0]);
      }
    }
  };

  const handleClientCreated = async (clientId: string) => {
    await fetchData();
    setFormData(prev => ({ ...prev, client_id: clientId }));
    setShowCreateClient(false);
  };

  const handleArchitectCreated = async (architectId?: string) => {
    await fetchData();
    if (architectId) {
      setFormData(prev => ({ ...prev, architect_id: architectId }));
    }
    setShowCreateArchitect(false);
  };

  const handleCategoriaChange = (value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      categorias: checked 
        ? [...prev.categorias, value]
        : prev.categorias.filter(c => c !== value)
    }));
  };

  const handleCentroCustoChange = (value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      centros_custo: checked 
        ? [...prev.centros_custo, value]
        : prev.centros_custo.filter(c => c !== value)
    }));
  };

  const handleTipoProdutoChange = (value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      tipos_produto: checked 
        ? [...prev.tipos_produto, value]
        : prev.tipos_produto.filter(t => t !== value)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.client_id) {
      toast.error("Selecione um cliente");
      return;
    }

    if (!formData.value || Number(formData.value) <= 0) {
      toast.error("Informe o valor do negócio");
      return;
    }

    if (!wonStage) {
      toast.error("Etapa 'Ganho' não encontrada. Verifique o pipeline.");
      return;
    }

    setLoading(true);

    try {
      // Create lead for the client
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .insert({
          client_id: formData.client_id,
          status: "ganho",
          temperature: "quente",
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Generate title
      const categoriasTxt = formData.categorias.join(", ") || "Venda Direta";
      const produtosTxt = formData.tipos_produto.join(", ") || "";
      const autoTitle = produtosTxt ? `${categoriasTxt} - ${produtosTxt}` : categoriasTxt;

      // Create deal with status='won'
      const { data: dealData, error: dealError } = await supabase
        .from("crm_deals")
        .insert({
          pipeline_id: pipelines[0]?.id,
          stage_id: wonStage.id,
          title: autoTitle,
          lead_id: leadData.id,
          architect_id: formData.architect_id || null,
          owner_id: user?.id,
          value: Number(formData.value),
          note: formData.observations || null,
          categoria: formData.categorias.join(", ") || null,
          centro_custo: formData.centros_custo.join(", ") || null,
          tipo_produto: formData.tipos_produto.join(", ") || null,
          status: "won",
        })
        .select()
        .single();

      if (dealError) throw dealError;

      toast.success("Negócio ganho criado com sucesso!");
      onSuccess(dealData.id);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        client_id: "",
        architect_id: "",
        value: "",
        categorias: [],
        centros_custo: [],
        tipos_produto: [],
        observations: "",
      });
    } catch (error: any) {
      console.error("Error creating won deal:", error);
      toast.error("Erro ao criar negócio: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/\D/g, "");
    const formatted = (Number(num) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatted;
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const numericValue = Number(raw) / 100;
    setFormData(prev => ({ ...prev, value: numericValue.toString() }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Negócio Ganho</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.client_id || "_none"}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, client_id: v === "_none" ? "" : v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" disabled>Selecione o cliente</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.cpf_cnpj && `(${client.cpf_cnpj})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCreateClient(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Parceiro Profissional */}
            <div className="space-y-2">
              <Label>Parceiro Profissional</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.architect_id || "_none"}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, architect_id: v === "_none" ? "" : v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sem parceiro profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sem parceiro profissional</SelectItem>
                    {architects.map((arch) => (
                      <SelectItem key={arch.id} value={arch.id}>
                        {arch.name} {arch.company && `- ${arch.company}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCreateArchitect(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="text"
                placeholder="0,00"
                value={formData.value ? formatCurrency((Number(formData.value) * 100).toString()) : ""}
                onChange={handleValueChange}
              />
            </div>

            {/* Categorias */}
            <div className="space-y-2">
              <Label>Categorias</Label>
              <div className="flex flex-wrap gap-3">
                {CATEGORIAS.map((cat) => (
                  <div key={cat.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${cat.value}`}
                      checked={formData.categorias.includes(cat.value)}
                      onCheckedChange={(checked) => handleCategoriaChange(cat.value, !!checked)}
                    />
                    <label htmlFor={`cat-${cat.value}`} className="text-sm cursor-pointer">
                      {cat.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Centro de Custo */}
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <div className="flex flex-wrap gap-3">
                {CENTROS_CUSTO.map((cc) => (
                  <div key={cc.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`cc-${cc.value}`}
                      checked={formData.centros_custo.includes(cc.value)}
                      onCheckedChange={(checked) => handleCentroCustoChange(cc.value, !!checked)}
                    />
                    <label htmlFor={`cc-${cc.value}`} className="text-sm cursor-pointer">
                      {cc.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipos de Produto */}
            <div className="space-y-2">
              <Label>Tipos de Produto</Label>
              <div className="flex flex-wrap gap-3">
                {TIPOS_PRODUTO.map((tp) => (
                  <div key={tp.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`tp-${tp.value}`}
                      checked={formData.tipos_produto.includes(tp.value)}
                      onCheckedChange={(checked) => handleTipoProdutoChange(tp.value, !!checked)}
                    />
                    <label htmlFor={`tp-${tp.value}`} className="text-sm cursor-pointer">
                      {tp.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações sobre o negócio..."
                value={formData.observations}
                onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Negócio Ganho"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onSuccess={handleClientCreated}
      />

      <CreateArchitectDialog
        open={showCreateArchitect}
        onOpenChange={setShowCreateArchitect}
        onSuccess={handleArchitectCreated}
      />
    </>
  );
}
