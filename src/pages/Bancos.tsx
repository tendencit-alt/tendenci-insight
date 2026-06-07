import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Conn = {
  id: string;
  bank_name: string;
  bank_logo_url: string | null;
  status: string;
  last_sync_at: string | null;
  account_count: number;
  total_balance: number;
};

export default function Bancos() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [conns, setConns] = useState<Conn[]>([]);

  const fetchConns = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_pluggy_connections_for_user");
    if (error) {
      console.error(error);
      toast({ title: "Erro ao carregar bancos", description: error.message, variant: "destructive" });
    } else {
      setConns((data ?? []) as Conn[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchConns(); }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("pluggy-connect-token");
      if (error) throw error;
      // Rodada 1: placeholder. Rodada 2 abrirá o widget Pluggy com o accessToken.
      toast({
        title: "Token gerado ✅",
        description: "Em construção — widget Pluggy chega na Rodada 2.",
      });
      console.log("[Bancos] connect token:", data);
    } catch (e: any) {
      toast({ title: "Falha ao gerar token", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Bancos</h1>
            <p className="text-muted-foreground">Conecte suas contas bancárias via Open Finance (Pluggy).</p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Plus className="h-7 w-7 text-primary" />
            </div>
            <CardTitle>Conectar banco</CardTitle>
            <CardDescription>
              Autorize o acesso de leitura aos seus extratos para automação de conciliação.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button size="lg" onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Conectar banco
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Bancos conectados</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : conns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum banco conectado ainda.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {conns.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{c.bank_name}</CardTitle>
                    <CardDescription>
                      {c.account_count} conta(s) · Status: {c.status}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.total_balance ?? 0)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
