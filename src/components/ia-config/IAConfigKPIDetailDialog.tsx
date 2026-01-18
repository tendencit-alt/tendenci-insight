import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Package, BookOpen, Shield, Zap } from "lucide-react";

type KPIType = "produtos" | "conhecimento" | "regras" | "tecnicas";

interface IAConfigKPIDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: KPIType;
  regrasData?: { tipo: string; descricao: string }[];
  tecnicasData?: { nome: string; descricao: string }[];
}

interface Produto {
  id: string;
  nome: string;
  categoria: string | null;
  sub_categoria: string | null;
  preco_base: number;
  ativo: boolean;
}

interface Conhecimento {
  id: string;
  titulo: string;
  tipo: string | null;
  created_at: string | null;
}

const kpiConfig: Record<KPIType, { title: string; icon: typeof Package; color: string }> = {
  produtos: { title: "Produtos Cadastrados", icon: Package, color: "text-blue-500" },
  conhecimento: { title: "Base de Conhecimento", icon: BookOpen, color: "text-purple-500" },
  regras: { title: "Regras de Negócio", icon: Shield, color: "text-orange-500" },
  tecnicas: { title: "Técnicas de Venda", icon: Zap, color: "text-green-500" },
};

export function IAConfigKPIDetailDialog({
  open,
  onOpenChange,
  type,
  regrasData = [],
  tecnicasData = [],
}: IAConfigKPIDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [conhecimento, setConhecimento] = useState<Conhecimento[]>([]);

  useEffect(() => {
    if (open && (type === "produtos" || type === "conhecimento")) {
      fetchData();
    }
  }, [open, type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (type === "produtos") {
        const { data, error } = await supabase
          .from("tendenci_ia_produtos")
          .select("id, nome, categoria, sub_categoria, preco_base, ativo")
          .order("nome");
        if (error) throw error;
        setProdutos(data || []);
      } else if (type === "conhecimento") {
        const { data, error } = await supabase
          .from("tendenci_ia_conhecimento")
          .select("id, titulo, tipo, created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setConhecimento(data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const config = kpiConfig[type];
  const Icon = config.icon;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    switch (type) {
      case "produtos":
        return (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum produto cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  produtos.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-medium">{produto.nome}</TableCell>
                      <TableCell>
                        {produto.categoria ? (
                          <Badge variant="secondary">{produto.categoria}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {produto.sub_categoria ? (
                          <Badge variant="outline">{produto.sub_categoria}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(produto.preco_base)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={produto.ativo ? "default" : "secondary"}>
                          {produto.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {produtos.length > 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between text-sm">
                <span>Total de produtos: <strong>{produtos.length}</strong></span>
                <span>Ativos: <strong>{produtos.filter(p => p.ativo).length}</strong></span>
                <span>Valor total: <strong>{formatCurrency(produtos.reduce((sum, p) => sum + p.preco_base, 0))}</strong></span>
              </div>
            )}
          </div>
        );

      case "conhecimento":
        return (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conhecimento.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nenhum conhecimento cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  conhecimento.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.titulo}</TableCell>
                      <TableCell>
                        {item.tipo ? (
                          <Badge variant="secondary">{item.tipo}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {conhecimento.length > 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <span>Total de itens: <strong>{conhecimento.length}</strong></span>
              </div>
            )}
          </div>
        );

      case "regras":
        return (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">#</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regrasData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nenhuma regra cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  regrasData.map((regra, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{regra.tipo || "Geral"}</Badge>
                      </TableCell>
                      <TableCell>{regra.descricao}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {regrasData.length > 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <span>Total de regras: <strong>{regrasData.length}</strong></span>
              </div>
            )}
          </div>
        );

      case "tecnicas":
        return (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">#</TableHead>
                  <TableHead>Técnica</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tecnicasData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nenhuma técnica cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  tecnicasData.map((tecnica, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{tecnica.nome || `Técnica ${index + 1}`}</TableCell>
                      <TableCell>{tecnica.descricao}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {tecnicasData.length > 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <span>Total de técnicas: <strong>{tecnicasData.length}</strong></span>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            {config.title}
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
