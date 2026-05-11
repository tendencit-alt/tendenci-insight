import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea";
interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

const initialForm = {
  nome_empresa: "",
  ramo: "",
  localizacao: "",
  horario_funcionamento: "",
  descricao: "",
  produtos_servicos: "",
  diferenciais: "",
  publico_alvo: "",
};

export default function IAConfigNegocio({ config, onSave, saving }: Props) {
  const [form, setForm, clearPersistedData, hasRestoredData] = useFormPersistence(
    'ia_config_negocio',
    initialForm,
    true
  );

  useEffect(() => {
    if (config && !hasRestoredData) {
      setForm({
        nome_empresa: (config.nome_empresa as string) || "",
        ramo: (config.ramo as string) || "",
        localizacao: (config.localizacao as string) || "",
        horario_funcionamento: (config.horario_funcionamento as string) || "",
        descricao: (config.descricao as string) || "",
        produtos_servicos: (config.produtos_servicos as string) || "",
        diferenciais: (config.diferenciais as string) || "",
        publico_alvo: (config.publico_alvo as string) || "",
      });
    }
  }, [config, hasRestoredData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    clearPersistedData();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSaveIndicator hasRestoredData={hasRestoredData} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome_empresa">Nome da Empresa</Label>
          <Input
            id="nome_empresa"
            value={form.nome_empresa}
            onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })}
            placeholder="Ex: Tendenci Móveis"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ramo">Ramo de Atuação</Label>
          <Input
            id="ramo"
            value={form.ramo}
            onChange={(e) => setForm({ ...form, ramo: e.target.value })}
            placeholder="Ex: Móveis planejados e decoração"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="localizacao">Localização / Região de Atendimento</Label>
          <Input
            id="localizacao"
            value={form.localizacao}
            onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
            placeholder="Ex: São Paulo - SP e região metropolitana"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="horario_funcionamento">Horário de Funcionamento</Label>
          <Input
            id="horario_funcionamento"
            value={form.horario_funcionamento}
            onChange={(e) => setForm({ ...form, horario_funcionamento: e.target.value })}
            placeholder="Ex: Seg a Sex 8h às 18h, Sáb 9h às 13h"
          />
        </div>
      </div>

      <EnhancedTextarea
        label="Descrição do Negócio"
        value={form.descricao}
        onChange={(value) => setForm({ ...form, descricao: value })}
        placeholder="O que a empresa faz, história, missão, visão. Ex: Somos uma empresa de móveis planejados fundada em 2010, especializada em ambientes corporativos e residenciais de alto padrão..."
        rows={4}
        context="Descrição do negócio - história, missão e o que a empresa faz"
      />

      <EnhancedTextarea
        label="Produtos e Serviços"
        value={form.produtos_servicos}
        onChange={(value) => setForm({ ...form, produtos_servicos: value })}
        placeholder="Liste os principais produtos e serviços oferecidos. Ex: Móveis planejados para cozinha, dormitórios e home office; Projeto 3D gratuito; Instalação inclusa; Manutenção pós-venda..."
        rows={4}
        context="Produtos e serviços oferecidos pela empresa para o agente conhecer e oferecer"
      />

      <EnhancedTextarea
        label="Diferenciais Competitivos"
        value={form.diferenciais}
        onChange={(value) => setForm({ ...form, diferenciais: value })}
        placeholder="O que diferencia sua empresa dos concorrentes. Ex: Fabricação própria, garantia de 5 anos, atendimento personalizado, entrega em 30 dias, uso de materiais premium..."
        rows={4}
        context="Diferenciais competitivos da empresa para destacar ao cliente"
      />

      <EnhancedTextarea
        label="Público-Alvo"
        value={form.publico_alvo}
        onChange={(value) => setForm({ ...form, publico_alvo: value })}
        placeholder="Quem são seus clientes ideais. Ex: Profissionais Parceiros especificadores, construtoras de médio e grande porte, clientes finais classe A/B que buscam qualidade e personalização..."
        rows={4}
        context="Público-alvo e perfil de cliente ideal para adaptar a abordagem"
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>
    </form>
  );
}
