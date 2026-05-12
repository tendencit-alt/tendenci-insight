import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Store, Upload, Save, ExternalLink } from "lucide-react";

interface CatalogSettings {
  tenant_id: string;
  logo_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  footer_company_name: string | null;
  footer_copyright: string | null;
  whatsapp_url: string | null;
  instagram_url: string | null;
  primary_color: string | null;
}

const empty = {
  logo_url: "",
  hero_title: "",
  hero_subtitle: "",
  footer_company_name: "",
  footer_copyright: "",
  whatsapp_url: "",
  instagram_url: "",
  primary_color: "#C41E3A",
};

export default function ConfiguracoesCatalogo() {
  const { activeTenantId } = useActiveTenant();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery<CatalogSettings | null>({
    queryKey: ["catalog-settings-edit", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_catalogo_settings" as any)
        .select("*")
        .eq("tenant_id", activeTenantId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || null;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        logo_url: data.logo_url || "",
        hero_title: data.hero_title || "",
        hero_subtitle: data.hero_subtitle || "",
        footer_company_name: data.footer_company_name || "",
        footer_copyright: data.footer_copyright || "",
        whatsapp_url: data.whatsapp_url || "",
        instagram_url: data.instagram_url || "",
        primary_color: data.primary_color || "#C41E3A",
      });
    }
  }, [data]);

  const handleUploadLogo = async (file: File) => {
    if (!activeTenantId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${activeTenantId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("tenant-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("tenant-assets").getPublicUrl(path);
      setForm((f) => ({ ...f, logo_url: pub.publicUrl }));
      toast.success("Logo carregado");
    } catch (e: any) {
      toast.error("Erro ao carregar logo: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!activeTenantId) return;
    setSaving(true);
    const payload = {
      tenant_id: activeTenantId,
      logo_url: form.logo_url || null,
      hero_title: form.hero_title || null,
      hero_subtitle: form.hero_subtitle || null,
      footer_company_name: form.footer_company_name || null,
      footer_copyright: form.footer_copyright || null,
      whatsapp_url: form.whatsapp_url || null,
      instagram_url: form.instagram_url || null,
      primary_color: form.primary_color || "#C41E3A",
    };
    const { error } = await supabase
      .from("tenant_catalogo_settings" as any)
      .upsert(payload, { onConflict: "tenant_id" });
    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Configurações do catálogo salvas");
    queryClient.invalidateQueries({ queryKey: ["catalog-settings"] });
    queryClient.invalidateQueries({ queryKey: ["catalog-settings-edit"] });
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mx-auto w-full max-w-4xl p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Personalização do Catálogo</h1>
                <p className="text-sm text-muted-foreground">
                  Cada empresa configura sua própria marca no storefront público.
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href="/catalogo" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" /> Ver catálogo
              </a>
            </Button>
          </div>

          {isLoading ? (
            <Card className="p-6 space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-32 w-full" />
            </Card>
          ) : (
            <>
              <Card className="p-6 space-y-4">
                <h2 className="font-semibold">Marca</h2>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-20 rounded-md border bg-black flex items-center justify-center overflow-hidden">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-white text-sm">Sem logo</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadLogo(f);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        PNG/JPG/SVG. Recomendado: fundo transparente, altura mínima 64px.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor primária</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={form.primary_color}
                        onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                        className="w-16 p-1 h-10"
                      />
                      <Input
                        value={form.primary_color}
                        onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h2 className="font-semibold">Hero (topo da página)</h2>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="Nossos Produtos"
                    value={form.hero_title}
                    onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Textarea
                    rows={2}
                    placeholder="Conheça nossos produtos exclusivos"
                    value={form.hero_subtitle}
                    onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
                  />
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h2 className="font-semibold">Rodapé e contato</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da empresa</Label>
                    <Input
                      value={form.footer_company_name}
                      onChange={(e) => setForm({ ...form, footer_company_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto de copyright</Label>
                    <Input
                      placeholder="© 2026 Minha Empresa. Todos os direitos reservados."
                      value={form.footer_copyright}
                      onChange={(e) => setForm({ ...form, footer_copyright: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Link WhatsApp</Label>
                    <Input
                      placeholder="https://wa.me/55..."
                      value={form.whatsapp_url}
                      onChange={(e) => setForm({ ...form, whatsapp_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Link Instagram</Label>
                    <Input
                      placeholder="https://instagram.com/..."
                      value={form.instagram_url}
                      onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {saving ? "Salvando..." : "Salvar configurações"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
