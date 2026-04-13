import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Landmark, Check, Loader2, Plus, Trash2 } from "lucide-react";

interface Props {
  onComplete: () => void;
  completed?: boolean;
}

interface BankAccount {
  nickname: string;
  bank_name: string;
  agency: string;
  account_number: string;
  opening_balance: number;
}

const emptyAccount = (): BankAccount => ({
  nickname: "", bank_name: "", agency: "", account_number: "", opening_balance: 0,
});

export function OnboardingStepContaBancaria({ onComplete, completed }: Props) {
  const [accounts, setAccounts] = useState<BankAccount[]>([emptyAccount()]);
  const [saving, setSaving] = useState(false);

  const updateAccount = (i: number, field: keyof BankAccount, value: any) => {
    setAccounts(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };

  const handleSave = async () => {
    const valid = accounts.filter(a => a.nickname.trim());
    if (valid.length === 0) return;
    setSaving(true);
    try {
      const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
      
      for (const acc of valid) {
        await supabase.from("fin_bank_accounts").insert({
          nickname: acc.nickname,
          bank_name: acc.bank_name || null,
          agency: acc.agency || null,
          account_number: acc.account_number || null,
          opening_balance: acc.opening_balance || 0,
          tenant_id: tenantId,
        });
      }
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          Contas Bancárias
          {completed && <Check className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>Cadastre ao menos a conta principal para operar o fluxo de caixa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.map((acc, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Conta {i + 1}</span>
              {accounts.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setAccounts(prev => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Apelido *</Label>
                <Input value={acc.nickname} onChange={e => updateAccount(i, "nickname", e.target.value)} placeholder="Conta Principal" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Banco</Label>
                <Input value={acc.bank_name} onChange={e => updateAccount(i, "bank_name", e.target.value)} placeholder="Banco do Brasil" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Agência</Label>
                <Input value={acc.agency} onChange={e => updateAccount(i, "agency", e.target.value)} placeholder="0001" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Saldo Inicial (R$)</Label>
                <Input type="number" value={acc.opening_balance} onChange={e => updateAccount(i, "opening_balance", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAccounts(prev => [...prev, emptyAccount()])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar conta
          </Button>
        </div>

        <Button onClick={handleSave} disabled={saving || !accounts.some(a => a.nickname.trim())}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Salvar Contas
        </Button>
      </CardContent>
    </Card>
  );
}
