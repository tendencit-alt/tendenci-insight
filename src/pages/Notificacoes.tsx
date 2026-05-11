import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  UserPlus,
  FileText,
  AlertTriangle,
  CheckCheck,
  Search,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type NotifKind = "lead" | "proposta" | "sla";
type NotifSeverity = "normal" | "atencao" | "urgente";

interface NotifItem {
  id: string;
  kind: NotifKind;
  title: string;
  description: string;
  severity: NotifSeverity;
  createdAt: string;
  route: string;
}

const READ_STORAGE_KEY = "notificacoes:read";

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveRead(s: Set<string>) {
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(s)));
}

const KIND_META: Record<NotifKind, { label: string; icon: typeof Bell; color: string }> = {
  lead: { label: "Lead novo", icon: UserPlus, color: "text-sky-500" },
  proposta: { label: "Proposta pendente", icon: FileText, color: "text-amber-500" },
  sla: { label: "Alerta de SLA", icon: AlertTriangle, color: "text-red-500" },
};

const SEVERITY_BADGE: Record<NotifSeverity, string> = {
  normal: "bg-muted text-muted-foreground",
  atencao: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  urgente: "bg-red-500/15 text-red-600 border-red-500/30",
};

export default function Notificacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [read, setRead] = useState<Set<string>>(() => loadRead());
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | NotifKind>("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    saveRead(read);
  }, [read]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notificacoes", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const out: NotifItem[] = [];

      // Leads novos
      const { data: leads } = await supabase
        .from("leads")
        .select("id, name, created_at, status")
        .eq("status", "novo")
        .order("created_at", { ascending: false })
        .limit(50);

      (leads || []).forEach((l: any) => {
        out.push({
          id: `lead:${l.id}`,
          kind: "lead",
          title: l.name || "Novo lead",
          description: "Aguardando triagem comercial",
          severity: "atencao",
          createdAt: l.created_at,
          route: "/leads",
        });
      });

      // Propostas pendentes
      const { data: proposals } = await supabase
        .from("crm_proposals")
        .select("id, title, status, updated_at, created_at")
        .in("status", ["enviada", "negociacao"])
        .order("updated_at", { ascending: false })
        .limit(50);

      (proposals || []).forEach((p: any) => {
        out.push({
          id: `proposta:${p.id}`,
          kind: "proposta",
          title: p.title || "Proposta",
          description: `Status: ${p.status}`,
          severity: "atencao",
          createdAt: p.updated_at || p.created_at,
          route: "/propostas",
        });
      });

      // SLA: pedidos atrasados (due_date no passado e não finalizados)
      const { data: ordersOverdue } = await supabase
        .from("orders")
        .select("id, order_number, client_name, due_date, status")
        .lt("due_date", today)
        .not("status", "in", '("cancelado","concluido","finalizado","entregue")')
        .order("due_date", { ascending: true })
        .limit(50);

      (ordersOverdue || []).forEach((o: any) => {
        out.push({
          id: `sla-order:${o.id}`,
          kind: "sla",
          title: `Pedido ${o.order_number || o.id.slice(0, 8)} atrasado`,
          description: `${o.client_name || "Cliente"} • venceu em ${o.due_date}`,
          severity: "urgente",
          createdAt: o.due_date,
          route: "/pedidos",
        });
      });

      // SLA: OPs em atraso
      const { data: opsOverdue } = await supabase
        .from("production_orders")
        .select("id, op_number, due_date, status")
        .lt("due_date", today)
        .in("status", ["pendente", "em_producao"])
        .order("due_date", { ascending: true })
        .limit(50);

      (opsOverdue || []).forEach((o: any) => {
        out.push({
          id: `sla-op:${o.id}`,
          kind: "sla",
          title: `OP ${o.op_number || o.id.slice(0, 8)} fora do prazo`,
          description: `Vencimento: ${o.due_date}`,
          severity: "urgente",
          createdAt: o.due_date,
          route: "/producao",
        });
      });

      return out.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
  });

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (kindFilter !== "all" && it.kind !== kindFilter) return false;
      const isRead = read.has(it.id);
      if (readFilter === "read" && !isRead) return false;
      if (readFilter === "unread" && isRead) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!it.title.toLowerCase().includes(q) && !it.description.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [items, kindFilter, readFilter, read, search]);

  const unreadCount = useMemo(
    () => items.filter((i) => !read.has(i.id)).length,
    [items, read]
  );

  const toggleRead = (id: string) => {
    setRead((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markAllRead = () => {
    setRead(new Set(items.map((i) => i.id)));
  };

  const counts = useMemo(() => {
    const c = { lead: 0, proposta: 0, sla: 0 } as Record<NotifKind, number>;
    items.forEach((i) => { c[i.kind]++; });
    return c;
  }, [items]);

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-7 w-7 text-primary" />
            Notificações
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} não lidas
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Leads novos, propostas pendentes e alertas de SLA em um só lugar.
          </p>
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
          <CheckCheck className="h-4 w-4 mr-2" />
          Marcar tudo como lido
        </Button>
      </header>

      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar notificação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={readFilter} onValueChange={(v) => setReadFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unread">Não lidas</TabsTrigger>
              <TabsTrigger value="read">Lidas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={kindFilter} onValueChange={(v) => setKindFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Todas ({items.length})</TabsTrigger>
            <TabsTrigger value="lead">Leads ({counts.lead})</TabsTrigger>
            <TabsTrigger value="proposta">Propostas ({counts.proposta})</TabsTrigger>
            <TabsTrigger value="sla">SLA ({counts.sla})</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      <div className="space-y-2">
        {isLoading && (
          <Card className="p-8 text-center text-muted-foreground">Carregando...</Card>
        )}
        {!isLoading && filtered.length === 0 && (
          <Card className="p-12 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma notificação encontrada.</p>
          </Card>
        )}
        {filtered.map((n) => {
          const meta = KIND_META[n.kind];
          const Icon = meta.icon;
          const isRead = read.has(n.id);
          return (
            <Card
              key={n.id}
              className={`p-4 flex items-start gap-4 transition ${
                isRead ? "opacity-60" : "border-l-4 border-l-primary"
              }`}
            >
              <div className={`mt-1 ${meta.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{n.title}</span>
                  <Badge variant="outline" className={SEVERITY_BADGE[n.severity]}>
                    {n.severity}
                  </Badge>
                  <Badge variant="outline">{meta.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {n.createdAt
                    ? formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })
                    : ""}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="ghost" onClick={() => navigate(n.route)}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleRead(n.id)}>
                  {isRead ? "Marcar não lida" : "Marcar lida"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
