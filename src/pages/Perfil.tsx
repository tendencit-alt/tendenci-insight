import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Shield, Download, Trash2, Loader2, FileText, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Perfil() {
  const { user, profile } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("lgpd-export", { body: {} });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tendenci-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exportação concluída", description: "Seus dados foram baixados em formato JSON." });
    } catch (e: any) {
      toast({ title: "Erro ao exportar", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("lgpd-hard-delete", { body: { action: "request" } });
      if (error) throw error;
      toast({
        title: "Solicitação registrada",
        description: "Sua conta será excluída definitivamente em 30 dias. Você será desconectado.",
      });
      setTimeout(async () => { await supabase.auth.signOut(); window.location.href = "/autenticacao"; }, 2000);
    } catch (e: any) {
      toast({ title: "Erro ao solicitar exclusão", description: e?.message || "Tente novamente.", variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações e privacidade.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={profile?.full_name || ""} readOnly />
            </div>
            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input value={user?.email || ""} readOnly />
            </div>
            <div className="grid gap-2">
              <Label>Perfil</Label>
              <div><Badge variant="outline">{profile?.role || "—"}</Badge></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Privacidade & LGPD</CardTitle>
            </div>
            <CardDescription>
              Exerça seus direitos como titular dos dados conforme a Lei Geral de Proteção de Dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Download className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold">Exportar meus dados</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Receba uma cópia em JSON dos dados pessoais associados à sua conta.
                </p>
                <Button onClick={handleExport} disabled={exporting} size="sm">
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Exportar meus dados
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3 p-4 border border-destructive/40 rounded-lg bg-destructive/5">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Excluir minha conta</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Sua conta será desativada imediatamente e excluída definitivamente em <strong>30 dias</strong>.
                  Durante esse período, você pode entrar em contato com nosso suporte para reverter.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir minha conta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão definitiva</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação é <strong>irreversível</strong> após 30 dias. Digite <strong>EXCLUIR</strong> para confirmar.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                      placeholder="Digite EXCLUIR"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setConfirmText("")}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={confirmText !== "EXCLUIR" || deleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Confirmar exclusão
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <Separator />

            <div className="flex gap-4 text-sm">
              <Link to="/privacidade" className="inline-flex items-center gap-1 text-primary hover:underline">
                <FileText className="h-4 w-4" /> Política de Privacidade
              </Link>
              <Link to="/termos" className="inline-flex items-center gap-1 text-primary hover:underline">
                <FileText className="h-4 w-4" /> Termos de Uso
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
