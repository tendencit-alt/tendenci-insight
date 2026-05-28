import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slug: string;
  productId: string | null;
  productName: string | null;
  primaryColor?: string;
}

// Rate limit simples por sessão para mitigar spam básico.
const RATE_KEY = "public_catalog_last_submit";

export function PublicLeadDialog({
  open,
  onOpenChange,
  slug,
  productId,
  productName,
  primaryColor = "#C41E3A",
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setHp("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp) {
      // Honeypot preenchido — bot. Finge sucesso.
      onOpenChange(false);
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Informe seu nome.");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      toast.error("Informe e-mail ou WhatsApp para contato.");
      return;
    }
    const last = Number(localStorage.getItem(RATE_KEY) || 0);
    if (Date.now() - last < 30_000) {
      toast.error("Aguarde alguns segundos antes de enviar novamente.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_public_catalog_lead", {
        p_slug: slug,
        p_name: name.trim(),
        p_email: email.trim() || null,
        p_phone: phone.trim() || null,
        p_message: message.trim() || null,
        p_product_id: productId,
      });
      if (error) throw error;
      localStorage.setItem(RATE_KEY, String(Date.now()));
      toast.success("Pedido enviado! A empresa entrará em contato em breve.");
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Não foi possível enviar: " + (err.message || "erro desconhecido"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar orçamento</DialogTitle>
          <DialogDescription>
            {productName
              ? `Sobre o produto: ${productName}`
              : "Preencha seus dados e a empresa entrará em contato."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* honeypot */}
          <input
            type="text"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Nome *</Label>
            <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">E-mail</Label>
              <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">WhatsApp</Label>
              <Input id="lead-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} placeholder="(11) 9..." />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">Informe e-mail ou WhatsApp.</p>
          <div className="space-y-1.5">
            <Label htmlFor="lead-msg">Mensagem</Label>
            <Textarea id="lead-msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={4} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} style={{ background: primaryColor, color: "white" }}>
              {submitting ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
