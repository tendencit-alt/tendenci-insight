import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, ExternalLink, Share2, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toSlug(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function SharePublicCatalogPanel() {
  const { activeTenantId } = useActiveTenant();
  const qc = useQueryClient();
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [publico, setPublico] = useState(false);
  const [indexavel, setIndexavel] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["share-public-catalog", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const [{ data: t, error: e1 }, { data: s, error: e2 }] = await Promise.all([
        supabase
          .from("tenants")
          .select("slug, catalogo_publico_ativo, name")
          .eq("id", activeTenantId!)
          .maybeSingle(),
        supabase
          .from("tenant_catalogo_settings" as any)
          .select("catalogo_indexavel")
          .eq("tenant_id", activeTenantId!)
          .maybeSingle(),
      ]);
      if (e1) throw e1;
      if (e2 && e2.code !== "PGRST116") throw e2;
      return {
        slug: (t as any)?.slug || "",
        publico: !!(t as any)?.catalogo_publico_ativo,
        indexavel: !!(s as any)?.catalogo_indexavel,
        name: (t as any)?.name || "",
      };
    },
  });

  useEffect(() => {
    if (data) {
      setSlug(data.slug);
      setPublico(data.publico);
      setIndexavel(data.indexavel);
      setSlugDirty(false);
    }
  }, [data]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://www.tendencitech.com.br";
  const publicUrl = useMemo(() => (slug ? `${origin}/c/${slug}` : ""), [origin, slug]);
  const qrUrl = publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicUrl)}`
    : "";

  const slugValid = !slug || SLUG_REGEX.test(slug);

  const handleSave = async () => {
    if (!activeTenantId) return;
    if (!slugValid) {
      toast.error("Slug inválido. Use minúsculas, números e hífens.");
      return;
    }
    setSaving(true);
    try {
      const updates: any = {
        catalogo_publico_ativo: publico,
      };
      if (slugDirty) updates.slug = slug || null;

      const { error: e1 } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", activeTenantId);
      if (e1) {
        if ((e1 as any).code === "23505") {
          toast.error("Esse slug já está em uso. Escolha outro.");
        } else {
          toast.error("Erro ao salvar: " + e1.message);
        }
        return;
      }

      const { error: e2 } = await supabase
        .from("tenant_catalogo_settings" as any)
        .upsert(
          { tenant_id: activeTenantId, catalogo_indexavel: indexavel },
          { onConflict: "tenant_id" }
        );
      if (e2) {
        toast.error("Erro ao salvar indexação: " + e2.message);
        return;
      }

      toast.success("Configurações do catálogo público salvas.");
      qc.invalidateQueries({ queryKey: ["share-public-catalog"] });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("URL copiada!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <Card className="p-5 space-y-4 border-primary/30">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Share2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">Compartilhar catálogo público</h2>
          <p className="text-sm text-muted-foreground">
            Publique sua vitrine em uma URL pública para clientes finais.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={publico} onCheckedChange={setPublico} />
          <Label className="cursor-pointer" onClick={() => setPublico(!publico)}>
            Publicar catálogo
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={indexavel} onCheckedChange={setIndexavel} />
          <Label className="cursor-pointer" onClick={() => setIndexavel(!indexavel)}>
            Indexável (Google)
          </Label>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_auto] gap-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Slug da URL</Label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground">
                /c/
              </div>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(toSlug(e.target.value));
                  setSlugDirty(true);
                }}
                placeholder="minha-empresa"
                aria-invalid={!slugValid}
              />
            </div>
            {!slugValid && (
              <p className="text-xs text-destructive">
                Use somente letras minúsculas, números e hífens.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>URL pública</Label>
            <div className="flex gap-2">
              <Input value={publicUrl} readOnly placeholder="Defina o slug primeiro" />
              <Button type="button" variant="outline" onClick={handleCopy} disabled={!publicUrl}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" asChild disabled={!publicUrl}>
                <a href={publicUrl || "#"} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || isLoading}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="w-[180px] h-[180px] rounded-md border bg-background flex items-center justify-center overflow-hidden">
            {qrUrl ? (
              <img src={qrUrl} alt="QR code" className="w-full h-full" />
            ) : (
              <QrCode className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">QR code da URL</p>
        </div>
      </div>
    </Card>
  );
}
