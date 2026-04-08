import { useState, useEffect } from 'react';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Upload, Building2, Palette, Phone, Globe } from 'lucide-react';

export function CompanySettingsTab() {
  const { data: settings, isLoading } = useCompanySettings();
  const updateMutation = useUpdateCompanySettings();

  const [form, setForm] = useState({
    company_name: '',
    trade_name: '',
    cnpj: '',
    razao_social: '',
    inscricao_estadual: '',
    logo_url: '' as string | null,
    primary_color: '#D41E1E',
    accent_color: '#E85D3A',
    phone: '',
    email: '',
    address: '',
    website: '',
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || '',
        trade_name: settings.trade_name || '',
        cnpj: settings.cnpj || '',
        razao_social: settings.razao_social || '',
        inscricao_estadual: settings.inscricao_estadual || '',
        logo_url: settings.logo_url,
        primary_color: settings.primary_color || '#D41E1E',
        accent_color: settings.accent_color || '#E85D3A',
        phone: settings.phone || '',
        email: settings.email || '',
        address: settings.address || '',
        website: settings.website || '',
      });
    }
  }, [settings]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(path);

      setForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast.success('Logo enviado com sucesso');
    } catch (err: any) {
      toast.error('Erro ao enviar logo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(form);
      toast.success('Configurações da empresa salvas com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo & Identidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Identidade da Empresa
          </CardTitle>
          <CardDescription>Logo, nome e dados que aparecem em todo o sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Logo da Empresa</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleUploadLogo}
                disabled={uploading}
                className="w-64"
              />
              {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome da Empresa</Label>
              <Input value={form.company_name} onChange={e => updateField('company_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome Fantasia</Label>
              <Input value={form.trade_name} onChange={e => updateField('trade_name', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados Fiscais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados Fiscais
          </CardTitle>
          <CardDescription>CNPJ, razão social e inscrição estadual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={e => updateField('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Razão Social</Label>
              <Input value={form.razao_social} onChange={e => updateField('razao_social', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Inscrição Estadual</Label>
              <Input value={form.inscricao_estadual} onChange={e => updateField('inscricao_estadual', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Cores do Tema
          </CardTitle>
          <CardDescription>Cores primária e destaque aplicadas em todo o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cor Primária</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color} onChange={e => updateField('primary_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={form.primary_color} onChange={e => updateField('primary_color', e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cor de Destaque</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accent_color} onChange={e => updateField('accent_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={form.accent_color} onChange={e => updateField('accent_color', e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => updateField('email', e.target.value)} type="email" />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={e => updateField('address', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.website} onChange={e => updateField('website', e.target.value)} placeholder="https://" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending} size="lg">
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
