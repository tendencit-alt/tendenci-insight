import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { AppFooter } from "@/components/layout/AppFooter";

function maskCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function cnpjDigitsValid(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return false;
  if (/^(\d)\1+$/.test(c)) return false;
  const calc = (base: string, weights: number[]) => {
    const s = base.split("").reduce((a, d, i) => a + Number(d) * weights[i], 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}

const schema = z.object({
  company_name: z.string().trim().min(2, "Nome muito curto").max(120),
  cnpj: z.string().refine(cnpjDigitsValid, "CNPJ inválido"),
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().email("Email inválido").max(255),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
    .regex(/\d/, "Inclua ao menos um número"),
  confirm: z.string(),
  accepted_terms: z.literal(true, { errorMap: () => ({ message: "Aceite os termos para continuar" }) }),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Senhas não coincidem" });

export default function Cadastro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    cnpj: "",
    full_name: "",
    email: "",
    password: "",
    confirm: "",
    accepted_terms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((er) => {
        if (er.path[0]) errs[er.path[0] as string] = er.message;
      });
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-signup-tenant", {
        body: {
          company_name: parsed.data.company_name,
          cnpj: parsed.data.cnpj.replace(/\D/g, ""),
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          password: parsed.data.password,
          accepted_terms: true,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success("Conta criada! Entrando...");
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signErr) {
        toast.error("Conta criada, mas falhou o login automático. Faça login manualmente.");
        navigate("/autenticacao", { replace: true });
        return;
      }
      navigate("/boas-vindas", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Criar conta — Tendenci Tech</title>
        <meta name="description" content="Crie sua conta gratuita no Tendenci ERP. 14 dias de teste." />
        <link rel="canonical" href="https://www.tendencitech.com.br/cadastro" />
      </Helmet>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Crie sua conta</CardTitle>
            <CardDescription>14 dias grátis. Sem cartão de crédito.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="company_name">Nome da empresa</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  disabled={loading}
                />
                {errors.company_name && <p className="text-xs text-destructive mt-1">{errors.company_name}</p>}
              </div>
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: maskCnpj(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                  disabled={loading}
                />
                {errors.cnpj && <p className="text-xs text-destructive mt-1">{errors.cnpj}</p>}
              </div>
              <div>
                <Label htmlFor="full_name">Seu nome</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  disabled={loading}
                />
                {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={loading}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    disabled={loading}
                  />
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                </div>
                <div>
                  <Label htmlFor="confirm">Confirmar</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    disabled={loading}
                  />
                  {errors.confirm && <p className="text-xs text-destructive mt-1">{errors.confirm}</p>}
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={form.accepted_terms}
                  onCheckedChange={(c) => setForm({ ...form, accepted_terms: !!c })}
                  disabled={loading}
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug">
                  Li e aceito os Termos de Uso e a Política de Privacidade.
                </label>
              </div>
              {errors.accepted_terms && <p className="text-xs text-destructive">{errors.accepted_terms}</p>}

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar conta
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{" "}
                <Link to="/autenticacao" className="text-primary underline">Entrar</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
