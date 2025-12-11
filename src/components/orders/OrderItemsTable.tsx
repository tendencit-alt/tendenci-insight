import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, Edit2, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface OrderItem {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  especificacoes?: string;
  codigo_produto?: string;
  ncm?: string;
  cfop?: string;
  unidade?: string;
}

interface OrderItemsTableProps {
  items: OrderItem[];
  onItemsChange: (items: OrderItem[]) => void;
  readOnly?: boolean;
  showFiscalFields?: boolean;
}

export function OrderItemsTable({ items, onItemsChange, readOnly = false, showFiscalFields = false }: OrderItemsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<OrderItem>>({
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    codigo_produto: '',
    ncm: '',
    cfop: '',
    unidade: 'UN',
    especificacoes: '',
  });

  const handleAddItem = () => {
    if (!newItem.descricao || !newItem.valor_unitario) return;

    const item: OrderItem = {
      id: crypto.randomUUID(),
      descricao: newItem.descricao,
      quantidade: newItem.quantidade || 1,
      valor_unitario: newItem.valor_unitario,
      valor_total: (newItem.quantidade || 1) * newItem.valor_unitario,
      especificacoes: newItem.especificacoes,
      codigo_produto: newItem.codigo_produto,
      ncm: newItem.ncm,
      cfop: newItem.cfop,
      unidade: newItem.unidade || 'UN',
    };

    onItemsChange([...items, item]);
    setNewItem({ descricao: '', quantidade: 1, valor_unitario: 0, codigo_produto: '', ncm: '', cfop: '', unidade: 'UN', especificacoes: '' });
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<OrderItem>) => {
    onItemsChange(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          updated.valor_total = updated.quantidade * updated.valor_unitario;
          return updated;
        }
        return item;
      })
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {showFiscalFields && <TableHead className="w-[100px]">Código</TableHead>}
            <TableHead className={showFiscalFields ? "w-[30%]" : "w-[40%]"}>Descrição</TableHead>
            {showFiscalFields && <TableHead className="w-[80px]">NCM</TableHead>}
            {showFiscalFields && <TableHead className="w-[60px]">CFOP</TableHead>}
            {showFiscalFields && <TableHead className="w-[50px]">UN</TableHead>}
            <TableHead className="w-[60px]">Qtd</TableHead>
            <TableHead className="w-[100px]">V.Unit.</TableHead>
            <TableHead className="w-[100px]">Total</TableHead>
            {!readOnly && <TableHead className="w-[80px]">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <Collapsible key={item.id} open={expandedId === item.id} onOpenChange={(open) => setExpandedId(open ? item.id : null)} asChild>
              <>
                <TableRow>
                  {editingId === item.id ? (
                    <>
                      {showFiscalFields && (
                        <TableCell>
                          <Input className="h-8" value={item.codigo_produto || ''} onChange={(e) => handleUpdateItem(item.id, { codigo_produto: e.target.value })} placeholder="Código" />
                        </TableCell>
                      )}
                      <TableCell>
                        <Input className="h-8" value={item.descricao} onChange={(e) => handleUpdateItem(item.id, { descricao: e.target.value })} />
                      </TableCell>
                      {showFiscalFields && (
                        <>
                          <TableCell>
                            <Input className="h-8" value={item.ncm || ''} onChange={(e) => handleUpdateItem(item.id, { ncm: e.target.value })} placeholder="NCM" />
                          </TableCell>
                          <TableCell>
                            <Input className="h-8" value={item.cfop || ''} onChange={(e) => handleUpdateItem(item.id, { cfop: e.target.value })} placeholder="CFOP" />
                          </TableCell>
                          <TableCell>
                            <Input className="h-8 w-12" value={item.unidade || 'UN'} onChange={(e) => handleUpdateItem(item.id, { unidade: e.target.value })} />
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <Input type="number" className="h-8 w-16" value={item.quantidade} onChange={(e) => handleUpdateItem(item.id, { quantidade: Number(e.target.value) })} min={1} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-8" value={item.valor_unitario} onChange={(e) => handleUpdateItem(item.id, { valor_unitario: Number(e.target.value) })} min={0} step={0.01} />
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.valor_total)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      {showFiscalFields && (
                        <TableCell className="font-mono text-xs">{item.codigo_produto || '-'}</TableCell>
                      )}
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <div className="cursor-pointer">
                            <p className="font-medium flex items-center gap-1">
                              {item.descricao}
                              {item.especificacoes && (
                                expandedId === item.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                              )}
                            </p>
                          </div>
                        </CollapsibleTrigger>
                      </TableCell>
                      {showFiscalFields && (
                        <>
                          <TableCell className="font-mono text-xs">{item.ncm || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{item.cfop || '-'}</TableCell>
                          <TableCell className="text-xs">{item.unidade || 'UN'}</TableCell>
                        </>
                      )}
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>{formatCurrency(item.valor_unitario)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.valor_total)}</TableCell>
                      {!readOnly && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setEditingId(item.id)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveItem(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
                {item.especificacoes && (
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={showFiscalFields ? 9 : 5} className="py-2">
                        <p className="text-xs text-muted-foreground">{item.especificacoes}</p>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                )}
              </>
            </Collapsible>
          ))}

          {!readOnly && (
            <TableRow className="bg-muted/30">
              {showFiscalFields && (
                <TableCell>
                  <Input className="h-8" placeholder="Código" value={newItem.codigo_produto} onChange={(e) => setNewItem({ ...newItem, codigo_produto: e.target.value })} />
                </TableCell>
              )}
              <TableCell>
                <Input className="h-8" placeholder="Descrição do item *" value={newItem.descricao} onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })} />
              </TableCell>
              {showFiscalFields && (
                <>
                  <TableCell>
                    <Input className="h-8" placeholder="NCM" value={newItem.ncm} onChange={(e) => setNewItem({ ...newItem, ncm: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8" placeholder="CFOP" value={newItem.cfop} onChange={(e) => setNewItem({ ...newItem, cfop: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 w-12" placeholder="UN" value={newItem.unidade} onChange={(e) => setNewItem({ ...newItem, unidade: e.target.value })} />
                  </TableCell>
                </>
              )}
              <TableCell>
                <Input type="number" className="h-8 w-16" placeholder="1" value={newItem.quantidade} onChange={(e) => setNewItem({ ...newItem, quantidade: Number(e.target.value) })} min={1} />
              </TableCell>
              <TableCell>
                <Input type="number" className="h-8" placeholder="0,00" value={newItem.valor_unitario} onChange={(e) => setNewItem({ ...newItem, valor_unitario: Number(e.target.value) })} min={0} step={0.01} />
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency((newItem.quantidade || 0) * (newItem.valor_unitario || 0))}
              </TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" onClick={handleAddItem} disabled={!newItem.descricao || !newItem.valor_unitario}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          )}

          {items.length === 0 && readOnly && (
            <TableRow>
              <TableCell colSpan={showFiscalFields ? 8 : 5} className="text-center text-muted-foreground">
                Nenhum item
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {!readOnly && showFiscalFields && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Especificações do item (adicionar ao item acima)</p>
          <Textarea
            placeholder="Observações, especificações técnicas, cores, tamanhos..."
            value={newItem.especificacoes}
            onChange={(e) => setNewItem({ ...newItem, especificacoes: e.target.value })}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
