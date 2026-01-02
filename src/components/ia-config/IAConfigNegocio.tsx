import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";

interface Props {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

export default function IAConfigNegocio({ config, onSave, saving }: Props) {
  const [form, setForm] = useState({
    nome_empresa: "",
    ramo: "",
    localizacao: "",
    horario_funcionamento: "",
    descricao: "",
  });

  useEffect(() => {
    if (config) {
      setForm({
        nome_empresa: (config.nome_empresa as string) || "",
        ramo: (config.ramo as string) || "",
        localizacao: (config.localizacao as string) || "",
        horario_funcionamento: (config.horario_funcionamento as string) || "",
        descricao: (config.descricao as string) || "",
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição do Negócio (para contextualizar a IA)</Label>
        <Textarea
          id="descricao"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          placeholder="Descreva seu negócio, história, diferenciais, público-alvo..."
          rows={5}
        />
      </div>

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
