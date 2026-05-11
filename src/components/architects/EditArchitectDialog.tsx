import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";

interface EditArchitectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  architect: any | null;
}

export function EditArchitectDialog({ open, onOpenChange, onSuccess, architect }: EditArchitectDialogProps) {
  const { isMaster } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    instagram: "",
    city: "",
    tier: "B",
    commission_percent: "10.00",
    birthday: "",
    active: true,
    notes: "",
    categoria: "metropolitano",
    data_primeiro_contato: "",
    data_ultimo_contato: "",
    vendedor_responsavel: ""
  });

  useEffect(() => {
    if (open && architect) {
      setFormData({
        name: architect.name || "",
        company: architect.company || "",
        phone: architect.phone || "",
        email: architect.email || "",
        instagram: architect.instagram || "",
        city: architect.city || "",
        tier: architect.tier || "B",
        commission_percent: architect.commission_percent?.toString() || "10.00",
        birthday: architect.birthday || "",
        active: architect.active ?? true,
        notes: architect.notes || "",
        categoria: architect.categoria || "metropolitano",
        data_primeiro_contato: architect.data_primeiro_contato || "",
        data_ultimo_contato: architect.data_ultimo_contato || "",
        vendedor_responsavel: architect.vendedor_responsavel || ""
      });
      fetchProjects();
      if (isMaster) {
        fetchVendedores();
      }
    }
  }, [open, architect, isMaster]);

  const fetchVendedores = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    
    if (!error && data) {
      setVendedores(data);
    }
  };

  const fetchProjects = async () => {
    if (!architect) return;

    // Buscar projetos sem profissional parceiro OU do profissional parceiro atual
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, stage, created_at, architect_id')
      .or(`architect_id.is.null,architect_id.eq.${architect.id}`)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setProjects(data);
      // Marcar projetos já vinculados
      setSelectedProjects(
        data.filter(p => p.architect_id === architect.id).map(p => p.id)
      );
    }
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !architect) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!formData.phone) {
      toast.error("WhatsApp é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        name: formData.name,
        company: formData.company || null,
        phone: formData.phone,
        email: formData.email || null,
        instagram: formData.instagram || null,
        city: formData.city || null,
        tier: formData.tier,
        commission_percent: parseFloat(formData.commission_percent),
        birthday: formData.birthday || null,
        active: formData.active,
        notes: formData.notes || null,
        categoria: formData.categoria,
        data_primeiro_contato: formData.data_primeiro_contato || null,
        data_ultimo_contato: formData.data_ultimo_contato || null
      };

      // Apenas MASTER pode alterar vendedor responsável
      if (isMaster && formData.vendedor_responsavel) {
        updateData.vendedor_responsavel = formData.vendedor_responsavel === "none" ? null : formData.vendedor_responsavel;
      }

      const { error } = await supabase
        .from("architects")
        .update(updateData)
        .eq('id', architect.id);

      if (error) throw error;

      // Atualizar vínculos de projetos
      // Remover vínculos antigos
      await supabase
        .from('projects')
        .update({ architect_id: null })
        .eq('architect_id', architect.id);

      // Adicionar novos vínculos
      if (selectedProjects.length > 0) {
        await supabase
          .from('projects')
          .update({ architect_id: architect.id })
          .in('id', selectedProjects);
      }

      // Registrar no histórico
      await supabase.from('architect_history').insert({
        architect_id: architect.id,
        event_type: 'sistema',
        description: 'Dados do profissional parceiro atualizados'
      });

      // SYNC: Se as notas foram alteradas, salvar também na architect_timeline
      if (formData.notes && formData.notes !== architect.notes) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('architect_timeline').insert({
          architect_id: architect.id,
          message: formData.notes,
          update_type: 'Observação',
          author_id: user?.id
        });
      }

      toast.success("Profissional Parceiro atualizado com sucesso!");
      
      onSuccess();
      onOpenChange(false);
      
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar profissional parceiro");
    } finally {
      setLoading(false);
    }
  };

  if (!architect) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Editar Profissional Parceiro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade/UF</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ex: São Paulo - SP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@usuario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metropolitano">Metropolitano</SelectItem>
                  <SelectItem value="captado">Captado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select value={formData.tier} onValueChange={(v) => setFormData({ ...formData, tier: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A - Premium</SelectItem>
                  <SelectItem value="B">B - Intermediário</SelectItem>
                  <SelectItem value="C">C - Básico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo de Vendedor Responsável - apenas para MASTER */}
            {isMaster && (
              <div className="space-y-2 col-span-2">
                <Label htmlFor="vendedor_responsavel">Vendedor Responsável</Label>
                <Select 
                  value={formData.vendedor_responsavel || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, vendedor_responsavel: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vendedor</SelectItem>
                    {vendedores.map((vendedor) => (
                      <SelectItem key={vendedor.id} value={vendedor.id}>
                        {vendedor.full_name || vendedor.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="commission">Comissão (%)</Label>
              <Input
                id="commission"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={formData.commission_percent}
                onChange={(e) => setFormData({ ...formData, commission_percent: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthday">Aniversário</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>

            <div className="space-y-2 flex items-center gap-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Ativo</Label>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anotações sobre o profissional parceiro..."
                rows={3}
              />
            </div>

            {/* Seção de Contato */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg col-span-2">
              <div className="space-y-0.5">
                <Label className="text-base">Gestão de Contato</Label>
                <p className="text-sm text-muted-foreground">Controle de interações e histórico de contato</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="data_primeiro_contato">Data do Primeiro Contato</Label>
                  <Input
                    id="data_primeiro_contato"
                    type="date"
                    value={formData.data_primeiro_contato}
                    onChange={(e) => setFormData({ ...formData, data_primeiro_contato: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_ultimo_contato">Data do Último Contato</Label>
                  <Input
                    id="data_ultimo_contato"
                    type="date"
                    value={formData.data_ultimo_contato}
                    onChange={(e) => setFormData({ ...formData, data_ultimo_contato: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Gerenciar Projetos Vinculados</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum projeto disponível
                  </p>
                ) : (
                  projects.map((project) => (
                    <Card
                      key={project.id}
                      className={`p-3 cursor-pointer transition-all ${
                        selectedProjects.includes(project.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => toggleProject(project.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(project.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant="outline">{project.stage}</Badge>
                      </div>
                    </Card>
                  ))
                )}
              </div>
              {selectedProjects.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedProjects.length} projeto(s) vinculado(s)
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
