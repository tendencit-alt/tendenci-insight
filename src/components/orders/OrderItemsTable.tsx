import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface OrderItem {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  especificacoes?: string;
}

interface OrderItemsTableProps {
  items: OrderItem[];
  onItemsChange: (items: OrderItem[]) => void;
  readOnly?: boolean;
}

export function OrderItemsTable({ items, onItemsChange, readOnly = false }: OrderItemsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<OrderItem>>({
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
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
    };

    onItemsChange([...items, item]);
    setNewItem({ descricao: '', quantidade: 1, valor_unitario: 0 });
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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Descrição</TableHead>
            <TableHead className="w-[12%]">Qtd</TableHead>
            <TableHead className="w-[18%]">Valor Unit.</TableHead>
            <TableHead className="w-[18%]">Total</TableHead>
            {!readOnly && <TableHead className="w-[12%]">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              {editingId === item.id ? (
                <>
                  <TableCell>
                    <Input
                      value={item.descricao}
                      onChange={(e) => handleUpdateItem(item.id, { descricao: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantidade}
                      onChange={(e) => handleUpdateItem(item.id, { quantidade: Number(e.target.value) })}
                      min={1}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.valor_unitario}
                      onChange={(e) => handleUpdateItem(item.id, { valor_unitario: Number(e.target.value) })}
                      min={0}
                      step={0.01}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(item.valor_total)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.descricao}</p>
                      {item.especificacoes && (
                        <p className="text-xs text-muted-foreground">{item.especificacoes}</p>
                      )}
                    </div>
                  </TableCell>
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
          ))}

          {!readOnly && (
            <TableRow className="bg-muted/30">
              <TableCell>
                <Input
                  placeholder="Descrição do item"
                  value={newItem.descricao}
                  onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  placeholder="1"
                  value={newItem.quantidade}
                  onChange={(e) => setNewItem({ ...newItem, quantidade: Number(e.target.value) })}
                  min={1}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={newItem.valor_unitario}
                  onChange={(e) => setNewItem({ ...newItem, valor_unitario: Number(e.target.value) })}
                  min={0}
                  step={0.01}
                />
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency((newItem.quantidade || 0) * (newItem.valor_unitario || 0))}
              </TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" onClick={handleAddItem} disabled={!newItem.descricao}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          )}

          {items.length === 0 && readOnly && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum item
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
