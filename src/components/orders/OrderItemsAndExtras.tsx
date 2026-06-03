import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Paperclip, Upload, Trash2, ChevronDown, ChevronRight,
  Plus, FileText, Download, Pencil, Check, X, Info, Package,
} from "lucide-react";
import { toast } from "sonner";

interface OrderItemRow {
  id: string;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  codigo_produto: string | null;
  ncm: string | null;
  cfop: string | null;
  observacao: string | null;
}

interface ExtraInfoRow {
  id: string;
  titulo: string;
  observacao: string | null;
  position: number;
  order_id: string;
  tenant_id: string;
}

interface AttachmentRow {
  id: string;
  order_item_id: string | null;
  extra_info_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

interface Props {
  orderId: string;
  tenantId: string;
}

const BUCKET = "order-item-files";

export function OrderItemsAndExtras({ orderId, tenantId }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draftObs, setDraftObs] = useState<Record<string, string>>({});
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const itemsQ = useQuery({
    queryKey: ["order-items-rich", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, descricao, quantidade, unidade, codigo_produto, ncm, cfop, observacao")
        .eq("order_id", orderId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as OrderItemRow[];
    },
    enabled: !!orderId,
  });

  const extrasQ = useQuery({
    queryKey: ["order-extras", orderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("order_extra_info")
        .select("id, titulo, observacao, position, order_id, tenant_id")
        .eq("order_id", orderId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as ExtraInfoRow[];
    },
    enabled: !!orderId,
  });

  const attachQ = useQuery({
    queryKey: ["order-item-attachments", orderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("order_item_attachments")
        .select("id, order_item_id, extra_info_id, storage_path, file_name, mime_type, size_bytes, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AttachmentRow[];
    },
    enabled: !!orderId,
  });

  const items = itemsQ.data ?? [];
  const extras = extrasQ.data ?? [];
  const attachments = attachQ.data ?? [];

  const attsByItem = (id: string) => attachments.filter((a) => a.order_item_id === id);
  const attsByExtra = (id: string) => attachments.filter((a) => a.extra_info_id === id);

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const saveItemObs = useMutation({
    mutationFn: async ({ id, obs }: { id: string; obs: string }) => {
      const { error } = await supabase.from("order_items").update({ observacao: obs } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Observação salva");
      qc.invalidateQueries({ queryKey: ["order-items-rich", orderId] });
      setDraftObs((p) => { const n = { ...p }; return n; });
    },
    onError: (e: any) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const saveExtra = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ExtraInfoRow> }) => {
      const { error } = await (supabase as any).from("order_extra_info").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order-extras", orderId] });
    },
    onError: (e: any) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const addExtra = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("order_extra_info").insert({
        tenant_id: tenantId,
        order_id: orderId,
        titulo: "Informação Complementar",
        position: extras.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Informação complementar adicionada");
      qc.invalidateQueries({ queryKey: ["order-extras", orderId] });
    },
    onError: (e: any) => toast.error("Erro ao adicionar", { description: e.message }),
  });

  const removeExtra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("order_extra_info").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["order-extras", orderId] });
      qc.invalidateQueries({ queryKey: ["order-item-attachments", orderId] });
    },
    onError: (e: any) => toast.error("Erro ao remover", { description: e.message }),
  });

  const uploadFile = async (file: File, target: { order_item_id?: string; extra_info_id?: string }) => {
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${tenantId}/${orderId}/${crypto.randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (upErr) {
      toast.error("Falha no upload", { description: upErr.message });
      return;
    }
    const { error: insErr } = await (supabase as any).from("order_item_attachments").insert({
      tenant_id: tenantId,
      order_id: orderId,
      order_item_id: target.order_item_id ?? null,
      extra_info_id: target.extra_info_id ?? null,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    });
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.error("Falha ao registrar arquivo", { description: insErr.message });
      return;
    }
    toast.success("Arquivo enviado");
    qc.invalidateQueries({ queryKey: ["order-item-attachments", orderId] });
  };

  const handleFiles = async (files: FileList | null, target: { order_item_id?: string; extra_info_id?: string }) => {
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) {
      // eslint-disable-next-line no-await-in-loop
      await uploadFile(f, target);
    }
  };

  const removeAttachment = useMutation({
    mutationFn: async (att: AttachmentRow) => {
      await supabase.storage.from(BUCKET).remove([att.storage_path]);
      const { error } = await (supabase as any).from("order_item_attachments").delete().eq("id", att.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Arquivo removido");
      qc.invalidateQueries({ queryKey: ["order-item-attachments", orderId] });
    },
    onError: (e: any) => toast.error("Erro ao remover", { description: e.message }),
  });

  const downloadAttachment = async (att: AttachmentRow) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(att.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao gerar link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const renderAttachments = (atts: AttachmentRow[]) => {
    if (atts.length === 0) return <p className="text-xs text-muted-foreground">Nenhum arquivo anexado.</p>;
    return (
      <ul className="space-y-1">
        {atts.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
            <button onClick={() => downloadAttachment(a)} className="flex min-w-0 items-center gap-2 text-left hover:underline">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{a.file_name}</span>
              {typeof a.size_bytes === "number" && (
                <span className="shrink-0 text-muted-foreground">
                  ({(a.size_bytes / 1024).toFixed(0)} KB)
                </span>
              )}
            </button>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadAttachment(a)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => removeAttachment.mutate(a)}
                disabled={removeAttachment.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderUploadRow = (target: { order_item_id?: string; extra_info_id?: string }, refKey: string) => (
    <div className="flex items-center gap-2">
      <input
        ref={(el) => { fileInputs.current[refKey] = el; }}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files, target);
          if (e.target) e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => fileInputs.current[refKey]?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
        Anexar arquivos
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Itens do Pedido ({items.length})</span>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => addExtra.mutate()} disabled={addExtra.isPending}>
          <Plus className="h-3.5 w-3.5" />
          Informação Complementar
        </Button>
      </div>

      <Card className="divide-y overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 items-center gap-2 bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <div className="col-span-1"></div>
          <div className="col-span-1">Código</div>
          <div className="col-span-6">Descrição</div>
          <div className="col-span-1 text-center">NCM</div>
          <div className="col-span-1 text-center">CFOP</div>
          <div className="col-span-1 text-center">UN</div>
          <div className="col-span-1 text-right">Qtd</div>
        </div>

        {items.length === 0 && extras.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">Sem itens neste pedido.</div>
        )}

        {/* Items */}
        {items.map((it) => {
          const isOpen = !!expanded[`i:${it.id}`];
          const atts = attsByItem(it.id);
          const obsValue = draftObs[`i:${it.id}`] ?? it.observacao ?? "";
          return (
            <div key={it.id}>
              <button
                type="button"
                onClick={() => toggle(`i:${it.id}`)}
                className="grid w-full grid-cols-12 items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/30"
              >
                <div className="col-span-1">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                <div className="col-span-1 text-muted-foreground">{it.codigo_produto || "—"}</div>
                <div className="col-span-6 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{it.descricao}</span>
                    {atts.length > 0 && (
                      <Badge variant="secondary" className="h-5 gap-1 text-[10px]">
                        <Paperclip className="h-3 w-3" />
                        {atts.length}
                      </Badge>
                    )}
                    {it.observacao && (
                      <Badge variant="outline" className="h-5 text-[10px]">obs</Badge>
                    )}
                  </div>
                </div>
                <div className="col-span-1 text-center text-muted-foreground">{it.ncm || "—"}</div>
                <div className="col-span-1 text-center text-muted-foreground">{it.cfop || "—"}</div>
                <div className="col-span-1 text-center text-muted-foreground">{it.unidade || "UN"}</div>
                <div className="col-span-1 text-right">{it.quantidade}</div>
              </button>

              {isOpen && (
                <div className="space-y-3 border-t bg-muted/10 px-4 py-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Observação</label>
                    <Textarea
                      rows={3}
                      placeholder="Observações específicas deste item..."
                      value={obsValue}
                      onChange={(e) => setDraftObs((p) => ({ ...p, [`i:${it.id}`]: e.target.value }))}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => saveItemObs.mutate({ id: it.id, obs: obsValue })}
                        disabled={saveItemObs.isPending || obsValue === (it.observacao ?? "")}
                      >
                        Salvar observação
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Arquivos</label>
                      {renderUploadRow({ order_item_id: it.id }, `i:${it.id}`)}
                    </div>
                    {renderAttachments(atts)}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Extras (Informação Complementar) */}
        {extras.map((ex) => {
          const isOpen = expanded[`e:${ex.id}`] !== false; // open by default
          const atts = attsByExtra(ex.id);
          const obsValue = draftObs[`e:${ex.id}`] ?? ex.observacao ?? "";
          const isEditingTitle = editingTitleId === ex.id;
          return (
            <div key={ex.id} className="bg-amber-50/30 dark:bg-amber-950/10">
              <div className="grid w-full grid-cols-12 items-center gap-2 px-3 py-2 text-sm">
                <button type="button" className="col-span-1" onClick={() => toggle(`e:${ex.id}`)}>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <div className="col-span-1 flex items-center text-amber-700 dark:text-amber-400">
                  <Info className="h-4 w-4" />
                </div>
                <div className="col-span-8 min-w-0">
                  {isEditingTitle ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveExtra.mutate({ id: ex.id, patch: { titulo: draftTitle.trim() || "Informação Complementar" } });
                            setEditingTitleId(null);
                          } else if (e.key === "Escape") {
                            setEditingTitleId(null);
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          saveExtra.mutate({ id: ex.id, patch: { titulo: draftTitle.trim() || "Informação Complementar" } });
                          setEditingTitleId(null);
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingTitleId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{ex.titulo}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-60 hover:opacity-100"
                        onClick={() => { setEditingTitleId(ex.id); setDraftTitle(ex.titulo); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {atts.length > 0 && (
                        <Badge variant="secondary" className="h-5 gap-1 text-[10px]">
                          <Paperclip className="h-3 w-3" />
                          {atts.length}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => {
                      if (confirm(`Remover "${ex.titulo}" e seus arquivos?`)) removeExtra.mutate(ex.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="space-y-3 border-t bg-background/40 px-4 py-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Observação</label>
                    <Textarea
                      rows={3}
                      placeholder="Descreva esta informação complementar..."
                      value={obsValue}
                      onChange={(e) => setDraftObs((p) => ({ ...p, [`e:${ex.id}`]: e.target.value }))}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => saveExtra.mutate({ id: ex.id, patch: { observacao: obsValue } })}
                        disabled={saveExtra.isPending || obsValue === (ex.observacao ?? "")}
                      >
                        Salvar observação
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Arquivos</label>
                      {renderUploadRow({ extra_info_id: ex.id }, `e:${ex.id}`)}
                    </div>
                    {renderAttachments(atts)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
